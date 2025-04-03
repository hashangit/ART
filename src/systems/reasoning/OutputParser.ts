// src/systems/reasoning/OutputParser.ts
import { OutputParser as IOutputParser } from '../../core/interfaces';
import { ParsedToolCall } from '../../types';
import { Logger } from '../../utils/logger'; // Import the Logger class

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

    if (toolCallsString) {
      try {
        // Attempt to parse the JSON array
        const parsedCalls = JSON.parse(toolCallsString);
        // Basic validation: check if it's an array
        if (Array.isArray(parsedCalls)) {
          // Further validation could be added here (e.g., check structure of each call)
          result.toolCalls = parsedCalls as ParsedToolCall[];
        } else {
           Logger.warn(`OutputParser: Tool Calls section was not a valid JSON array. Content: ${toolCallsString}`); // Use static method
           result.toolCalls = []; // Default to empty array if parsing fails or isn't an array
        }
      } catch (error) {
        Logger.error(`OutputParser: Failed to parse Tool Calls JSON. Error: ${error}. Content: ${toolCallsString}`); // Use static method
        // Decide how to handle parsing errors. Return empty array? Throw?
        result.toolCalls = []; // Default to empty array on error
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