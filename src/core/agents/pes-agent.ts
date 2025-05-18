// src/core/agents/pes-agent.ts
import {
    IAgentCore,
    StateManager,
    ConversationManager,
    ToolRegistry,
    // PromptManager, // Removed - PESAgent will construct prompt object directly
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
    // PromptContext, // Removed unused import after refactoring prompt construction
    // ThreadConfig, // Removed unused import (config accessed via ThreadContext)
    // ToolSchema, // Removed unused import
    // ThreadContext, // Removed unused import
} from '../../types';
import { RuntimeProviderConfig } from '../../types/providers'; // Import RuntimeProviderConfig
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
    /**
     * Optional default system prompt string provided at the ART instance level.
     * This serves as a custom prompt part if no thread-specific or call-specific
     * system prompt is provided. It's appended to the agent's base system prompt.
     */
    instanceDefaultCustomSystemPrompt?: string;
    /** Manages conversation history. */
    conversationManager: ConversationManager;
    /** Registry for available tools. */
    toolRegistry: ToolRegistry;
    // /** Constructs prompts for LLM calls. */ // Removed
    // promptManager: PromptManager; // Removed
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

// Default system prompt remains
const DEFAULT_PES_SYSTEM_PROMPT = `You are a helpful AI assistant. You need to understand a user's query, potentially use tools to gather information, and then synthesize a final response.`;

// Removed DEFAULT_PLANNING_BLUEPRINT and DEFAULT_SYNTHESIS_BLUEPRINT

/**
 * Implements the Plan-Execute-Synthesize (PES) agent orchestration logic.
 * This agent follows a structured approach:
 * 1.  **Plan:** Understand the user query, determine intent, and create a plan (potentially involving tool calls).
 * 2.  **Execute:** Run any necessary tools identified in the planning phase.
 * 3.  **Synthesize:** Generate a final response based on the query, plan, and tool results.
 *
 * It constructs standardized prompts (`ArtStandardPrompt`) directly as JavaScript objects
 * for the `ReasoningEngine`. It processes the `StreamEvent` output from the reasoning engine for both planning and synthesis.
 *
 * @implements {IAgentCore}
 * // @see {PromptManager} // Removed
 * @see {ReasoningEngine}
 * @see {ArtStandardPrompt}
 * @see {StreamEvent}
 */
export class PESAgent implements IAgentCore {
    private readonly deps: PESAgentDependencies;
    /** The base system prompt inherent to this agent. */
    private readonly defaultSystemPrompt: string = DEFAULT_PES_SYSTEM_PROMPT; // This is the AGENT BASE
    /**
     * Stores the instance-level default custom system prompt, passed during construction.
     * Used in the system prompt hierarchy if no thread or call-level prompt is specified.
     */
    private readonly instanceDefaultCustomSystemPrompt?: string;
    // Removed blueprint properties

    /**
     * Creates an instance of the PESAgent.
     * @param dependencies - An object containing instances of all required subsystems (managers, registries, etc.).
     */
    constructor(dependencies: PESAgentDependencies) {
        this.deps = dependencies;
        this.instanceDefaultCustomSystemPrompt = dependencies.instanceDefaultCustomSystemPrompt;
    }

    /**
     * Executes the full Plan-Execute-Synthesize cycle for a given user query.
     *
     * **Workflow:**
     * 1.  **Initiation & Config:** Loads thread configuration. Resolves the final system prompt based on a hierarchy:
     *     Call-level (`AgentProps.options.systemPrompt`) > Thread-level (`ThreadConfig.systemPrompt`) >
     *     Instance-level (`ArtInstanceConfig.defaultSystemPrompt` via constructor) > Agent's base prompt.
     *     The resolved custom part is appended to the agent's base prompt.
     * 2.  **Data Gathering:** Gathers history, available tools, the resolved system prompt, and query.
     * 3.  **Planning Prompt Construction:** Directly constructs the `ArtStandardPrompt` object/array for planning.
     * 4.  **Planning LLM Call:** Sends the planning prompt object to the `reasoningEngine` (requesting streaming). Consumes the `StreamEvent` stream, buffers the output text, and handles potential errors.
     * 5.  **Planning Output Parsing:** Parses the buffered planning output text to extract intent, plan, and tool calls using `outputParser.parsePlanningOutput`.
     * 6.  **Tool Execution:** Executes identified tool calls via the `toolSystem`.
     * 7.  **Data Gathering (Synthesis):** Gathers the original query, plan, tool results, history, etc.
     * 8.  **Synthesis Prompt Construction:** Directly constructs the `ArtStandardPrompt` object/array for synthesis.
     * 9.  **Synthesis LLM Call:** Sends the synthesis prompt object to the `reasoningEngine` (requesting streaming). Consumes the `StreamEvent` stream, buffers the final response text, and handles potential errors.
     * 10. **Finalization:** Saves the final AI message, updates state if needed, records observations, and returns the result.
     *
     * **Error Handling:**
     * - Errors during critical phases (planning/synthesis LLM call) will throw an `ARTError`. Prompt construction errors are less likely but possible if data is malformed.
     * - Errors during tool execution or synthesis LLM call might result in a 'partial' success status, potentially using the error message as the final response content.
     *
     * @param {AgentProps} props - The input properties containing the user query, threadId, userId, traceId, etc.
     * @returns {Promise<AgentFinalResponse>} A promise resolving to the final response, including the AI message and execution metadata.
     * @throws {ARTError} If a critical error occurs that prevents the agent from completing the process (e.g., config loading, planning failure).
     * @see {AgentProps}
     * @see {AgentFinalResponse}
     * // @see {PromptContext} // Removed - context is implicit in object construction
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
            // Resolve system prompt based on the new hierarchy
            const agentInternalBaseSystemPrompt = this.defaultSystemPrompt;
            let customSystemPromptPart: string | undefined = undefined;

            // Check Call-level (AgentProps.options.systemPrompt)
            if (props.options?.systemPrompt) {
                customSystemPromptPart = props.options.systemPrompt;
                Logger.debug(`[${traceId}] Using Call-level custom system prompt.`);
            }
            // Else, check Thread-level (ThreadConfig.systemPrompt from types/index.ts)
            else {
                const threadSystemPrompt = await this.deps.stateManager.getThreadConfigValue<string>(props.threadId, 'systemPrompt');
                if (threadSystemPrompt) {
                    customSystemPromptPart = threadSystemPrompt;
                    Logger.debug(`[${traceId}] Using Thread-level custom system prompt.`);
                }
                // Else, check Instance-level (this.instanceDefaultCustomSystemPrompt)
                else if (this.instanceDefaultCustomSystemPrompt) {
                    customSystemPromptPart = this.instanceDefaultCustomSystemPrompt;
                    Logger.debug(`[${traceId}] Using Instance-level custom system prompt.`);
                }
            }

            let finalSystemPrompt = agentInternalBaseSystemPrompt;
            if (customSystemPromptPart) {
                finalSystemPrompt = `${agentInternalBaseSystemPrompt}\n\n${customSystemPromptPart}`;
                Logger.debug(`[${traceId}] Custom system prompt part applied: "${customSystemPromptPart.substring(0, 100)}..."`);
            } else {
                Logger.debug(`[${traceId}] No custom system prompt part found. Using agent internal base prompt only.`);
            }
            const systemPrompt = finalSystemPrompt; // Use this variable name for minimal changes below

            // Determine RuntimeProviderConfig (Checklist item 17)
            // This config specifies the provider/model/adapterOptions for the LLM call
            const runtimeProviderConfig: RuntimeProviderConfig | undefined =
                props.options?.providerConfig || threadContext.config.providerConfig;

            if (!runtimeProviderConfig) {
                 throw new ARTError(`RuntimeProviderConfig is missing in AgentProps.options or ThreadConfig for threadId: ${props.threadId}`, ErrorCode.INVALID_CONFIG);
            }


            // --- Stage 2: Planning Context Assembly ---
            Logger.debug(`[${traceId}] Stage 2: Planning Context Assembly`);
            const historyOptions = { limit: threadContext.config.historyLimit };
            const rawHistory = await this.deps.conversationManager.getMessages(props.threadId, historyOptions);
            const availableTools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: props.threadId });

            // Format history for direct inclusion
            const formattedHistory = this.formatHistoryForPrompt(rawHistory);

            // --- Stage 3: Planning Prompt Construction ---
            Logger.debug(`[${traceId}] Stage 3: Planning Prompt Construction`);
            let planningPrompt: ArtStandardPrompt;
            try {
                planningPrompt = [
                    { role: 'system', content: systemPrompt },
                    ...formattedHistory, // Spread the formatted history messages
                    {
                        role: 'user',
                        // Construct the user content string directly
                        content: `User Query: ${props.query}\n\nAvailable Tools:\n${
                            availableTools.length > 0
                            ? availableTools.map(tool => `- ${tool.name}: ${tool.description}\n  Input Schema: ${JSON.stringify(tool.inputSchema)}`).join('\n')
                            : 'No tools available.'
                        }\n\nBased on the user query and conversation history, identify the user's intent and create a plan to fulfill it using the available tools if necessary.\nRespond in the following format:\nIntent: [Briefly describe the user's goal]\nPlan: [Provide a step-by-step plan. If tools are needed, list them clearly.]\nTool Calls: [Output *only* the JSON array of tool calls required by the assistant, matching the ArtStandardMessage tool_calls format: [{\\"id\\": \\"call_abc123\\", \\"type\\": \\"function\\", \\"function\\": {\\"name\\": \\"tool_name\\", \\"arguments\\": \\"{\\\\\\"arg1\\\\\\": \\\\\\"value1\\\\\\"}\\"}}] or [] if no tools are needed. Do not add any other text in this section.]`
                    }
                ];
                // Optional: Validate the constructed prompt object if needed
                // ArtStandardPromptSchema.parse(planningPrompt);
            } catch (err: any) {
                 Logger.error(`[${traceId}] Failed to construct planning prompt object:`, err);
                 throw new ARTError(`Failed to construct planning prompt object: ${err.message}`, ErrorCode.PROMPT_ASSEMBLY_FAILED, err);
            }


            // --- Stage 3b: Planning LLM Call ---
            Logger.debug(`[${traceId}] Stage 3b: Planning LLM Call`);
            const planningOptions: CallOptions = {
                threadId: props.threadId,
                traceId: traceId,
                userId: props.userId,
                sessionId: props.sessionId, // Pass sessionId
                stream: true, // Request streaming
                callContext: 'AGENT_THOUGHT', // Set context for planning
                requiredCapabilities: [ModelCapability.REASONING],
                // Pass the determined runtimeProviderConfig
                providerConfig: runtimeProviderConfig,
                // Merge additional LLM parameters from ThreadConfig and AgentProps (AgentProps overrides ThreadConfig)
                // ...(threadContext.config.reasoning?.parameters ?? {}), // Removed: Parameters are now in providerConfig.adapterOptions
                ...(props.options?.llmParams ?? {}), // AgentProps.options.llmParams can still override adapterOptions at call time if needed
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
                // Pass the constructed prompt object directly
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

            // --- Stage 5: Synthesis Prompt Construction ---
            Logger.debug(`[${traceId}] Stage 5: Synthesis Prompt Construction`);
            let synthesisPrompt: ArtStandardPrompt;
            try {
                 synthesisPrompt = [
                    { role: 'system', content: systemPrompt },
                    ...formattedHistory, // Reuse formatted history
                    {
                        role: 'user',
                        // Construct the user content string directly
                        content: `User Query: ${props.query}\n\nOriginal Intent: ${parsedPlanningOutput.intent ?? ''}\nExecution Plan: ${parsedPlanningOutput.plan ?? ''}\n\nTool Execution Results:\n${
                            toolResults.length > 0
                            ? toolResults.map(result => `- Tool: ${result.toolName} (Call ID: ${result.callId})\n  Status: ${result.status}\n  ${result.status === 'success' ? `Output: ${JSON.stringify(result.output)}` : ''}\n  ${result.status === 'error' ? `Error: ${result.error ?? 'Unknown error'}` : ''}`).join('\n')
                            : 'No tools were executed.'
                        }\n\nBased on the user query, the plan, and the results of any tool executions, synthesize a final response to the user.\nIf the tools failed or provided unexpected results, explain the issue and try to answer based on available information or ask for clarification.`
                    }
                ];
                 // Optional: Validate the constructed prompt object if needed
                 // ArtStandardPromptSchema.parse(synthesisPrompt);
            } catch (err: any) {
                 Logger.error(`[${traceId}] Failed to construct synthesis prompt object:`, err);
                 throw new ARTError(`Failed to construct synthesis prompt object: ${err.message}`, ErrorCode.PROMPT_ASSEMBLY_FAILED, err);
            }

            // --- Stage 5b: Synthesis LLM Call ---
            Logger.debug(`[${traceId}] Stage 5b: Synthesis LLM Call`);
            const synthesisOptions: CallOptions = {
                threadId: props.threadId,
                traceId: traceId,
                userId: props.userId,
                sessionId: props.sessionId, // Pass sessionId
                stream: true, // Request streaming
                callContext: 'FINAL_SYNTHESIS', // Set context for synthesis
                requiredCapabilities: [ModelCapability.TEXT],
                // Pass the determined runtimeProviderConfig
                providerConfig: runtimeProviderConfig,
                // Merge additional LLM parameters from ThreadConfig and AgentProps (AgentProps overrides ThreadConfig)
                // ...(threadContext.config.reasoning?.parameters ?? {}), // Removed: Parameters are now in providerConfig.adapterOptions
                ...(props.options?.llmParams ?? {}), // AgentProps.options.llmParams can still override adapterOptions at call time if needed
            };

            let finalResponseContent: string = ''; // Initialize buffer for final response
            let synthesisStreamError: Error | null = null;

            try {
                llmCalls++;
                 // Pass the constructed prompt object directly
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
     * Formats conversation history messages for direct inclusion in ArtStandardPrompt.
     * Converts internal MessageRole to ArtStandardMessageRole.
     * @param history - Array of ConversationMessage objects.
     * @returns Array of messages suitable for ArtStandardPrompt.
     */
    private formatHistoryForPrompt(history: ConversationMessage[]): ArtStandardPrompt { // Renamed function and updated return type
        return history.map((msg) => { // Removed unused 'index' parameter
            let role: ArtStandardMessageRole;
            switch (msg.role) {
                case MessageRole.USER:
                    role = 'user'; // Assign string literal
                    break;
                case MessageRole.AI:
                    role = 'assistant'; // Assign string literal
                    break;
                case MessageRole.SYSTEM: // Add mapping for SYSTEM role
                    role = 'system'; // Assign string literal
                    break;
                case MessageRole.TOOL:
                    role = 'tool'; // Assign string literal
                    break;
                default:
                    // Log a warning for unhandled roles but default to user
                    Logger.warn(`Unhandled message role '${msg.role}' in formatHistoryForPrompt. Defaulting to 'user'.`); // Updated function name in log
                    role = 'user'; // Assign string literal
            }
            // Return the object structure expected by ArtStandardPrompt
            return {
                role: role,
                content: msg.content, // Use raw content
                // Add other fields like 'name' or 'tool_call_id' if necessary based on msg structure
            };
        }).filter(msg => msg.content); // Example: Filter out messages with no content if needed
    }
}
