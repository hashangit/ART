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
    // Omit removed, using built-in implicitly
} from '../../types';
import { generateUUID } from '../../utils/uuid';
import { ARTError, ErrorCode } from '../../errors'; // Assuming a custom error class exists

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
     * 3. Planning Call: First LLM call to generate intent, plan, and tool calls. **Determines the required capabilities (e.g., `REASONING`) for planning and includes them in the options passed to the `ReasoningEngine`.**
     * 4. Tool Execution: Executes planned tool calls via the ToolSystem.
     * 5. Synthesis Call: Second LLM call using plan and tool results to generate the final response. **Determines the required capabilities (e.g., `TEXT`, potentially `VISION` if applicable based on tool results) for synthesis and includes them in the options passed to the `ReasoningEngine`.**
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
        let toolCallsCount = 0; // Renamed to avoid conflict with ParsedToolCall[]
        let finalAiMessage: ConversationMessage | undefined;

        try {
            // --- Stage 1: Initiation & Config ---
            console.log(`[${traceId}] Stage 1: Initiation & Config`);
            const threadContext = await this.deps.stateManager.loadThreadContext(props.threadId, props.userId);
            if (!threadContext) {
                throw new ARTError(`Thread context not found for threadId: ${props.threadId}`, ErrorCode.THREAD_NOT_FOUND);
            }
            const systemPrompt = threadContext.config.systemPrompt; // Use thread-specific or default

            // --- Stage 2: Planning Context ---
            console.log(`[${traceId}] Stage 2: Planning Context`);
            const historyOptions = { limit: threadContext.config.historyLimit };
            const history = await this.deps.conversationManager.getMessages(props.threadId, historyOptions);
            // const enabledToolNames = threadContext.config.enabledTools; // Removed unused variable
            const availableTools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: props.threadId }); // Assuming registry can filter

            // --- Stage 3: Planning Call ---
            console.log(`[${traceId}] Stage 3: Planning Call`);
            const planningPrompt = await this.deps.promptManager.createPlanningPrompt(
                props.query, history, systemPrompt, availableTools, threadContext
            );

            const planningOptions: CallOptions = {
                threadId: props.threadId,
                traceId: traceId,
                userId: props.userId,
                requiredCapabilities: [ModelCapability.REASONING], // <-- Added capabilities
                onThought: (thought: string) => {
                    this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.THOUGHTS, content: { phase: 'planning', thought }, metadata: { timestamp: Date.now() }
                    }).catch(err => console.error(`[${traceId}] Failed to record planning thought observation:`, err));
                },
                // Pass LLM parameters from config, potentially overridden by props.options
                ...(threadContext.config.reasoning.parameters ?? {}),
                ...(props.options?.llmParams ?? {}),
            };

            let planningOutputText: string;
            let parsedPlanningOutput: { intent?: string; plan?: string; toolCalls?: ParsedToolCall[] } = {};
            try {
                llmCalls++;
                planningOutputText = await this.deps.reasoningEngine.call(planningPrompt, planningOptions);
                parsedPlanningOutput = await this.deps.outputParser.parsePlanningOutput(planningOutputText);

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
                status = 'error';
                errorMessage = `Planning phase failed: ${err.message}`;
                console.error(`[${traceId}] Planning Error:`, err);
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.ERROR, content: { phase: 'planning', error: err.message, stack: err.stack }, metadata: { timestamp: Date.now() }
                });
                throw new ARTError(errorMessage, ErrorCode.PLANNING_FAILED, err); // Rethrow to stop execution
            }

            // --- Stage 4: Tool Execution ---
            let toolResults: ToolResult[] = [];
            if (parsedPlanningOutput.toolCalls && parsedPlanningOutput.toolCalls.length > 0) {
                console.log(`[${traceId}] Stage 4: Tool Execution (${parsedPlanningOutput.toolCalls.length} calls)`);
                try {
                    // ToolSystem is responsible for validation, execution, and recording TOOL_EXECUTION/ERROR observations
                    toolResults = await this.deps.toolSystem.executeTools(parsedPlanningOutput.toolCalls, props.threadId, traceId);
                    toolCallsCount = toolResults.length; // Count actual executions/results
                     // Check results for errors to potentially set status to 'partial'
                    if (toolResults.some(r => r.status === 'error')) {
                        status = 'partial';
                        console.warn(`[${traceId}] Partial success in tool execution.`);
                        // Optionally collect specific tool errors for the final metadata
                        errorMessage = errorMessage ? `${errorMessage}; Tool execution errors occurred.` : 'Tool execution errors occurred.';
                    }
                } catch (err: any) {
                     // This catch block might be redundant if ToolSystem handles internal errors and returns ToolResult[]
                     // However, ToolSystem itself could throw an unexpected error.
                    status = 'error';
                    errorMessage = `Tool execution phase failed: ${err.message}`;
                    console.error(`[${traceId}] Tool Execution System Error:`, err);
                    await this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.ERROR, content: { phase: 'tool_execution', error: err.message, stack: err.stack }, metadata: { timestamp: Date.now() }
                    });
                    throw new ARTError(errorMessage, ErrorCode.TOOL_EXECUTION_FAILED, err); // Rethrow
                }
            } else {
                 console.log(`[${traceId}] Stage 4: Tool Execution (No tool calls)`);
            }


            // --- Stage 5: Synthesis Call ---
             console.log(`[${traceId}] Stage 5: Synthesis Call`);
            const synthesisPrompt = await this.deps.promptManager.createSynthesisPrompt(
                props.query, parsedPlanningOutput.intent, parsedPlanningOutput.plan, toolResults, history, systemPrompt, threadContext
            );

            const synthesisOptions: CallOptions = {
                threadId: props.threadId,
                traceId: traceId,
                userId: props.userId,
                // TODO: Conditionally add VISION capability if toolResults contain image data
                requiredCapabilities: [ModelCapability.TEXT], // <-- Added capabilities
                 onThought: (thought: string) => {
                    this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.THOUGHTS, content: { phase: 'synthesis', thought }, metadata: { timestamp: Date.now() }
                    }).catch(err => console.error(`[${traceId}] Failed to record synthesis thought observation:`, err));
                },
                ...(threadContext.config.reasoning.parameters ?? {}),
                ...(props.options?.llmParams ?? {}),
            };

            let finalResponseContent: string;
            try {
                llmCalls++;
                const synthesisOutputText = await this.deps.reasoningEngine.call(synthesisPrompt, synthesisOptions);
                 await this.deps.observationManager.record({
                        threadId: props.threadId, traceId, type: ObservationType.SYNTHESIS, content: { rawOutput: synthesisOutputText }, metadata: { timestamp: Date.now() }
                 });
                finalResponseContent = await this.deps.outputParser.parseSynthesisOutput(synthesisOutputText);

            } catch (err: any) {
                // If synthesis fails after partial tool success, status remains 'partial' but add synthesis error
                status = status === 'partial' ? 'partial' : 'error';
                const synthesisErrorMessage = `Synthesis phase failed: ${err.message}`;
                errorMessage = errorMessage ? `${errorMessage}; ${synthesisErrorMessage}` : synthesisErrorMessage;
                console.error(`[${traceId}] Synthesis Error:`, err);
                 await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.ERROR, content: { phase: 'synthesis', error: err.message, stack: err.stack }, metadata: { timestamp: Date.now() }
                });
                 // Decide whether to throw or allow returning partial results
                 // For now, let's allow returning partial if tools ran, otherwise throw
                 if (status !== 'partial') {
                    throw new ARTError(synthesisErrorMessage, ErrorCode.SYNTHESIS_FAILED, err);
                 }
                 finalResponseContent = errorMessage; // Use error message as content if synthesis failed partially
            }

            // --- Stage 6: Finalization ---
            console.log(`[${traceId}] Stage 6: Finalization`);
            const finalTimestamp = Date.now();
            finalAiMessage = {
                messageId: generateUUID(),
                threadId: props.threadId,
                role: MessageRole.AI,
                content: finalResponseContent,
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
            console.error(`[${traceId}] PESAgent process error:`, error);
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
                }).catch(err => console.error(`[${traceId}] Failed to record top-level error observation:`, err));
            }
        } finally {
            // Ensure state is attempted to be saved even if errors occurred mid-process
            // (unless the error was during state loading itself)
             try {
                 await this.deps.stateManager.saveStateIfModified(props.threadId);
             } catch(saveError: any) {
                 console.error(`[${traceId}] Failed to save state during finalization:`, saveError);
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