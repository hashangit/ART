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
Tool Calls: [List any tool calls required in JSON format: [{"callId": "call_1", "toolName": "tool_name", "arguments": {"arg1": "value1"}}]] If no tools are needed, respond with [].`;

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

  async createPlanningPrompt( // Make async
    query: string,
    history: ConversationMessage[],
    systemPrompt: string | undefined, // Correct order and type
    availableTools: ToolSchema[],     // Correct order
    _threadContext: ThreadContext     // Add threadContext (prefixed with _ for unused)
  ): Promise<FormattedPrompt> {       // Return Promise
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
        : 'No tools available.';

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

  async createSynthesisPrompt( // Make async
    query: string,
    intent: string | undefined,       // Correct order and type
    plan: string | undefined,         // Correct order and type
    toolResults: ToolResult[],        // Correct order
    history: ConversationMessage[],   // Correct order
    systemPrompt: string | undefined, // Correct type
    _threadContext: ThreadContext     // Add threadContext (prefixed with _ for unused)
  ): Promise<FormattedPrompt> {       // Return Promise
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