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
    //ThreadContext,
    //ToolSchema,
    ParsedToolCall,
    ToolResult,
    ObservationType,
    ExecutionMetadata,
    MessageRole,
    CallOptions,
    ModelCapability, // <-- Added import
    // StreamEvent, // <-- Removed unused import
    LLMMetadata // <-- Added import
    // Omit removed, using built-in implicitly
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

/**
 * Implements the Plan-Execute-Synthesize (PES) agent orchestration logic.
 * This agent follows a structured 6-stage process to handle user queries,
 * interact with LLMs and tools, and generate a final response.
 * It relies on various injected subsystems (managers, registries, etc.) to perform its tasks.
 * **Crucially, it determines the specific LLM capabilities required for its Planning and Synthesis stages.**
 */
export class PESAgent implements IAgentCore {
    private readonly deps: PESAgentDependencies;

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
     * Stages:
     * 1. Initiation & Config Loading: Loads thread-specific settings.
     * 2. Planning Context Assembly: Gathers history and tool schemas.
     * 3. Planning Call: First LLM call (potentially streaming) to generate intent, plan, and tool calls.
     * 4. Tool Execution: Executes planned tool calls via the ToolSystem.
     * 5. Synthesis Call: Second LLM call (potentially streaming) using plan and tool results to generate the final response.
     * 6. Finalization: Saves messages and state, returns the final response.
     *
     * @param props - The input properties containing the user query, threadId, and optional context.
     * @returns A promise resolving to the AgentFinalResponse containing the AI's message and execution metadata.
     * @throws {ARTError} If a critical error occurs during any stage that prevents completion (e.g., config loading, planning failure without fallback). Partial successes (e.g., tool errors followed by successful synthesis) might result in a 'partial' status in the metadata instead of throwing.
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
            const systemPrompt = threadContext.config.systemPrompt;

            // --- Stage 2: Planning Context ---
            Logger.debug(`[${traceId}] Stage 2: Planning Context`);
            const historyOptions = { limit: threadContext.config.historyLimit };
            const history = await this.deps.conversationManager.getMessages(props.threadId, historyOptions);
            const availableTools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: props.threadId });

            // --- Stage 3: Planning Call ---
            Logger.debug(`[${traceId}] Stage 3: Planning Call`);
            const planningPrompt = await this.deps.promptManager.createPlanningPrompt(
                props.query, history, systemPrompt, availableTools, threadContext
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

           const synthesisPrompt = await this.deps.promptManager.createSynthesisPrompt(
               props.query, parsedPlanningOutput.intent, parsedPlanningOutput.plan, toolResults, history, systemPrompt, threadContext
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
}

// Helper function placeholder for cost calculation
// function calculateCost(): number | undefined {
//     // Implementation depends on tracking token usage per call and provider pricing
//     return undefined;
// }