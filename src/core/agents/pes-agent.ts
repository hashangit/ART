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
    UISystem, // Added UISystem import
    IA2ATaskRepository // Added A2A task repository interface
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
    A2ATask, // Added A2A task types
    A2ATaskStatus,
    A2ATaskPriority,
    A2AAgentInfo,
    CreateA2ATaskRequest,
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
    /** Repository for A2A tasks. */
    a2aTaskRepository: IA2ATaskRepository;
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
     * 1.  **Initiation & Config:** Loads thread configuration and resolves system prompt
     * 2.  **Data Gathering:** Gathers history, available tools
     * 3.  **Planning:** LLM call for planning and parsing
     * 4.  **A2A Discovery & Delegation:** Identifies and delegates A2A tasks to remote agents
     * 5.  **Tool Execution:** Executes identified local tool calls
     * 6.  **Synthesis:** LLM call for final response generation including A2A results
     * 7.  **Finalization:** Saves messages and cleanup
     *
     * @param {AgentProps} props - The input properties containing the user query, threadId, userId, traceId, etc.
     * @returns {Promise<AgentFinalResponse>} A promise resolving to the final response, including the AI message and execution metadata.
     * @throws {ARTError} If a critical error occurs that prevents the agent from completing the process.
     */
    async process(props: AgentProps): Promise<AgentFinalResponse> {
        const startTime = Date.now();
        const traceId = props.traceId ?? generateUUID();
        let status: ExecutionMetadata['status'] = 'success';
        let errorMessage: string | undefined;
        let llmCalls = 0;
        let toolCallsCount = 0;
        let finalAiMessage: ConversationMessage | undefined;
        let aggregatedLlmMetadata: LLMMetadata | undefined = undefined;

        try {
            // Stage 1: Load configuration and resolve system prompt
            const { threadContext, systemPrompt, runtimeProviderConfig } = await this._loadConfiguration(props, traceId);

            // Stage 2: Gather context data
            const history = await this._gatherHistory(props.threadId, threadContext);
            const availableTools = await this._gatherTools(props.threadId);

            // Stage 3: Perform planning
            const { planningOutput, planningMetadata } = await this._performPlanning(
                props, systemPrompt, history, availableTools, runtimeProviderConfig, traceId
            );
            llmCalls++;
            if (planningMetadata) {
                aggregatedLlmMetadata = { ...(aggregatedLlmMetadata ?? {}), ...planningMetadata };
            }

            // Stage 4: Perform A2A discovery and delegation
            const a2aTasks = await this._performDiscoveryAndDelegation(
                planningOutput, props.threadId, traceId
            );

            // Stage 5: Execute local tools
            const toolResults = await this._executeLocalTools(
                planningOutput.toolCalls, props.threadId, traceId
            );
            toolCallsCount = toolResults.length;
            if (toolResults.some(r => r.status === 'error')) {
                status = 'partial';
                Logger.warn(`[${traceId}] Partial success in tool execution.`);
                errorMessage = 'Tool execution errors occurred.';
            }

            // Stage 6: Perform synthesis
            const { finalResponseContent, synthesisMetadata } = await this._performSynthesis(
                props, systemPrompt, history, planningOutput, toolResults, a2aTasks, runtimeProviderConfig, traceId
            );
            llmCalls++;
            if (synthesisMetadata) {
                aggregatedLlmMetadata = { ...(aggregatedLlmMetadata ?? {}), ...synthesisMetadata };
            }

            // Stage 7: Finalization
            finalAiMessage = await this._finalize(props, finalResponseContent, traceId);

        } catch (error: any) {
            Logger.error(`[${traceId}] PESAgent process error:`, error);
            status = status === 'partial' ? 'partial' : 'error';
            errorMessage = errorMessage ?? (error instanceof ARTError ? error.message : 'An unexpected error occurred.');
            if (status === 'error') finalAiMessage = undefined;

            // Record top-level error if not already recorded in specific phases
            if (!(error instanceof ARTError && (
                error.code === ErrorCode.PLANNING_FAILED ||
                error.code === ErrorCode.TOOL_EXECUTION_FAILED ||
                error.code === ErrorCode.SYNTHESIS_FAILED
            ))) {
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.ERROR, 
                    content: { phase: 'agent_process', error: error.message, stack: error.stack }, 
                    metadata: { timestamp: Date.now() }
                }).catch(err => Logger.error(`[${traceId}] Failed to record top-level error observation:`, err));
            }
        } finally {
            // Ensure state is saved even if errors occurred
            try {
                await this.deps.stateManager.saveStateIfModified(props.threadId);
            } catch(saveError: any) {
                Logger.error(`[${traceId}] Failed to save state during finalization:`, saveError);
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
            toolCalls: toolCallsCount,
            error: errorMessage,
            llmMetadata: aggregatedLlmMetadata,
        };

        if (!finalAiMessage && status !== 'success') {
            finalAiMessage = {
                messageId: generateUUID(),
                threadId: props.threadId,
                role: MessageRole.AI,
                content: errorMessage ?? "Agent execution failed.",
                timestamp: Date.now(),
                metadata: { traceId, error: true }
            };
        } else if (!finalAiMessage) {
            throw new ARTError("Agent finished with success status but no final message was generated.", ErrorCode.UNKNOWN_ERROR);
        }

        return {
            response: finalAiMessage,
            metadata: metadata,
        };
    }

    /**
     * Loads thread configuration and resolves the system prompt hierarchy.
     * @private
     */
    private async _loadConfiguration(props: AgentProps, traceId: string) {
        Logger.debug(`[${traceId}] Stage 1: Initiation & Config`);
        
        const threadContext = await this.deps.stateManager.loadThreadContext(props.threadId, props.userId);
        if (!threadContext) {
            throw new ARTError(`Thread context not found for threadId: ${props.threadId}`, ErrorCode.THREAD_NOT_FOUND);
        }

        // Resolve system prompt based on hierarchy
        const agentInternalBaseSystemPrompt = this.defaultSystemPrompt;
        let customSystemPromptPart: string | undefined = undefined;

        // Check Call-level (AgentProps.options.systemPrompt)
        if (props.options?.systemPrompt) {
            customSystemPromptPart = props.options.systemPrompt;
            Logger.debug(`[${traceId}] Using Call-level custom system prompt.`);
        }
        // Else, check Thread-level (ThreadConfig.systemPrompt)
        else {
            const threadSystemPrompt = await this.deps.stateManager.getThreadConfigValue<string>(props.threadId, 'systemPrompt');
            if (threadSystemPrompt) {
                customSystemPromptPart = threadSystemPrompt;
                Logger.debug(`[${traceId}] Using Thread-level custom system prompt.`);
            }
            // Else, check Instance-level
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

        // Determine RuntimeProviderConfig
        const runtimeProviderConfig: RuntimeProviderConfig | undefined =
            props.options?.providerConfig || threadContext.config.providerConfig;

        if (!runtimeProviderConfig) {
             throw new ARTError(`RuntimeProviderConfig is missing in AgentProps.options or ThreadConfig for threadId: ${props.threadId}`, ErrorCode.INVALID_CONFIG);
        }

        return { threadContext, systemPrompt: finalSystemPrompt, runtimeProviderConfig };
    }

    /**
     * Gathers conversation history for the current thread.
     * @private
     */
    private async _gatherHistory(threadId: string, threadContext: any) {
        Logger.debug(`[${threadContext.threadId || threadId}] Stage 2: Gathering History`);
        
        const historyOptions = { limit: threadContext.config.historyLimit };
        const rawHistory = await this.deps.conversationManager.getMessages(threadId, historyOptions);
        return this.formatHistoryForPrompt(rawHistory);
    }

    /**
     * Gathers available tools for the current thread.
     * @private
     */
    private async _gatherTools(threadId: string) {
        Logger.debug(`[${threadId}] Stage 2: Gathering Tools`);
        return await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: threadId });
    }

    /**
     * Performs the planning phase including LLM call and output parsing.
     * @private
     */
    private async _performPlanning(
        props: AgentProps, 
        systemPrompt: string, 
        formattedHistory: ArtStandardPrompt, 
        availableTools: any[], 
        runtimeProviderConfig: RuntimeProviderConfig,
        traceId: string
    ) {
        Logger.debug(`[${traceId}] Stage 3: Planning Prompt Construction`);
        
        // Construct planning prompt
        let planningPrompt: ArtStandardPrompt;
        try {
            planningPrompt = [
                { role: 'system', content: systemPrompt },
                ...formattedHistory,
                {
                    role: 'user',
                    content: `User Query: ${props.query}\n\nAvailable Tools:\n${
                        availableTools.length > 0
                        ? availableTools.map(tool => `- ${tool.name}: ${tool.description}\n  Input Schema: ${JSON.stringify(tool.inputSchema)}`).join('\n')
                        : 'No tools available.'
                    }\n\nBased on the user query and conversation history, identify the user's intent and create a plan to fulfill it using the available tools if necessary.\nRespond in the following format:\nIntent: [Briefly describe the user's goal]\nPlan: [Provide a step-by-step plan. If tools are needed, list them clearly.]\nTool Calls: [Output *only* the JSON array of tool calls required by the assistant, matching the ArtStandardMessage tool_calls format: [{\\"id\\": \\"call_abc123\\", \\"type\\": \\"function\\", \\"function\\": {\\"name\\": \\"tool_name\\", \\"arguments\\": \\"{\\\\\\"arg1\\\\\\": \\\\\\"value1\\\\\\"}\\"}}] or [] if no tools are needed. Do not add any other text in this section.]`
                }
            ];
        } catch (err: any) {
            Logger.error(`[${traceId}] Failed to construct planning prompt object:`, err);
            throw new ARTError(`Failed to construct planning prompt object: ${err.message}`, ErrorCode.PROMPT_ASSEMBLY_FAILED, err);
        }

        Logger.debug(`[${traceId}] Stage 3b: Planning LLM Call`);
        
        const planningOptions: CallOptions = {
            threadId: props.threadId,
            traceId: traceId,
            userId: props.userId,
            sessionId: props.sessionId,
            stream: true,
            callContext: 'AGENT_THOUGHT',
            requiredCapabilities: [ModelCapability.REASONING],
            providerConfig: runtimeProviderConfig,
            ...(props.options?.llmParams ?? {}),
        };

        let planningOutputText: string = '';
        let parsedPlanningOutput: { intent?: string; plan?: string; toolCalls?: ParsedToolCall[] } = {};
        let planningStreamError: Error | null = null;
        let planningMetadata: LLMMetadata | undefined = undefined;

        try {
            // Record PLAN observation before making the call
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId: traceId, type: ObservationType.PLAN, 
                content: { message: "Preparing for planning LLM call." }, 
                metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record PLAN observation:`, err));

            const planningStream = await this.deps.reasoningEngine.call(planningPrompt, planningOptions);

            // Record stream start
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_START, 
                content: { phase: 'planning' }, metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_START observation:`, err));

            // Consume the stream
            for await (const event of planningStream) {
                this.deps.uiSystem.getLLMStreamSocket().notify(event, { 
                    targetThreadId: event.threadId, targetSessionId: event.sessionId 
                });

                switch (event.type) {
                    case 'TOKEN':
                        planningOutputText += event.data;
                        break;
                    case 'METADATA':
                        await this.deps.observationManager.record({
                            threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_METADATA, 
                            content: event.data, metadata: { phase: 'planning', timestamp: Date.now() }
                        }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_METADATA observation:`, err));
                        planningMetadata = { ...(planningMetadata ?? {}), ...event.data };
                        break;
                    case 'ERROR':
                        planningStreamError = event.data instanceof Error ? event.data : new Error(String(event.data));
                        Logger.error(`[${traceId}] Planning Stream Error:`, planningStreamError);
                        await this.deps.observationManager.record({
                            threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_ERROR, 
                            content: { phase: 'planning', error: planningStreamError.message, stack: planningStreamError.stack }, 
                            metadata: { timestamp: Date.now() }
                        }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_ERROR observation:`, err));
                        break;
                    case 'END':
                        await this.deps.observationManager.record({
                            threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_END, 
                            content: { phase: 'planning' }, metadata: { timestamp: Date.now() }
                        }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_END observation:`, err));
                        break;
                }
                if (planningStreamError) break;
            }

            if (planningStreamError) {
                throw new ARTError(`Planning phase stream error: ${planningStreamError.message}`, ErrorCode.PLANNING_FAILED, planningStreamError);
            }

            // Parse the accumulated output
            parsedPlanningOutput = await this.deps.outputParser.parsePlanningOutput(planningOutputText);

            // Record observations
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId, type: ObservationType.INTENT, 
                content: { intent: parsedPlanningOutput.intent }, metadata: { timestamp: Date.now() }
            });
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId, type: ObservationType.PLAN, 
                content: { plan: parsedPlanningOutput.plan, rawOutput: planningOutputText }, 
                metadata: { timestamp: Date.now() }
            });
            if (parsedPlanningOutput.toolCalls && parsedPlanningOutput.toolCalls.length > 0) {
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.TOOL_CALL, 
                    content: { toolCalls: parsedPlanningOutput.toolCalls }, 
                    metadata: { timestamp: Date.now() }
                });
            }

        } catch (err: any) {
            const errorMessage = `Planning phase failed: ${err.message}`;
            Logger.error(`[${traceId}] Planning Error:`, err);
            if (!planningStreamError) {
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.ERROR, 
                    content: { phase: 'planning', error: err.message, stack: err.stack }, 
                    metadata: { timestamp: Date.now() }
                });
            }
            throw err instanceof ARTError ? err : new ARTError(errorMessage, ErrorCode.PLANNING_FAILED, err);
        }

        return { planningOutput: parsedPlanningOutput, planningMetadata };
    }

    /**
     * Performs A2A task discovery and delegation.
     * Extracts A2A tasks from planning output, discovers available agents, and delegates tasks.
     * @private
     */
    private async _performDiscoveryAndDelegation(
        planningOutput: any,
        threadId: string,
        traceId: string
    ): Promise<A2ATask[]> {
        Logger.debug(`[${traceId}] Stage 4: A2A Discovery and Delegation`);
        
        try {
            // Step 1: Extract A2A tasks from planning output
            const extractedA2ATasks = this._extractA2ATasksFromPlan(planningOutput, threadId, traceId);
            
            if (extractedA2ATasks.length === 0) {
                Logger.debug(`[${traceId}] No A2A tasks identified in planning output`);
                return [];
            }
            
            Logger.debug(`[${traceId}] Extracted ${extractedA2ATasks.length} A2A task(s) from planning output`);
            
            // Step 2: Create AgentDiscoveryService instance
            const discoveryService = new (await import('../../systems/a2a/AgentDiscoveryService')).AgentDiscoveryService({
                discoveryEndpoint: 'http://localhost:4200/api/services', // TODO: Make configurable
                timeoutMs: 10000
            });
            
            // Step 3: Create TaskDelegationService instance
            const delegationService = new (await import('../../systems/a2a/TaskDelegationService')).TaskDelegationService(
                discoveryService,
                this.deps.a2aTaskRepository,
                {
                    defaultTimeoutMs: 30000,
                    maxRetries: 2,
                    retryDelayMs: 1000,
                    useExponentialBackoff: true
                }
            );
            
            // Step 4: Delegate tasks to suitable remote agents
            const delegatedTasks = await delegationService.delegateTasks(extractedA2ATasks, traceId);
            
            if (delegatedTasks.length > 0) {
                Logger.info(`[${traceId}] Successfully delegated ${delegatedTasks.length}/${extractedA2ATasks.length} A2A task(s)`);
                
                // Record successful delegation observation
                await this.deps.observationManager.record({
                    threadId: threadId,
                    traceId: traceId,
                    type: ObservationType.TOOL_CALL, // Using TOOL_CALL as closest equivalent for A2A delegation
                    content: {
                        phase: 'a2a_delegation',
                        totalExtracted: extractedA2ATasks.length,
                        successfullyDelegated: delegatedTasks.length,
                        taskIds: delegatedTasks.map(t => t.taskId),
                        targetAgents: delegatedTasks.map(t => t.targetAgent?.agentName).filter(Boolean)
                    },
                    metadata: { timestamp: Date.now() }
                });
            } else {
                Logger.warn(`[${traceId}] No A2A tasks were successfully delegated`);
            }
            
            return delegatedTasks;
            
        } catch (err: any) {
            const errorMessage = `A2A discovery and delegation failed: ${err.message}`;
            Logger.error(`[${traceId}] A2A Discovery Error:`, err);
            await this.deps.observationManager.record({
                threadId: threadId, traceId, type: ObservationType.ERROR, 
                content: { phase: 'a2a_discovery', error: err.message, stack: err.stack }, 
                metadata: { timestamp: Date.now() }
            });
            // Don't fail the entire process for A2A errors - just log and continue
            return [];
        }
    }

    /**
     * Extracts A2A task opportunities from the planning output.
     * Looks for specific patterns or keywords that indicate tasks suitable for delegation.
     * @private
     */
    private _extractA2ATasksFromPlan(
        planningOutput: any,
        threadId: string,
        traceId: string
    ): A2ATask[] {
        const extractedTasks: A2ATask[] = [];
        
        if (!planningOutput || !planningOutput.plan) {
            Logger.debug(`[${traceId}] No plan content available for A2A extraction`);
            return extractedTasks;
        }
        
        const planText = planningOutput.plan.toLowerCase();
        const intentText = (planningOutput.intent || '').toLowerCase();
        const fullPlanningText = `${intentText} ${planText}`;
        
        // Define A2A task patterns and their corresponding task types
        const a2aPatterns = [
            {
                keywords: ['analyze', 'analysis', 'examine', 'investigate', 'study', 'research'],
                taskType: 'analysis',
                description: 'Data analysis or research task'
            },
            {
                keywords: ['summarize', 'summary', 'synthesize', 'consolidate', 'compile'],
                taskType: 'synthesis',
                description: 'Content synthesis or summarization task'
            },
            {
                keywords: ['transform', 'convert', 'translate', 'format', 'restructure'],
                taskType: 'transformation',
                description: 'Data transformation or conversion task'
            },
            {
                keywords: ['calculate', 'compute', 'process', 'crunch', 'mathematical'],
                taskType: 'computation',
                description: 'Mathematical or computational task'
            },
            {
                keywords: ['generate', 'create', 'produce', 'build', 'construct'],
                taskType: 'generation',
                description: 'Content or artifact generation task'
            },
            {
                keywords: ['validate', 'verify', 'check', 'review', 'audit'],
                taskType: 'validation',
                description: 'Validation or verification task'
            }
        ];
        
        // Check for explicit A2A delegation markers
        const explicitA2AMarkers = [
            'delegate to',
            'assign to agent',
            'remote agent',
            'a2a task',
            'agent-to-agent',
            'external agent'
        ];
        
        let hasExplicitA2AMarker = false;
        for (const marker of explicitA2AMarkers) {
            if (fullPlanningText.includes(marker)) {
                hasExplicitA2AMarker = true;
                Logger.debug(`[${traceId}] Found explicit A2A marker: "${marker}"`);
                break;
            }
        }
        
        // Extract tasks based on patterns
        for (const pattern of a2aPatterns) {
            const matchedKeywords = pattern.keywords.filter(keyword => 
                fullPlanningText.includes(keyword)
            );
            
            if (matchedKeywords.length > 0 || hasExplicitA2AMarker) {
                // Create A2A task
                const taskId = generateUUID();
                const now = Date.now();
                
                const a2aTask: A2ATask = {
                    taskId,
                    status: A2ATaskStatus.PENDING,
                    payload: {
                        taskType: pattern.taskType,
                        input: {
                            originalQuery: planningOutput.intent || '',
                            planContext: planningOutput.plan || '',
                            matchedKeywords: matchedKeywords,
                            extractionReason: hasExplicitA2AMarker ? 'explicit_marker' : 'keyword_match'
                        },
                        instructions: `${pattern.description} based on the planning context`,
                        parameters: {
                            threadId: threadId,
                            traceId: traceId,
                            extractedAt: now
                        }
                    },
                    sourceAgent: {
                        agentId: 'pes-agent',
                        agentName: 'PES Agent',
                        agentType: 'reasoning',
                        capabilities: ['planning', 'execution', 'synthesis']
                    },
                    priority: hasExplicitA2AMarker ? A2ATaskPriority.HIGH : A2ATaskPriority.MEDIUM,
                    metadata: {
                        createdAt: now,
                        updatedAt: now,
                        initiatedBy: threadId,
                        correlationId: traceId,
                        retryCount: 0,
                        maxRetries: 3,
                        timeoutMs: 30000, // 30 seconds timeout
                        tags: ['extracted', pattern.taskType]
                    }
                };
                
                extractedTasks.push(a2aTask);
                
                Logger.debug(`[${traceId}] Extracted A2A task: ${pattern.taskType} (keywords: ${matchedKeywords.join(', ')})`);
                
                // For now, only extract one task per pattern to avoid overwhelming
                break;
            }
        }
        
        // Record observation for extracted tasks
        if (extractedTasks.length > 0) {
            this.deps.observationManager.record({
                threadId: threadId,
                traceId: traceId,
                type: ObservationType.PLAN, // Using PLAN type as it's related to planning phase
                content: {
                    phase: 'a2a_extraction',
                    extractedTaskCount: extractedTasks.length,
                    taskTypes: extractedTasks.map(t => t.payload.taskType),
                    hasExplicitMarker: hasExplicitA2AMarker
                },
                metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record A2A extraction observation:`, err));
        }
        
        return extractedTasks;
    }

    /**
     * Executes local tools identified during planning.
     * @private
     */
    private async _executeLocalTools(toolCalls: ParsedToolCall[] | undefined, threadId: string, traceId: string): Promise<ToolResult[]> {
        if (!toolCalls || toolCalls.length === 0) {
            Logger.debug(`[${traceId}] Stage 4: Tool Execution (No tool calls)`);
            return [];
        }

        Logger.debug(`[${traceId}] Stage 4: Tool Execution (${toolCalls.length} calls)`);
        try {
            return await this.deps.toolSystem.executeTools(toolCalls, threadId, traceId);
        } catch (err: any) {
            const errorMessage = `Tool execution phase failed: ${err.message}`;
            Logger.error(`[${traceId}] Tool Execution System Error:`, err);
            await this.deps.observationManager.record({
                threadId: threadId, traceId, type: ObservationType.ERROR, 
                content: { phase: 'tool_execution', error: err.message, stack: err.stack }, 
                metadata: { timestamp: Date.now() }
            });
            throw new ARTError(errorMessage, ErrorCode.TOOL_EXECUTION_FAILED, err);
        }
    }

    /**
     * Performs the synthesis phase including LLM call for final response generation.
     * @private
     */
    private async _performSynthesis(
        props: AgentProps, 
        systemPrompt: string, 
        formattedHistory: ArtStandardPrompt, 
        planningOutput: any, 
        toolResults: ToolResult[], 
        a2aTasks: A2ATask[],
        runtimeProviderConfig: RuntimeProviderConfig,
        traceId: string
    ) {
        Logger.debug(`[${traceId}] Stage 6: Synthesis Call`);
        
        // Record SYNTHESIS observation before making the call
        await this.deps.observationManager.record({
            threadId: props.threadId, traceId: traceId, type: ObservationType.SYNTHESIS, 
            content: { message: "Preparing for synthesis LLM call." }, 
            metadata: { timestamp: Date.now() }
        }).catch(err => Logger.error(`[${traceId}] Failed to record SYNTHESIS observation:`, err));

        // Construct synthesis prompt
        let synthesisPrompt: ArtStandardPrompt;
        try {
            synthesisPrompt = [
                { role: 'system', content: systemPrompt },
                ...formattedHistory,
                {
                    role: 'user',
                    content: `User Query: ${props.query}\n\nOriginal Intent: ${planningOutput.intent ?? ''}\nExecution Plan: ${planningOutput.plan ?? ''}\n\nTool Execution Results:\n${
                        toolResults.length > 0
                        ? toolResults.map(result => `- Tool: ${result.toolName} (Call ID: ${result.callId})\n  Status: ${result.status}\n  ${result.status === 'success' ? `Output: ${JSON.stringify(result.output)}` : ''}\n  ${result.status === 'error' ? `Error: ${result.error ?? 'Unknown error'}` : ''}`).join('\n')
                        : 'No tools were executed.'
                    }\n\nA2A Task Results:\n${
                        a2aTasks.length > 0
                        ? a2aTasks.map(task => `- Task: ${task.payload.taskType} (ID: ${task.taskId})\n  Status: ${task.status}\n  ${task.result?.success ? `Output: ${JSON.stringify(task.result.data)}` : ''}\n  ${task.result?.success === false ? `Error: ${task.result.error ?? 'Unknown error'}` : ''}`).join('\n')
                        : 'No A2A tasks were delegated.'
                    }\n\nBased on the user query, the plan, and the results of any tool executions and A2A task delegations, synthesize a final response to the user.\nIf the tools or A2A tasks failed or provided unexpected results, explain the issue and try to answer based on available information or ask for clarification.`
                }
            ];
        } catch (err: any) {
            Logger.error(`[${traceId}] Failed to construct synthesis prompt object:`, err);
            throw new ARTError(`Failed to construct synthesis prompt object: ${err.message}`, ErrorCode.PROMPT_ASSEMBLY_FAILED, err);
        }

        Logger.debug(`[${traceId}] Stage 6b: Synthesis LLM Call`);
        
        const synthesisOptions: CallOptions = {
            threadId: props.threadId,
            traceId: traceId,
            userId: props.userId,
            sessionId: props.sessionId,
            stream: true,
            callContext: 'FINAL_SYNTHESIS',
            requiredCapabilities: [ModelCapability.TEXT],
            providerConfig: runtimeProviderConfig,
            ...(props.options?.llmParams ?? {}),
        };

        let finalResponseContent: string = '';
        let synthesisStreamError: Error | null = null;
        let synthesisMetadata: LLMMetadata | undefined = undefined;

        try {
            const synthesisStream = await this.deps.reasoningEngine.call(synthesisPrompt, synthesisOptions);

            // Record stream start
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_START, 
                content: { phase: 'synthesis' }, metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_START observation:`, err));

            // Consume the stream
            for await (const event of synthesisStream) {
                this.deps.uiSystem.getLLMStreamSocket().notify(event, { 
                    targetThreadId: event.threadId, targetSessionId: event.sessionId 
                });

                switch (event.type) {
                    case 'TOKEN':
                        if (event.tokenType === 'FINAL_SYNTHESIS_LLM_RESPONSE' || event.tokenType === 'LLM_RESPONSE') {
                            finalResponseContent += event.data;
                        }
                        break;
                    case 'METADATA':
                        synthesisMetadata = { ...(synthesisMetadata ?? {}), ...event.data };
                        await this.deps.observationManager.record({
                            threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_METADATA, 
                            content: event.data, metadata: { phase: 'synthesis', timestamp: Date.now() }
                        }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_METADATA observation:`, err));
                        break;
                    case 'ERROR':
                        synthesisStreamError = event.data instanceof Error ? event.data : new Error(String(event.data));
                        Logger.error(`[${traceId}] Synthesis Stream Error:`, synthesisStreamError);
                        await this.deps.observationManager.record({
                            threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_ERROR, 
                            content: { phase: 'synthesis', error: synthesisStreamError.message, stack: synthesisStreamError.stack }, 
                            metadata: { timestamp: Date.now() }
                        }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_ERROR observation:`, err));
                        break;
                    case 'END':
                        await this.deps.observationManager.record({
                            threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_END, 
                            content: { phase: 'synthesis' }, metadata: { timestamp: Date.now() }
                        }).catch(err => Logger.error(`[${traceId}] Failed to record LLM_STREAM_END observation:`, err));
                        break;
                }
                if (synthesisStreamError) break;
            }

            if (synthesisStreamError) {
                throw new ARTError(`Synthesis stream error: ${synthesisStreamError.message}`, ErrorCode.SYNTHESIS_FAILED, synthesisStreamError);
            }

        } catch (err: any) {
            const synthesisErrorMessage = `Synthesis phase failed: ${err.message}`;
            Logger.error(`[${traceId}] Synthesis Error:`, err);
            if (!synthesisStreamError) {
                await this.deps.observationManager.record({
                    threadId: props.threadId, traceId, type: ObservationType.ERROR, 
                    content: { phase: 'synthesis', error: err.message, stack: err.stack }, 
                    metadata: { timestamp: Date.now() }
                });
            }
            throw err instanceof ARTError ? err : new ARTError(synthesisErrorMessage, ErrorCode.SYNTHESIS_FAILED, err);
        }

        return { finalResponseContent, synthesisMetadata };
    }

    /**
     * Finalizes the agent execution by saving the final message and performing cleanup.
     * @private
     */
    private async _finalize(props: AgentProps, finalResponseContent: string, traceId: string): Promise<ConversationMessage> {
        Logger.debug(`[${traceId}] Stage 7: Finalization`);
        
        const finalTimestamp = Date.now();
        const finalAiMessage: ConversationMessage = {
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

        return finalAiMessage;
    }

    /**
     * Formats conversation history messages for direct inclusion in ArtStandardPrompt.
     * Converts internal MessageRole to ArtStandardMessageRole.
     * @param history - Array of ConversationMessage objects.
     * @returns Array of messages suitable for ArtStandardPrompt.
     */
    private formatHistoryForPrompt(history: ConversationMessage[]): ArtStandardPrompt {
        return history.map((msg) => {
            let role: ArtStandardMessageRole;
            switch (msg.role) {
                case MessageRole.USER:
                    role = 'user';
                    break;
                case MessageRole.AI:
                    role = 'assistant';
                    break;
                case MessageRole.SYSTEM:
                    role = 'system';
                    break;
                case MessageRole.TOOL:
                    role = 'tool';
                    break;
                default:
                    Logger.warn(`Unhandled message role '${msg.role}' in formatHistoryForPrompt. Defaulting to 'user'.`);
                    role = 'user';
            }
            return {
                role: role,
                content: msg.content,
            };
        }).filter(msg => msg.content);
    }
}
