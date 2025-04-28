// src/systems/reasoning/PromptManager.ts
import {
  ConversationMessage,
  FormattedPrompt,
  MessageRole,
  // ParsedToolCall, // Removed unused import
  ThreadContext, // Added import
  ToolResult,
  ToolSchema,
} from '../../types'; // Assuming types are exported from src/types/index.ts
import { PromptManager as PromptManagerInterface } from '../../core/interfaces'; // Use interface name

// Basic templating function (can be replaced with a more robust library later)
function simpleTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * Default implementation of the `PromptManager` interface.
 * Responsible for constructing prompts for the planning and synthesis phases
 * using basic string templating.
 *
 * @implements {PromptManagerInterface}
 */
export class PromptManager implements PromptManagerInterface {
  // Default prompts - these should likely be configurable via ThreadConfig
  private defaultSystemPrompt =
    'You are a helpful AI assistant. Respond concisely and accurately.';
  private defaultPlanningPromptTemplate = `System Prompt:
{{systemPrompt}}

Conversation History:
{{history}}

User Query:
{{query}}

Available Tools:
{{tools}}

Based on the user query and conversation history, identify the user's intent and create a plan to fulfill it using the available tools if necessary.
Respond in the following format:
Intent: [Briefly describe the user's goal]
Plan: [Provide a step-by-step plan. If tools are needed, list them clearly.]
Tool Calls: [Output *only* the JSON array of tool calls required: [{"callId": "call_1", "toolName": "tool_name", "arguments": {"arg1": "value1"}}] or [] if no tools are needed. Do not add any other text in this section.]`;

  private defaultSynthesisPromptTemplate = `System Prompt:
{{systemPrompt}}

Conversation History:
{{history}}

User Query:
{{query}}

Original Intent:
{{intent}}

Execution Plan:
{{plan}}

Tool Execution Results:
{{toolResults}}

Based on the user query, the plan, and the results of any tool executions, synthesize a final response to the user.
If the tools failed or provided unexpected results, explain the issue and try to answer based on available information or ask for clarification.`;

  /**
   * Creates the prompt for the planning phase using a default template.
   * It incorporates the system prompt, conversation history, user query, and available tool schemas.
   * @param query - The user's original query.
   * @param history - Recent conversation history.
   * @param systemPrompt - The system prompt string (uses default if undefined).
   * @param availableTools - Schemas of tools available for use.
   * @param _threadContext - The current thread context (currently unused in this basic implementation but available for future enhancements like template selection).
   * @returns A promise resolving to the formatted planning prompt string.
   */
  async createPlanningPrompt(
    query: string,
    history: ConversationMessage[],
    systemPrompt: string | undefined,
    availableTools: ToolSchema[],
    _threadContext: ThreadContext // Keep param even if unused for interface compliance
  ): Promise<FormattedPrompt> {
    const historyString = history
      .map(
        (msg) =>
          `${msg.role === MessageRole.USER ? 'User' : 'AI'}: ${msg.content}`,
      )
      .join('\n');

    const toolsString =
      availableTools.length > 0
        ? availableTools
            .map(
              (tool) =>
                `- ${tool.name}: ${
                  tool.description
                }\n  Input Schema: ${JSON.stringify(tool.inputSchema)}`,
            )
            .join('\n')
        : 'Inform the user that no tools are enabled for this request. '; // Adjusted message

    const promptData = {
      systemPrompt: systemPrompt || this.defaultSystemPrompt,
      history: historyString || 'No history yet.',
      query: query,
      tools: toolsString,
    };

    // For v1.0, we'll return a simple string. Adapters might format this further.
    // TODO: Potentially use _threadContext.config.systemPrompt if available
    return Promise.resolve(simpleTemplate(this.defaultPlanningPromptTemplate, promptData));
  }

  /**
   * Creates the prompt for the synthesis phase using a default template.
   * It incorporates the system prompt, history, original query, planning results (intent, plan), and tool execution results.
   * @param query - The user's original query.
   * @param intent - The intent extracted during planning.
   * @param plan - The plan generated during planning.
   * @param toolResults - Results from executed tools.
   * @param history - Recent conversation history.
   * @param systemPrompt - The system prompt string (uses default if undefined).
   * @param _threadContext - The current thread context (currently unused but available).
   * @returns A promise resolving to the formatted synthesis prompt string.
   */
  async createSynthesisPrompt(
    query: string,
    intent: string | undefined,
    plan: string | undefined,
    toolResults: ToolResult[],
    history: ConversationMessage[],
    systemPrompt: string | undefined,
    _threadContext: ThreadContext // Keep param even if unused
  ): Promise<FormattedPrompt> {
    const historyString = history
      .map(
        (msg) =>
          `${msg.role === MessageRole.USER ? 'User' : 'AI'}: ${msg.content}`,
      )
      .join('\n');

    const toolResultsString =
      toolResults.length > 0
        ? toolResults
            .map((result) => {
              const output =
                result.status === 'success'
                  ? `Output: ${JSON.stringify(result.output)}`
                  : `Error: ${result.error}`;
              return `- Tool: ${result.toolName} (Call ID: ${result.callId})\n  Status: ${result.status}\n  ${output}`;
            })
            .join('\n')
        : 'No tools were executed.';

    const promptData = {
      systemPrompt: systemPrompt || this.defaultSystemPrompt,
      history: historyString || 'No history yet.',
      query: query,
      intent: intent,
      plan: plan,
      toolResults: toolResultsString,
    };

    // For v1.0, we'll return a simple string. Adapters might format this further.
    // TODO: Potentially use _threadContext.config.systemPrompt if available
    return Promise.resolve(simpleTemplate(this.defaultSynthesisPromptTemplate, promptData)); // Wrap in Promise
  }
}