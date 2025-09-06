// src/systems/tool/ToolSystem.ts
import { ToolSystem as IToolSystem, ToolRegistry, StateManager, IToolExecutor, ObservationManager } from '@/core/interfaces'; // Added ObservationManager
import { ParsedToolCall, ToolResult, ExecutionContext, ObservationType } from '@/types'; // Added ObservationType
import { validateJsonSchema } from '@/utils/validation';
import { Logger } from '@/utils/logger';
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import

/**
 * Implements the `ToolSystem` interface, responsible for orchestrating the execution
 * of tool calls requested by the agent's plan. It handles verification, validation,
 * execution via registered executors, and observation recording.
 */
export class ToolSystem implements IToolSystem {
  private toolRegistry: ToolRegistry;
  private stateManager: StateManager;
  private observationManager: ObservationManager; // Add when implementing observations

  /**
   * Creates an instance of the ToolSystem.
   * @param toolRegistry - The registry used to look up tool executors.
   * @param stateManager - The manager used to check if tools are enabled for a thread.
   * @param observationManager - The manager used to record TOOL_EXECUTION observations.
   * @throws {Error} If any of the required dependencies are missing.
   */
  constructor(
    toolRegistry: ToolRegistry,
    stateManager: StateManager,
    observationManager: ObservationManager
  ) {
    if (!toolRegistry) throw new Error('ToolSystem constructor requires a ToolRegistry instance.');
    if (!stateManager) throw new Error('ToolSystem constructor requires a StateManager instance.');
    if (!observationManager) throw new Error('ToolSystem constructor requires an ObservationManager instance.');

    this.toolRegistry = toolRegistry;
    this.stateManager = stateManager;
    this.observationManager = observationManager;
    Logger.info('ToolSystem initialized.');
  }

  /**
   /**
    * Executes a sequence of planned tool calls, handling verification, validation,
    * execution, and observation recording for each call.
    * Calls are typically executed sequentially in the order they appear in the `toolCalls` array.
    * @param toolCalls - An array of `ParsedToolCall` objects generated during the planning phase.
    * @param threadId - The ID of the current thread, used for context and checking tool permissions via `StateManager`.
    * @param traceId - Optional trace ID for correlating observations.
    * @returns A promise resolving to an array of `ToolResult` objects, one for each attempted tool call.
    *          Each `ToolResult` indicates the success or failure of the individual call.
    *          This method itself generally does not throw errors for individual tool failures, but logs them and includes them in the results. It might throw if a critical internal error occurs.
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