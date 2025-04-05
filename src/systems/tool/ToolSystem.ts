// src/systems/tool/ToolSystem.ts
import { ToolSystem as IToolSystem, ToolRegistry, StateManager, IToolExecutor, ObservationManager } from '../../core/interfaces'; // Added ObservationManager
import { ParsedToolCall, ToolResult, ExecutionContext, ObservationType } from '../../types'; // Added ObservationType
import { validateJsonSchema } from '../../utils/validation';
import { Logger } from '../../utils/logger';
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import

export class ToolSystem implements IToolSystem {
  private toolRegistry: ToolRegistry;
  private stateManager: StateManager;
  private observationManager: ObservationManager; // Add when implementing observations

  constructor(
    toolRegistry: ToolRegistry,
    stateManager: StateManager,
    observationManager: ObservationManager // Add when implementing observations
  ) {
    if (!toolRegistry) throw new Error('ToolSystem requires a ToolRegistry.');
    if (!stateManager) throw new Error('ToolSystem requires a StateManager.');
    if (!observationManager) throw new Error('ToolSystem requires an ObservationManager.');

    this.toolRegistry = toolRegistry;
    this.stateManager = stateManager;
    this.observationManager = observationManager;
    Logger.info('ToolSystem initialized.');
  }

  /**
   * Executes a list of parsed tool calls sequentially.
   * @param toolCalls Array of tool calls requested by the LLM.
   * @param threadId The current thread ID for context and permissions.
   * @param traceId Optional trace ID for correlation.
   * @returns A promise resolving to an array of tool results.
   */
  async executeTools(
    toolCalls: ParsedToolCall[],
    threadId: string,
    traceId?: string
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    Logger.debug(`ToolSystem executing ${toolCalls.length} tool calls for thread ${threadId}`, { traceId });

    for (const call of toolCalls) {
      let result: ToolResult | null = null;
      let executor: IToolExecutor | undefined;
      const toolName = call.toolName;
      const callId = call.callId; // Use the ID from the planning output

      try {
        // 1. Check if tool is enabled for the thread
        const isEnabled = await this.stateManager.isToolEnabled(threadId, toolName);
        if (!isEnabled) {
          throw new Error(`Tool "${toolName}" is not enabled for thread "${threadId}".`);
        }

        // 2. Get the tool executor
        executor = await this.toolRegistry.getToolExecutor(toolName);
        if (!executor) {
          throw new Error(`Tool "${toolName}" not found in registry.`);
        }

        // 3. Validate arguments against the tool's schema
        const validationResult = validateJsonSchema(executor.schema.inputSchema, call.arguments);
        if (!validationResult.isValid) {
          const errorMessages = validationResult.errors?.map(e => `${e.instancePath || 'input'} ${e.message}`).join(', ') || 'Unknown validation error';
          throw new Error(`Invalid arguments for tool "${toolName}": ${errorMessages}`);
        }

        // 4. Execute the tool
        Logger.debug(`Executing tool "${toolName}" with callId "${callId}"`, { args: call.arguments, threadId, traceId });
        const executionContext: ExecutionContext = { threadId, traceId }; // Add userId if available/needed
        // TODO: Implement basic timeout mechanism
        const executionResult = await executor.execute(call.arguments, executionContext);

        // Ensure the result has the correct callId and toolName (executor might not set it)
        result = {
            ...executionResult,
            callId: callId,
            toolName: toolName,
        };
        Logger.debug(`Tool "${toolName}" execution successful`, { callId, result: result.output, threadId, traceId });

      } catch (error: any) {
        Logger.error(`Tool "${toolName}" execution failed for callId "${callId}": ${error.message}`, { error, threadId, traceId });
        result = {
          callId: callId,
          toolName: toolName,
          status: 'error',
          error: error.message || 'Unknown execution error',
        };
      }

      // Record TOOL_EXECUTION observation
      if (result) { // Ensure result is not null before recording
        this.observationManager.record({
          threadId: threadId,
          traceId: traceId,
          type: ObservationType.TOOL_EXECUTION,
          content: result, // The ToolResult object itself
          metadata: { timestamp: Date.now(), callId: call.callId } // Include callId for correlation
        }).catch(err => Logger.error(`Failed to record TOOL_EXECUTION observation for callId ${call.callId}:`, err));

        results.push(result);
      } else {
        // This case should ideally not happen if the try/catch always assigns to result
        Logger.error(`ToolSystem finished processing call ${call.callId} but result object was null.`);
      }
    }

    return results;
  }
}