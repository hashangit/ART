// src/systems/reasoning/OutputParser.ts
import * as z from 'zod'; // Import Zod
import { OutputParser as IOutputParser } from '../../core/interfaces';
import { ParsedToolCall } from '../../types';
import { Logger } from '../../utils/logger'; // Import the Logger class

// Define Zod schema for a single tool call
const parsedToolCallSchema = z.object({
  callId: z.string().min(1), // Ensure callId is a non-empty string
  toolName: z.string().min(1), // Ensure toolName is a non-empty string
  arguments: z.unknown(), // Arguments must exist but can be any type; specific tools validate further
});

// Define Zod schema for an array of tool calls
const toolCallsSchema = z.array(parsedToolCallSchema);

export class OutputParser implements IOutputParser {
  /**
   * Parses the output of the planning LLM call.
   * Expects format like:
   * Intent: [intent description]
   * Plan: [plan steps]
   * Tool Calls: [JSON array of tool calls]
   * @param output Raw LLM output string.
   * @returns Structured planning data.
   */
  async parsePlanningOutput(output: string): Promise<{
    intent?: string;
    plan?: string;
    toolCalls?: ParsedToolCall[];
  }> {
    const result: {
      intent?: string;
      plan?: string;
      toolCalls?: ParsedToolCall[];
    } = {};

    // Robustly extract sections, handling potential variations in spacing/newlines
    const intentMatch = output.match(/Intent:\s*([\s\S]*?)(Plan:|Tool Calls:|$)/i);
    result.intent = intentMatch?.[1]?.trim();

    const planMatch = output.match(/Plan:\s*([\s\S]*?)(Tool Calls:|$)/i);
    result.plan = planMatch?.[1]?.trim();

    const toolCallsMatch = output.match(/Tool Calls:\s*([\s\S]*?)$/i);
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

     // Handle cases where sections might be missing entirely
     if (!result.intent && !result.plan && !result.toolCalls) { // Fix logical AND operator
        Logger.warn(`OutputParser: Could not parse any structured data (Intent, Plan, Tool Calls) from planning output: ${output}`); // Use static method
        // Consider returning the raw output as plan or intent if no structure found?
        // For now, return potentially empty fields.
     }


    return result;
  }

  /**
   * Parses the output of the synthesis LLM call.
   * For v1.0, assumes the entire output is the final response content.
   * @param output Raw LLM output string.
   * @returns The final synthesized response content.
   */
  async parseSynthesisOutput(output: string): Promise<string> {
    // Basic implementation: return the trimmed output.
    // Future versions might parse more complex structures if needed.
    return output.trim();
  }
}