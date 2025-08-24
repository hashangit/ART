// src/systems/reasoning/OutputParser.ts
import * as z from 'zod'; // Import Zod
import { OutputParser as IOutputParser } from '../../core/interfaces';
import { ParsedToolCall } from '../../types';
import { Logger } from '../../utils/logger'; // Import the Logger class
import { XmlMatcher } from '../../utils/xml-matcher'; // Import XmlMatcher

// Define Zod schema for a single tool call
const parsedToolCallSchema = z.object({
  callId: z.string().min(1), // Ensure callId is a non-empty string
  toolName: z.string().min(1), // Ensure toolName is a non-empty string
  arguments: z.unknown(), // Arguments must exist but can be any type; specific tools validate further
});

// Define Zod schema for an array of tool calls
const toolCallsSchema = z.array(parsedToolCallSchema);

/**
 * Default implementation of the `OutputParser` interface.
 * - Planning: Extracts Intent, Plan, and Tool Calls from the LLM output while ignoring any
 *   custom formatting constraints that apps may add. Tool Calls MUST be a JSON array where each
 *   item conforms to { callId: string, toolName: string, arguments: object }. If Tool Calls
 *   appears but contains no items, returns []. If the section is absent, leaves `toolCalls` undefined.
 * - Synthesis: Returns the final response text (trimmed).
 *
 * This enforces the framework-level Output Contract and keeps the structure provider-agnostic
 * and tool-type-agnostic (native and MCP tools share the same interface).
 *
 * @implements {IOutputParser}
 */
export class OutputParser implements IOutputParser {
  /**
   * Parses the raw string output from the planning LLM call to extract structured information.
   *
   * This method performs the following steps:
   * 1. Uses `XmlMatcher` to identify and extract content within `<think>...</think>` tags.
   *    This extracted content is aggregated into the `thoughts` field of the result.
   * 2. The remaining content (outside of `<think>` tags) is then parsed for sections
   *    explicitly marked with "Intent:", "Plan:", and "Tool Calls:".
   * 3. It attempts to find and parse a JSON array within the "Tool Calls:" section, handling
   *    potential markdown fences (e.g., \`\`\`json ... \`\`\`) and validating the structure using Zod.
   *
   * @param output - The raw string response from the planning LLM call, which may include
   *                 text, `<think>` tags, and sections for Intent, Plan, and Tool Calls.
   * @returns A promise resolving to an object containing:
   *          - `thoughts?`: An optional string aggregating content from all `<think>` tags, separated by "\\n\\n---\\n\\n".
   *          - `intent?`: An optional string for the parsed intent.
   *          - `plan?`: An optional string for the parsed plan.
   *          - `toolCalls?`: An optional array of `ParsedToolCall` objects. This will be an empty array `[]`
   *                        if the "Tool Calls:" section is present in the non-thinking content but is empty,
   *                        or if the JSON is invalid/fails validation. It remains `undefined` if the
   *                        "Tool Calls:" section itself is missing from the non-thinking content.
   *          Fields will be `undefined` if the corresponding section is not found or cannot be parsed correctly.
   */
  async parsePlanningOutput(output: string): Promise<{
    intent?: string;
    plan?: string;
    toolCalls?: ParsedToolCall[];
    thoughts?: string; // Add thoughts to the return type
  }> {
   const result: {
     intent?: string;
     plan?: string;
     toolCalls?: ParsedToolCall[];
     thoughts?: string;
   } = {};

   let processedOutput = output;
   const thoughtsList: string[] = [];

   // Use XmlMatcher to extract <think> tags first
   // The XmlMatcher will process the entire `output` string.
   // We assume `output` is the full aggregated string from the LLM's planning phase.
   const xmlMatcher = new XmlMatcher('think');
   const chunks = xmlMatcher.final(output); // Process the whole string at once

   let nonThinkingContent = "";
   chunks.forEach(chunk => {
     if (chunk.matched) {
       thoughtsList.push(chunk.data.trim());
     } else {
       nonThinkingContent += chunk.data;
     }
   });

   if (thoughtsList.length > 0) {
     result.thoughts = thoughtsList.join("\n\n---\n\n"); // Join multiple thoughts
   }

   // Now parse Intent, Plan, Tool Calls from the non-thinking content
   processedOutput = nonThinkingContent;

   // Robustly extract sections from the processedOutput (non-thinking part)
   const intentMatch = processedOutput.match(/Intent:\s*([\s\S]*?)(Plan:|Tool Calls:|$)/i);
   result.intent = intentMatch?.[1]?.trim();

   const planMatch = processedOutput.match(/Plan:\s*([\s\S]*?)(Tool Calls:|$)/i);
   result.plan = planMatch?.[1]?.trim();

   const toolCallsMatch = processedOutput.match(/Tool Calls:\s*([\s\S]*?)$/i);
   const toolCallsString = toolCallsMatch?.[1]?.trim();

    // Initialize toolCalls to indicate no valid calls found yet
    result.toolCalls = undefined;

    if (toolCallsString) {
      let jsonArrayString: string | null = null;
      let parsedJson: any = null;

      // 1. Find JSON Array: Look for ```json[...]``` or ```[...]``` or [...]
      // Regex explanation:
      // - ```(?:json)?\s* : Optional markdown fence start (```json or ```)
      // - (\[[\s\S]*?\])  : Capture group 1: The JSON array content (non-greedy)
      // - \s*```          : Optional markdown fence end
      // - |               : OR
      // - (\[[\s\S]*?\])  : Capture group 2: A standalone JSON array (non-greedy)
      const jsonRegex = /```(?:json)?\s*(\[[\s\S]*?\])\s*```|(\[[\s\S]*?\])/;
      const jsonMatch = toolCallsString.match(jsonRegex);

      if (jsonMatch) {
        // Prioritize fenced match (group 1), fallback to standalone match (group 2)
        jsonArrayString = jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[2] ? jsonMatch[2].trim() : null;
      } else {
         Logger.debug(`OutputParser: No JSON array found in Tool Calls section. Content: ${toolCallsString}`);
      }


      // 2. Parse JSON (if found)
      if (jsonArrayString) {
        try {
          // Attempt to remove trailing comma just before the closing bracket
          const cleanedJsonString = jsonArrayString.replace(/,\s*(?=]$)/, '');
          parsedJson = JSON.parse(cleanedJsonString);
        } catch (error) {
          Logger.error(`OutputParser: Failed to parse extracted JSON array. Error: ${error}. Extracted Content: ${jsonArrayString}. Original Content: ${toolCallsString}`);
          // Keep parsedJson as null, will default to empty array later
        }
      }

      // 3. Validate with Zod (if parsed)
      if (parsedJson !== null) {
        const validationResult = toolCallsSchema.safeParse(parsedJson);
        if (validationResult.success) {
          // Explicitly cast validated data to ParsedToolCall[] to resolve TS inference issue
          result.toolCalls = validationResult.data as ParsedToolCall[];
        } else {
          Logger.warn(`OutputParser: Tool Calls JSON structure validation failed. Errors: ${validationResult.error.toString()}. Parsed Content: ${JSON.stringify(parsedJson)}`);
          result.toolCalls = []; // Default to empty array on validation failure
        }
      } else {
        // JSON parsing failed or no JSON array found
        // If toolCallsString existed but we couldn't parse/validate, default to empty array
        result.toolCalls = [];
      }
    } else {
        // If the "Tool Calls:" section exists but is empty or just whitespace after it
        if (toolCallsMatch) {
             result.toolCalls = [];
        }
        // If the "Tool Calls:" section doesn't exist at all, toolCalls remains undefined
    }

    // Fallback extraction: recover tool calls embedded in other sections or wrappers
    if (result.toolCalls === undefined || (Array.isArray(result.toolCalls) && result.toolCalls.length === 0)) {
      const tryParseArray = (raw: string): any | null => {
        if (!raw) return null;
        let s = raw.trim();
        // Strip code fences if present
        s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        // Strip json(...) wrapper
        const jsonArrayWrapper = /^json\(\s*([\s\S]*)\s*\)$/i;
        const wrapperMatch = s.match(jsonArrayWrapper);
        if (wrapperMatch) {
          s = wrapperMatch[1].trim();
        }
        // If single object, coerce into array
        const looksLikeObject = /^\{[\s\S]*\}$/.test(s);
        if (looksLikeObject) {
          s = `[${s}]`;
        }
        try {
          s = s.replace(/,\s*(?=]$)/, '');
          return JSON.parse(s);
        } catch {
          return null;
        }
      };

      let parsedJson: any = null;
      // 1) json([...]) anywhere
      const jsonArrayWrapperAnywhere = /json\(\s*(\[[\s\S]*?\])\s*\)/i;
      const w1 = processedOutput.match(jsonArrayWrapperAnywhere);
      if (w1 && w1[1]) {
        parsedJson = tryParseArray(w1[1]);
      }
      // 2) Any array containing toolName or callId
      if (parsedJson === null) {
        const anyArrayWithToolKeys = /(\[[\s\S]*?("toolName"|"callId")[\s\S]*?\])/i;
        const w2 = processedOutput.match(anyArrayWithToolKeys);
        if (w2 && w2[1]) {
          parsedJson = tryParseArray(w2[1]);
        }
      }
      // 3) json({ ... }) or a lone object with tool keys → coerce to array
      if (parsedJson === null) {
        const jsonObjectWrapper = /json\(\s*(\{[\s\S]*?("toolName"|"callId")[\s\S]*?\})\s*\)/i;
        const w3 = processedOutput.match(jsonObjectWrapper);
        if (w3 && w3[1]) {
          parsedJson = tryParseArray(w3[1]);
        } else {
          const loneObject = /(\{[\s\S]*?("toolName"|"callId")[\s\S]*?\})/i;
          const w4 = processedOutput.match(loneObject);
          if (w4 && w4[1]) {
            parsedJson = tryParseArray(w4[1]);
          }
        }
      }

      if (parsedJson !== null) {
        const validationResult = toolCallsSchema.safeParse(parsedJson);
        if (validationResult.success) {
          result.toolCalls = validationResult.data as ParsedToolCall[];
          Logger.debug(`OutputParser: Parsed Tool Calls via fallback extraction.`);
        } else {
          Logger.warn(`OutputParser: Fallback Tool Calls validation failed. Errors: ${validationResult.error.toString()}`);
          result.toolCalls = [];
        }
      }
    }

     // Handle cases where sections might be missing entirely from the non-thinking content
     if (!result.intent && !result.plan && (result.toolCalls === undefined || result.toolCalls.length === 0) && !result.thoughts) {
        Logger.warn(`OutputParser: Could not parse any structured data (Intent, Plan, Tool Calls, Thoughts) from planning output. Original output: ${output}`);
        // If nothing structured is found, but there were thoughts, that's still a partial parse.
        // If no thoughts AND no other structure, then it's a more complete failure to parse structure.
        // If the original output was just thoughts, result.thoughts would be populated.
        // If original output had thoughts and other text that wasn't parsable, result.thoughts would be populated.
        // This warning triggers if even thoughts couldn't be extracted AND other sections are also missing.
        // If only thoughts were present, result.thoughts would exist, and this condition might not be met.
        // Let's refine the condition: if no standard sections (intent, plan, toolCalls) are found in `processedOutput`
        if (!result.intent && !result.plan && (result.toolCalls === undefined || result.toolCalls.length === 0)) {
           Logger.debug(`OutputParser: No Intent, Plan, or Tool Calls found in non-thinking content part: ${processedOutput}`);
        }
     } else if (!result.intent && !result.plan && !result.toolCalls && !result.thoughts) {
        // This case means absolutely nothing was parsed, not even thoughts.
        Logger.warn(`OutputParser: Complete failure to parse any structured data or thoughts from planning output: ${output}`);
     }


    return result;
  }

  /**
   /**
    * Parses the raw string output from the synthesis LLM call to extract the final, user-facing response content.
    * This default implementation simply trims whitespace from the input string.
    * More complex implementations could potentially remove specific tags or formatting if needed.
    * @param output - The raw string response from the synthesis LLM call.
    * @returns A promise resolving to the cleaned, final response string.
    */
  async parseSynthesisOutput(output: string): Promise<string> {
    // Basic implementation: return the trimmed output.
    // Future versions might parse more complex structures if needed.
    return output.trim();
  }
}