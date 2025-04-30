// src/core/agents/pes-agent.ts
import {
    IAgentCore,
    StateManager,
    ConversationManager,
    ToolRegistry,
    PromptManager,
    ReasoningEngine,
    OutputParser,
    ObservationManager,
    ToolSystem,
    UISystem // Added UISystem import
    // Assuming repository interfaces might be needed indirectly or for type safety, though not directly used
} from '../interfaces';
import {
    AgentProps,
    AgentFinalResponse,
    ConversationMessage,
    ParsedToolCall,
    ToolResult,
    ObservationType,
    ExecutionMetadata,
    MessageRole, // Keep for mapping history roles initially
    CallOptions,
    ModelCapability,
    LLMMetadata,
    ArtStandardPrompt, // Import new types
    ArtStandardMessageRole,
    PromptContext,
    // ToolSchema, // Removed unused import
    // ThreadContext, // Removed unused import
} from '../../types';
import { generateUUID } from '../../utils/uuid';
import { ARTError, ErrorCode } from '../../errors';
import { Logger } from '../../utils/logger'; // Added Logger import

/**
 * Defines the dependencies required by the PESAgent constructor.
 * These are typically provided by the AgentFactory during instantiation.
 */
interface PESAgentDependencies {
    /** Manages thread configuration and state. */
    stateManager: StateManager;
    /** Manages conversation history. */
    conversationManager: ConversationManager;
    /** Registry for available tools. */
    toolRegistry: ToolRegistry;
    /** Constructs prompts for LLM calls. */
    promptManager: PromptManager;
    /** Handles interaction with the LLM provider. */
    reasoningEngine: ReasoningEngine;
    /** Parses LLM responses. */
    outputParser: OutputParser;
    /** Records agent execution observations. */
    observationManager: ObservationManager;
    /** Orchestrates tool execution. */
    toolSystem: ToolSystem;
    /** Provides access to UI communication sockets. */
    uiSystem: UISystem; // Added UISystem dependency
}

// --- Default PES Blueprints (Mustache Templates targeting ArtStandardPrompt JSON structure) ---

const DEFAULT_PES_SYSTEM_PROMPT = `You are a helpful AI assistant. You need to understand a user's query, potentially use tools to gather information, and then synthesize a final response.`;

// Note: Blueprints render to a JSON string representing ArtStandardPrompt.
// Use {{{ }}} for variables that have been pre-escaped for JSON string embedding
// (like description, inputSchemaJson) to insert them raw.
const DEFAULT_PLANNING_BLUEPRINT = `[
  {
    "role": "system",
    "content": "{{systemPrompt}}"
  },
  {{#history}}
  {
    "role": "{{role}}",
    "content": "{{content}}"
  }{{^last}},{{/last}}
  {{/history}}
  {{#history.length}},{{/history.length}}
  {
    "role": "user",
    "content": "User Query: {{query}}\\n\\nAvailable Tools:\\n{{#availableTools}}- {{name}}: {{{description}}}\\n  Input Schema: {{{inputSchemaJson}}}{{/availableTools}}{{^availableTools}}No tools available.{{/availableTools}}\\n\\nBased on the user query and conversation history, identify the user's intent and create a plan to fulfill it using the available tools if necessary.\\nRespond in the following format:\\nIntent: [Briefly describe the user's goal]\\nPlan: [Provide a step-by-step plan. If tools are needed, list them clearly.]\\nTool Calls: [Output *only* the JSON array of tool calls required by the assistant, matching the ArtStandardMessage tool_calls format: [{\\"id\\": \\"call_abc123\\", \\"type\\": \\"function\\", \\"function\\": {\\"name\\": \\"tool_name\\", \\"arguments\\": \\"{\\\\\\"arg1\\\\\\": \\\\\\"value1\\\\\\"}\\"}}] or [] if no tools are needed. Do not add any other text in this section.]"
  }
]`;

// Use {{{ }}} for pre-escaped outputJson and error strings.
const DEFAULT_SYNTHESIS_BLUEPRINT = `[
  {
    "role": "system",
    "content": "{{systemPrompt}}"
  },
  {{#history}}
  {
    "role": "{{role}}",
    "content": "{{content}}"
  }{{^last}},{{/last}}
  {{/history}}
  {{#history.length}},{{/history.length}}
  {
    "role": "user",
    "content": "User Query: {{query}}\\n\\nOriginal Intent: {{intent}}\\nExecution Plan: {{plan}}\\n\\nTool Execution Results:\\n{{#toolResults}}- Tool: {{toolName}} (Call ID: {{callId}})\\n  Status: {{status}}\\n  {{#output}}Output: {{{outputJson}}}{{/output}}\\n  {{#error}}Error: {{{error}}}{{/error}}\\n{{/toolResults}}{{^toolResults}}No tools were executed.{{/toolResults}}\\n\\nBased on the user query, the plan, and the results of any tool executions, synthesize a final response to the user.\\nIf the tools failed or provided unexpected results, explain the issue and try to answer based on available information or ask for clarification."
  }
]`;


/**
 * Implements the Plan-Execute-Synthesize (PES) agent orchestration logic.
 * This agent follows a structured approach:
 * 1. **Plan:** Understand the user query, determine intent, and create a plan (potentially involving tool calls).
 * 2. **Execute:** Run any necessary tools identified in the planning phase.
 * 3. **Synthesize:** Generate a final response based on the query, plan, and tool results.
 *
 * It utilizes a stateless `PromptManager` with Mustache blueprints to construct standardized prompts (`ArtStandardPrompt`)
 * for the `ReasoningEngine`. It processes the `StreamEvent` output from the reasoning engine for both planning and synthesis.
 *
 * @implements {IAgentCore}
 * @see {PromptManager}
 * @see {ReasoningEngine}
 * @see {ArtStandardPrompt}
 * @see {StreamEvent}
 */
export class PESAgent implements IAgentCore {
    private readonly deps: PESAgentDependencies;
    private readonly defaultSystemPrompt: string = DEFAULT_PES_SYSTEM_PROMPT;
    private readonly planningBlueprint: string = DEFAULT_PLANNING_BLUEPRINT;
    private readonly synthesisBlueprint: string = DEFAULT_SYNTHESIS_BLUEPRINT;

    /**
     * Creates an instance of the PESAgent.
     * @param dependencies - An object containing instances of all required subsystems (managers, registries, etc.).
     */
    constructor(dependencies: PESAgentDependencies) {
        this.deps = dependencies;
    }

    /**
     * Executes the full Plan-Execute-Synthesize cycle for a given user query.
     *
     * **Workflow:**
     * 1.  **Initiation & Config:** Loads thread configuration and system prompt.
     * 2.  **Planning Context Assembly:** Gathers history, available tools, and formats them into a `PromptContext`.
     * 3.  **Planning Prompt Assembly:** Uses `promptManager.assemblePrompt` with the planning blueprint and context to create an `ArtStandardPrompt`.
     * 4.  **Planning LLM Call:** Sends the planning prompt to the `reasoningEngine` (requesting streaming). Consumes the `StreamEvent` stream, buffers the output text, and handles potential errors.
     * 5.  **Planning Output Parsing:** Parses the buffered planning output text to extract intent, plan, and tool calls using `outputParser.parsePlanningOutput`.
     * 6.  **Tool Execution:** Executes identified tool calls via the `toolSystem`.
     * 7.  **Synthesis Context Assembly:** Gathers the original query, plan, tool results, history, etc., into a `PromptContext`.
     * 8.  **Synthesis Prompt Assembly:** Uses `promptManager.assemblePrompt` with the synthesis blueprint and context to create an `ArtStandardPrompt`.
     * 9.  **Synthesis LLM Call:** Sends the synthesis prompt to the `reasoningEngine` (requesting streaming). Consumes the `StreamEvent` stream, buffers the final response text, and handles potential errors.
     * 10. **Finalization:** Saves the final AI message, updates state if needed, records observations, and returns the result.
     *
     * **Error Handling:**
     * - Errors during prompt assembly or critical phases (planning LLM call) will throw an `ARTError`.
     * - Errors during tool execution or synthesis LLM call might result in a 'partial' success status, potentially using the error message as the final response content.
     *
     * @param {AgentProps} props - The input properties containing the user query, threadId, userId, traceId, etc.
     * @returns {Promise<AgentFinalResponse>} A promise resolving to the final response, including the AI message and execution metadata.
     * @throws {ARTError} If a critical error occurs that prevents the agent from completing the process (e.g., config loading, planning failure).
     * @see {AgentProps}
     * @see {AgentFinalResponse}
     * @see {PromptContext}
     * @see {ArtStandardPrompt}
     * @see {StreamEvent}
     */
    async process(props: AgentProps): Promise<AgentFinalResponse> {
        const startTime = Date.now();
        const traceId = props.traceId ?? generateUUID();
        let status: ExecutionMetadata['status'] = 'success';
        let errorMessage: string | undefined;
        let llmCalls = 0;
        let toolCallsCount = 0;
        let finalAiMessage: ConversationMessage | undefined;
        let aggregatedLlmMetadata: LLMMetadata | undefined = undefined; // Initialize aggregated metadata

        try {
            // --- Stage 1: Initiation & Config ---
            Logger.debug(`[${traceId}] Stage 1: Initiation & Config`);
            const threadContext = await this.deps.stateManager.loadThreadContext(props.threadId, props.userId);
            if (!threadContext) {
                throw new ARTError(`Thread context not found for threadId: ${props.threadId}`, ErrorCode.THREAD_NOT_FOUND);
            }
            // Resolve system prompt: Use config value or internal default
            const systemPrompt = await this.deps.stateManager.getThreadConfigValue<string>(props.threadId, 'systemPrompt')
                                  || threadContext.config.systemPrompt // Fallback to potentially deprecated direct config value
                                  || this.defaultSystemPrompt; // Final fallback to agent's internal default

            // --- Stage 2: Planning Context Assembly ---
            Logger.debug(`[${traceId}] Stage 2: Planning Context Assembly`);
            const historyOptions = { limit: threadContext.config.historyLimit };
            const rawHistory = await this.deps.conversationManager.getMessages(props.threadId, historyOptions);
            const availableTools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: props.threadId });

            // Prepare context for planning blueprint
            const planningContext: PromptContext = {
                query: props.query,
                systemPrompt: systemPrompt,
                history: this.formatHistoryForBlueprint(rawHistory),
                availableTools: availableTools.map(tool => {
                    const schemaString = JSON.stringify(tool.inputSchema);
                    return {
                        ...tool,
                        // Use JSON.stringify for robust escaping, then remove outer quotes
                        description: JSON.stringify(tool.description).slice(1, -1),
                        inputSchemaJson: JSON.stringify(schemaString).slice(1, -1) // Stringify the stringified schema
                    };
                }),
                // Add any other custom data the planning blueprint might need
            };

            // --- Stage 3: Planning Call ---
            Logger.debug(`[${traceId}] Stage 3: Planning Call`);
            // Assemble prompt using the stateless manager and blueprint
            const planningPrompt: ArtStandardPrompt = await this.deps.promptManager.assemblePrompt(
                this.planningBlueprint, planningContext
            );

            const planningOptions: CallOptions = {
                threadId: props.threadId,
                traceId: traceId,
                userId: props.userId,
                sessionId: props.sessionId, // Pass sessionId
                stream: true, // Request streaming
                callContext: 'AGENT_THOUGHT', // Set context for planning
                requiredCapabilities: [ModelCapability.REASONING],
                ...(threadContext.config.reasoning.parameters ?? {}),
                ...(props.options?.llmParams ?? {}),
            };

            let planningOutputText: string = ''; // Initialize buffer for planning output
            let parsedPlanningOutput: { intent?: string; plan?: string; toolCalls?: ParsedToolCall[] } = {};
            let planningStreamError: Error | null = null;

            try {
                // Record PLAN observation before making the call
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId: traceId, type: ObservationType.PLAN, content: { message: "Preparing for planning LLM call." }, metadata: { timestamp: Date.now() }
                }).catch(err => Logger.error(`[${traceId}] Failed to record PLAN observation:`, err));

                llmCalls++;
                const planningStream = await this.deps.reasoningEngine.call(planningPrompt, planningOptions);

                // Record stream start
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_START, content: { phase: 'planning' }, metadata: { timestamp: Date.now() }
                }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_START observation:`, err));

                // Consume the stream
                for await (const event of planningStream) {
                    // Call the base notify method directly
                    this.deps.uiSystem.getLLMStreamSocket().notify(event, { targetThreadId: event.threadId, targetSessionId: event.sessionId });

                    switch (event.type) {
                        case 'TOKEN':
                            planningOutputText += event.data; // Append all tokens for planning output
                            break;
                        case 'METADATA':
                            await this.deps.observationManager.record({
                                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_METADATA, content: event.data, metadata: { phase: 'planning', timestamp: Date.now() }
                            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_METADATA observation:`, err));
                            // Aggregate planning metadata if needed (e.g., for overall cost)
                            aggregatedLlmMetadata = { ...(aggregatedLlmMetadata ?? {}), ...event.data };
                            break;
                        case 'ERROR':
                            planningStreamError = event.data instanceof Error ? event.data : new Error(String(event.data));
                            status = 'error';
                            errorMessage = `Planning phase stream error: ${planningStreamError.message}`;
                            Logger.error(`[${traceId}] Planning Stream Error:`, planningStreamError);
                            await this.deps.observationManager.record({
                                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_ERROR, content: { phase: 'planning', error: planningStreamError.message, stack: planningStreamError.stack }, metadata: { timestamp: Date.now() }
                            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_ERROR observation:`, err));
                            break;
                        case 'END':
                            await this.deps.observationManager.record({
                                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_END, content: { phase: 'planning' }, metadata: { timestamp: Date.now() }
                            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_END observation:`, err));
                            break;
                    }
                    if (planningStreamError) break;
                }

                if (planningStreamError) {
                     throw new ARTError(errorMessage!, ErrorCode.PLANNING_FAILED, planningStreamError);
                }

                // Parse the accumulated output
                parsedPlanningOutput = await this.deps.outputParser.parsePlanningOutput(planningOutputText);

                // Record Intent and Plan observations using the final text
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.INTENT, content: { intent: parsedPlanningOutput.intent }, metadata: { timestamp: Date.now() }
                });
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.PLAN, content: { plan: parsedPlanningOutput.plan, rawOutput: planningOutputText }, metadata: { timestamp: Date.now() }
                });
                if (parsedPlanningOutput.toolCalls && parsedPlanningOutput.toolCalls.length > 0) {
                     await this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.TOOL_CALL, content: { toolCalls: parsedPlanningOutput.toolCalls }, metadata: { timestamp: Date.now() }
                    });
                }

            } catch (err: any) {
                // Catch errors from initial call or re-thrown stream errors
                status = 'error';
                errorMessage = errorMessage ?? `Planning phase failed: ${err.message}`; // Use stream error message if available
                Logger.error(`[${traceId}] Planning Error:`, err);
                // Avoid duplicate error recording if it came from the stream
                if (!planningStreamError) {
                    await this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.ERROR, content: { phase: 'planning', error: err.message, stack: err.stack }, metadata: { timestamp: Date.now() }
                    });
                }
                throw err instanceof ARTError ? err : new ARTError(errorMessage, ErrorCode.PLANNING_FAILED, err); // Rethrow
            }

            // --- Stage 4: Tool Execution ---
            let toolResults: ToolResult[] = [];
            if (parsedPlanningOutput.toolCalls && parsedPlanningOutput.toolCalls.length > 0) {
                Logger.debug(`[${traceId}] Stage 4: Tool Execution (${parsedPlanningOutput.toolCalls.length} calls)`);
                try {
                    toolResults = await this.deps.toolSystem.executeTools(parsedPlanningOutput.toolCalls, props.threadId, traceId);
                    toolCallsCount = toolResults.length;
                    if (toolResults.some(r => r.status === 'error')) {
                        status = 'partial';
                        Logger.warn(`[${traceId}] Partial success in tool execution.`);
                        errorMessage = errorMessage ? `${errorMessage}; Tool execution errors occurred.` : 'Tool execution errors occurred.';
                    }
                } catch (err: any) {
                    status = 'error';
                    errorMessage = `Tool execution phase failed: ${err.message}`;
                    Logger.error(`[${traceId}] Tool Execution System Error:`, err);
                    await this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.ERROR, content: { phase: 'tool_execution', error: err.message, stack: err.stack }, metadata: { timestamp: Date.now() }
                    });
                    throw new ARTError(errorMessage, ErrorCode.TOOL_EXECUTION_FAILED, err);
                }
            } else {
                 Logger.debug(`[${traceId}] Stage 4: Tool Execution (No tool calls)`);
            }


            // --- Stage 5: Synthesis Call ---
            Logger.debug(`[${traceId}] Stage 5: Synthesis Call`);
            // Record SYNTHESIS observation before making the call
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId: traceId, type: ObservationType.SYNTHESIS, content: { message: "Preparing for synthesis LLM call." }, metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record SYNTHESIS observation:`, err));

            // Prepare context for synthesis blueprint
            const synthesisContext: PromptContext = {
                query: props.query,
                systemPrompt: systemPrompt,
                history: this.formatHistoryForBlueprint(rawHistory), // Use the same formatted history
                intent: parsedPlanningOutput.intent,
                plan: parsedPlanningOutput.plan,
                toolResults: toolResults.map(result => {
                    const outputString = result.status === 'success' ? JSON.stringify(result.output) : undefined;
                    const errorString = result.status === 'error' ? (result.error ?? 'Unknown error') : undefined;
                    return {
                        ...result,
                        // Use JSON.stringify for robust escaping, then remove outer quotes
                        outputJson: outputString ? JSON.stringify(outputString).slice(1, -1) : undefined,
                        error: errorString ? JSON.stringify(errorString).slice(1, -1) : undefined,
                    };
                }),
                // Add any other custom data the synthesis blueprint might need
            };

           // Assemble prompt using the stateless manager and blueprint
           const synthesisPrompt: ArtStandardPrompt = await this.deps.promptManager.assemblePrompt(
               this.synthesisBlueprint, synthesisContext
           );

            const synthesisOptions: CallOptions = {
                threadId: props.threadId,
                traceId: traceId,
                userId: props.userId,
                sessionId: props.sessionId, // Pass sessionId
                stream: true, // Request streaming
                callContext: 'FINAL_SYNTHESIS', // Set context for synthesis
                requiredCapabilities: [ModelCapability.TEXT],
                ...(threadContext.config.reasoning.parameters ?? {}),
                ...(props.options?.llmParams ?? {}),
            };

            let finalResponseContent: string = ''; // Initialize buffer for final response
            let synthesisStreamError: Error | null = null;

            try {
                llmCalls++;
                const synthesisStream = await this.deps.reasoningEngine.call(synthesisPrompt, synthesisOptions);

                // Record stream start
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_START, content: { phase: 'synthesis' }, metadata: { timestamp: Date.now() }
                }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_START observation:`, err));

                // Consume the stream
                for await (const event of synthesisStream) {
                     // Call the base notify method directly
                    this.deps.uiSystem.getLLMStreamSocket().notify(event, { targetThreadId: event.threadId, targetSessionId: event.sessionId });

                    switch (event.type) {
                        case 'TOKEN':
                            // Append only final response tokens
                            if (event.tokenType === 'FINAL_SYNTHESIS_LLM_RESPONSE' || event.tokenType === 'LLM_RESPONSE') {
                                finalResponseContent += event.data;
                            }
                            break;
                        case 'METADATA':
                            aggregatedLlmMetadata = { ...(aggregatedLlmMetadata ?? {}), ...event.data }; // Aggregate metadata
                            await this.deps.observationManager.record({
                                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_METADATA, content: event.data, metadata: { phase: 'synthesis', timestamp: Date.now() }
                            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_METADATA observation:`, err));
                            break;
                        case 'ERROR':
                            synthesisStreamError = event.data instanceof Error ? event.data : new Error(String(event.data));
                            status = status === 'partial' ? 'partial' : 'error';
                            errorMessage = errorMessage ? `${errorMessage}; Synthesis stream error: ${synthesisStreamError.message}` : `Synthesis stream error: ${synthesisStreamError.message}`;
                            Logger.error(`[${traceId}] Synthesis Stream Error:`, synthesisStreamError);
                            await this.deps.observationManager.record({
                                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_ERROR, content: { phase: 'synthesis', error: synthesisStreamError.message, stack: synthesisStreamError.stack }, metadata: { timestamp: Date.now() }
                            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_ERROR observation:`, err));
                            break;
                        case 'END':
                             await this.deps.observationManager.record({
                                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_END, content: { phase: 'synthesis' }, metadata: { timestamp: Date.now() }
                            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_END observation:`, err));
                            break;
                    }
                     if (synthesisStreamError) break;
                }

                 // Handle stream error after loop
                 if (synthesisStreamError) {
                     if (status !== 'partial') {
                         throw new ARTError(errorMessage!, ErrorCode.SYNTHESIS_FAILED, synthesisStreamError);
                     }
                     finalResponseContent = errorMessage!; // Use error message as content if synthesis failed partially
                 }
                 // No need to parse output anymore

            } catch (err: any) {
                // Catch errors from initial call or re-thrown stream errors
                status = status === 'partial' ? 'partial' : 'error';
                const synthesisErrorMessage = `Synthesis phase failed: ${err.message}`;
                errorMessage = errorMessage ? `${errorMessage}; ${synthesisErrorMessage}` : synthesisErrorMessage;
                Logger.error(`[${traceId}] Synthesis Error:`, err);
                 // Avoid duplicate error recording if it came from the stream
                 if (!synthesisStreamError) {
                     await this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.ERROR, content: { phase: 'synthesis', error: err.message, stack: err.stack }, metadata: { timestamp: Date.now() }
                    });
                 }
                 if (status !== 'partial') {
                    throw err instanceof ARTError ? err : new ARTError(synthesisErrorMessage, ErrorCode.SYNTHESIS_FAILED, err);
                 }
                 finalResponseContent = errorMessage; // Use error message as content if synthesis failed partially
            }

            // --- Stage 6: Finalization ---
            Logger.debug(`[${traceId}] Stage 6: Finalization`);
            const finalTimestamp = Date.now();
            finalAiMessage = {
                messageId: generateUUID(),
                threadId: props.threadId,
                role: MessageRole.AI,
                content: finalResponseContent, // Use buffered content
                timestamp: finalTimestamp,
                metadata: { traceId },
            };

            // Save AI response message
            await this.deps.conversationManager.addMessages(props.threadId, [finalAiMessage]);

            // Record final response observation
            await this.deps.observationManager.record({
                threadId: props.threadId,
                traceId,
                type: ObservationType.FINAL_RESPONSE,
                content: { message: finalAiMessage },
                metadata: { timestamp: finalTimestamp }
            });

            // Save state if modified (StateManager handles the check)
            await this.deps.stateManager.saveStateIfModified(props.threadId);

        } catch (error: any) {
            Logger.error(`[${traceId}] PESAgent process error:`, error);
            status = status === 'partial' ? 'partial' : 'error'; // Keep partial if it was set before the catch
            errorMessage = errorMessage ?? (error instanceof ARTError ? error.message : 'An unexpected error occurred.');
             // Ensure finalAiMessage is undefined if a critical error occurred before synthesis
             if (status === 'error') finalAiMessage = undefined;

            // Record top-level error if not already recorded in specific phases
            if (!(error instanceof ARTError && (
                error.code === ErrorCode.PLANNING_FAILED ||
                error.code === ErrorCode.TOOL_EXECUTION_FAILED ||
                error.code === ErrorCode.SYNTHESIS_FAILED
            ))) {
                 await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.ERROR, content: { phase: 'agent_process', error: error.message, stack: error.stack }, metadata: { timestamp: Date.now() }
                }).catch(err => Logger.error(`[${traceId}] Failed to record top-level error observation:`, err));
            }
        } finally {
            // Ensure state is attempted to be saved even if errors occurred mid-process
            // (unless the error was during state loading itself)
             try {
                 await this.deps.stateManager.saveStateIfModified(props.threadId);
             } catch(saveError: any) {
                 Logger.error(`[${traceId}] Failed to save state during finalization:`, saveError);
                 // Potentially record another error observation
             }
        }


        const endTime = Date.now();
        const metadata: ExecutionMetadata = {
            threadId: props.threadId,
            traceId: traceId,
            userId: props.userId,
            status: status,
            totalDurationMs: endTime - startTime,
            llmCalls: llmCalls,
            toolCalls: toolCallsCount, // Use the count of executed tools
            // llmCost: calculateCost(), // TODO: Implement cost calculation if needed
            error: errorMessage,
            llmMetadata: aggregatedLlmMetadata, // Add aggregated LLM metadata
        };

        if (!finalAiMessage && status !== 'success') {
             // If we had an error before generating a final message, create a placeholder error response
             finalAiMessage = {
                 messageId: generateUUID(),
                 threadId: props.threadId,
                 role: MessageRole.AI,
                 content: errorMessage ?? "Agent execution failed.",
                 timestamp: Date.now(),
                 metadata: { traceId, error: true }
             };
             // Optionally save this error message to history? For now, just return it.
        } else if (!finalAiMessage) {
             // This case should ideally not happen if status is success, but as a fallback:
             throw new ARTError("Agent finished with success status but no final message was generated.", ErrorCode.UNKNOWN_ERROR);
        }


        return {
            response: finalAiMessage,
            metadata: metadata,
        };
    }

    /**
     * Helper function to format conversation history for the blueprint context.
     * Maps `ConversationMessage` roles to `ArtStandardMessageRole` and adds Mustache flags.
     * @param history - Array of `ConversationMessage` from storage.
     * @returns Array formatted for Mustache context.
     */
    private formatHistoryForBlueprint(history: ConversationMessage[]): Array<{ role: ArtStandardMessageRole; content: string; last?: boolean }> {
        return history.map((msg, index) => {
            let role: ArtStandardMessageRole;
            switch (msg.role) {
                case MessageRole.USER:
                    role = 'user';
                    break;
                case MessageRole.AI:
                    role = 'assistant';
                    break;
                // Skip SYSTEM/TOOL roles from raw history for basic prompt context
                default:
                    // This case should ideally not happen if history is clean, but return a default/skip
                    Logger.warn(`[PESAgent] Skipping history message with unmappable role: ${msg.role}`);
                    return null; // Filter out nulls later
            }
            return {
                role: role,
                content: msg.content,
                last: index === history.length - 1 // Add 'last' flag for Mustache conditional commas
            };
        }).filter(item => item !== null) as Array<{ role: ArtStandardMessageRole; content: string; last?: boolean }>; // Type assertion after filtering nulls
    }
}