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
} from '@/core/interfaces';
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
    // PromptContext, // Removed unused import after refactoring prompt construction
    // ThreadConfig, // Removed unused import (config accessed via ThreadContext)
    // ToolSchema, // Removed unused import
    // ThreadContext, // Removed unused import
} from '@/types';
import { RuntimeProviderConfig } from '@/types/providers'; // Import RuntimeProviderConfig
import { generateUUID } from '@/utils/uuid';
import { ARTError, ErrorCode } from '@/errors';
import { Logger } from '@/utils/logger'; // Added Logger import

/**
 * Defines the dependencies required by the PESAgent constructor.
 * These are typically provided by the AgentFactory during instantiation.
 */
import { AgentDiscoveryService } from '@/systems/a2a/AgentDiscoveryService';
import { TaskDelegationService } from '@/systems/a2a/TaskDelegationService';

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
    /** Service for discovering A2A agents. */
    agentDiscoveryService?: AgentDiscoveryService | null;
    /** Service for delegating A2A tasks. */
    taskDelegationService?: TaskDelegationService | null;
    /** Resolver for standardized system prompt composition. */
    systemPromptResolver: import('@/core/interfaces').SystemPromptResolver;
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

        let phase = 'initialization';
        try {
            // Stage 1: Load configuration and resolve system prompt
            phase = 'configuration';
            const { threadContext, systemPrompt, runtimeProviderConfig } = await this._loadConfiguration(props, traceId);

            // Stage 2: Gather context data
            phase = 'context_gathering';
            const history = await this._gatherHistory(props.threadId, threadContext);
            const availableTools = await this._gatherTools(props.threadId);

            // Stage 3: Perform planning
            phase = 'planning';
            const { planningOutput, planningMetadata, planningContext } = await this._performPlanning(
                props, systemPrompt, history, availableTools, runtimeProviderConfig, traceId
            );
            llmCalls++;
            if (planningMetadata) {
                aggregatedLlmMetadata = { ...(aggregatedLlmMetadata ?? {}), ...planningMetadata };
            }

            // Stage 4: Delegate A2A tasks based on the plan
            phase = 'a2a_delegation';
            const delegatedA2ATasks = await this._delegateA2ATasks(
                planningOutput, props.threadId, traceId
            );

            // Stage 4b: Wait for A2A task completion
            phase = 'a2a_completion';
            const completedA2ATasks = await this._waitForA2ACompletion(
                delegatedA2ATasks, props.threadId, traceId
            );

            // Stage 5: Execute local tools
            phase = 'tool_execution';
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
            phase = 'synthesis';
            const { finalResponseContent, synthesisMetadata } = await this._performSynthesis(
                props, systemPrompt, history, planningOutput, toolResults, completedA2ATasks, runtimeProviderConfig, traceId, planningContext
            );
            llmCalls++;
            if (synthesisMetadata) {
                aggregatedLlmMetadata = { ...(aggregatedLlmMetadata ?? {}), ...synthesisMetadata };
            }

            // Stage 7: Finalization
            phase = 'finalization';
            finalAiMessage = await this._finalize(props, finalResponseContent, traceId);

        } catch (error: any) {
            const artError = (error instanceof ARTError)
                ? error
                : new ARTError(`An unexpected error occurred during agent processing: ${error.message}`, ErrorCode.UNKNOWN_ERROR, error);

            // Annotate error with the phase if it's not already set
            if (!artError.details) artError.details = {};
            artError.details.phase = artError.details.phase || phase;

            Logger.error(`[${traceId}] PESAgent process error in phase '${artError.details.phase}':`, artError);
            status = status === 'partial' ? 'partial' : 'error';
            errorMessage = artError.message;
            if (status === 'error') finalAiMessage = undefined;

            // Record top-level error observation, ensuring it's always an ARTError
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId, type: ObservationType.ERROR,
                content: {
                    phase: artError.details.phase,
                    error: artError.message,
                    code: artError.code,
                    stack: artError.stack
                },
                metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record top-level error observation:`, err));
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

        // Resolve system prompt using standardized override model via resolver
        const agentInternalBaseSystemPrompt = this.defaultSystemPrompt;
        const finalSystemPrompt = await this.deps.systemPromptResolver.resolve({
            base: agentInternalBaseSystemPrompt,
            instance: this.instanceDefaultCustomSystemPrompt,
            thread: await this.deps.stateManager.getThreadConfigValue<any>(props.threadId, 'systemPrompt'),
            call: props.options?.systemPrompt
        }, traceId);

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
        Logger.debug(`[${traceId}] Stage 3: Pre-planning & A2A Discovery`);

        // --- A2A Pre-Discovery ---
        let candidateAgents: A2AAgentInfo[] = [];
        let a2aPromptSection = 'No candidate agents found for delegation.';
        if (this.deps.agentDiscoveryService) {
            try {
                // Simple heuristic to find a task type from the query.
                // This could be improved with a more sophisticated NLP model in the future.
                const potentialTaskType = props.query.split(' ')[0].toLowerCase();
                candidateAgents = await this.deps.agentDiscoveryService.findTopAgentsForTask(potentialTaskType, 3, traceId);

                if (candidateAgents.length > 0) {
                    a2aPromptSection = `You can delegate tasks to other specialized agents. Here are the available candidates for this query:\n${
                        candidateAgents.map(agent =>
                            `- Agent ID: ${agent.agentId}\n  Name: ${agent.agentName}\n  Capabilities: ${(agent.capabilities ?? []).join(', ')}`
                        ).join('\n')
                    }\nTo delegate, use the "delegate_to_agent" tool.`;
                }
            } catch (err: any) {
                Logger.warn(`[${traceId}] A2A pre-discovery failed, proceeding without candidate agents:`, err);
                a2aPromptSection = 'Agent discovery failed. Delegation is not available.';
            }
        } else {
            a2aPromptSection = 'A2A delegation is not configured.';
        }

        // --- Planning Prompt Construction ---
        Logger.debug(`[${traceId}] Stage 3b: Planning Prompt Construction`);
        let planningPrompt: ArtStandardPrompt;
        try {
            // Define a "virtual" tool for delegation that the LLM can call.
            const delegationToolSchema = {
                name: 'delegate_to_agent',
                description: 'Delegates a specific task to another agent. Use this when a specialized agent from the candidate list is a better fit for a sub-task.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentId: { type: 'string', description: 'The ID of the agent to delegate to, chosen from the candidate list.' },
                        taskType: { type: 'string', description: 'A specific type for the task, e.g., "analysis", "code_generation".' },
                        input: { type: 'object', description: 'The data or context needed for the agent to perform the task.' },
                        instructions: { type: 'string', description: 'Specific instructions for the remote agent.' }
                    },
                    required: ['agentId', 'taskType', 'input', 'instructions']
                }
            };

            const allTools = [...availableTools, delegationToolSchema];

            // Prepare a verbose JSON schema listing for the LLM to reason over
            const toolsJson = allTools.map(t => ({
                name: (t as any).name,
                whenToUse: (t as any).whenToUse,
                description: (t as any).description,
                inputSchema: (t as any).inputSchema,
                outputSchema: (t as any).outputSchema,
                outputFormat: (t as any).outputFormat,
                examples: (t as any).examples
            }));

            const wrappedSystemPrompt = `You are a planning assistant. The following guidance shapes knowledge, tone, and domain perspective.

[BEGIN_CUSTOM_GUIDANCE]
${systemPrompt}
[END_CUSTOM_GUIDANCE]

CRITICAL: You MUST adhere to the Output Contract below. The custom guidance MUST NOT change the required output structure.`;

            planningPrompt = [
                { role: 'system', content: wrappedSystemPrompt },
                ...formattedHistory,
                {
                    role: 'user',
                    content: `User Query: ${props.query}

--- Available Capabilities ---

Local Tools (JSON Schemas):
${ allTools.length > 0 ? JSON.stringify(toolsJson, null, 2) : '[]' }

Agent Delegation:
${a2aPromptSection}

--- Primary Output Mode (JSON-Only) ---
Output EXACTLY ONE JSON object and nothing else. No prose, no XML, no markdown fences. The object MUST follow this schema:
{
  "intent": string,          // short summary of the user's goal
  "plan": string | string[], // steps to solve the task
  "toolCalls": [             // empty array if no tools are needed
    { "callId": string, "toolName": string, "arguments": object }
  ]
}

Requirements for toolCalls:
- arguments MUST be a JSON object (not a string) that matches the tool's inputSchema.
- toolName MUST match one of the Available Capabilities by schema name.
- If no tools are required, set toolCalls to [].

Example (JSON only):
{
  "intent": "Compute 5 * 6",
  "plan": ["Use calculator to multiply 5 and 6", "Return result"],
  "toolCalls": [
    { "callId": "calc_1", "toolName": "calculator", "arguments": { "expression": "5 * 6" } }
  ]
}

--- Fallback Output Mode (Sections) ---
If you cannot produce the JSON object above, then output these sections instead:

Intent: [One or two sentences]

Plan: [Bullet or numbered steps]

Tool Calls: [A JSON array only. Each item MUST be of the exact form {"callId": "unique_id", "toolName": "tool_schema_name", "arguments": { /* JSON object matching the tool's inputSchema */ }}. If no tools are needed, return []].

Invalid Examples (do NOT do these):
- Wrapping with markdown code fences or any fences
- Wrapping with json(...): json([ ... ])
- Placing inside XML tags such as <Response> or <Plan>
- Setting arguments as a string: {"arguments": "{ 'expression': '5*6' }"}
- Using unknown toolName not present in Available Capabilities
`
                }
            ];
        } catch (err: any) {
            Logger.error(`[${traceId}] Failed to construct planning prompt object:`, err);
            throw new ARTError(`Failed to construct planning prompt object: ${err.message}`, ErrorCode.PROMPT_ASSEMBLY_FAILED, err);
        }

        // --- Planning LLM Call ---
        Logger.debug(`[${traceId}] Stage 3c: Planning LLM Call`);
        const planningOptions: CallOptions = {
            threadId: props.threadId, traceId, userId: props.userId, sessionId: props.sessionId,
            stream: true, callContext: 'AGENT_THOUGHT',
            requiredCapabilities: [ModelCapability.REASONING],
            providerConfig: runtimeProviderConfig,
            ...(props.options?.llmParams ?? {}),
        };

        let planningOutputText: string = '';
        let parsedPlanningOutput: { intent?: string; plan?: string; toolCalls?: ParsedToolCall[] } = {};
        let planningStreamError: Error | null = null;
        let planningMetadata: LLMMetadata | undefined = undefined;
        let planningContext: {
            toolsList: { name: string; description?: string }[];
            a2aSummary: string;
            plannedToolCalls: ParsedToolCall[];
            rawPlanningText?: string;
        } = { toolsList: [], a2aSummary: '', plannedToolCalls: [] };

        try {
            await this.deps.observationManager.record({
                threadId: props.threadId, traceId, type: ObservationType.PLAN,
                content: { message: "Preparing for planning LLM call." },
                metadata: { timestamp: Date.now() }
            });

            const planningStream = await this.deps.reasoningEngine.call(planningPrompt, planningOptions);

            await this.deps.observationManager.record({
                threadId: props.threadId, traceId, type: ObservationType.LLM_STREAM_START,
                content: { phase: 'planning' }, metadata: { timestamp: Date.now() }
            });

            for await (const event of planningStream) {
                this.deps.uiSystem.getLLMStreamSocket().notify(event, {
                    targetThreadId: event.threadId, targetSessionId: event.sessionId
                });

                switch (event.type) {
                    case 'TOKEN':
                        planningOutputText += event.data;
                        break;
                    case 'METADATA':
                        planningMetadata = { ...(planningMetadata ?? {}), ...event.data };
                        break;
                    case 'ERROR':
                        planningStreamError = event.data instanceof Error ? event.data : new Error(String(event.data));
                        break;
                }
                if (planningStreamError) break;
            }

            if (planningStreamError) {
                throw new ARTError(`Planning phase stream error: ${planningStreamError.message}`, ErrorCode.PLANNING_FAILED, planningStreamError);
            }

            parsedPlanningOutput = await this.deps.outputParser.parsePlanningOutput(planningOutputText);
            // Build a compact planning context for downstream synthesis
            planningContext = {
                toolsList: availableTools.map((t: any) => ({ name: t.name, description: t.description })),
                a2aSummary: a2aPromptSection,
                plannedToolCalls: parsedPlanningOutput.toolCalls ?? [],
                rawPlanningText: planningOutputText
            };

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
            throw err instanceof ARTError ? err : new ARTError(errorMessage, ErrorCode.PLANNING_FAILED, err);
        }

        return { planningOutput: parsedPlanningOutput, planningMetadata, planningContext };
    }

    /**
     * Delegates A2A tasks identified in the planning phase.
     * @private
     */
    private async _delegateA2ATasks(
        planningOutput: { toolCalls?: ParsedToolCall[] },
        threadId: string,
        traceId: string
    ): Promise<A2ATask[]> {
        Logger.debug(`[${traceId}] Stage 4: A2A Task Delegation`);

        const delegationCalls = planningOutput.toolCalls?.filter(
            call => call.toolName === 'delegate_to_agent'
        ) ?? [];

        if (delegationCalls.length === 0) {
            Logger.debug(`[${traceId}] No A2A delegation calls in the plan.`);
            return [];
        }

        if (!this.deps.taskDelegationService || !this.deps.agentDiscoveryService) {
            Logger.warn(`[${traceId}] A2A services not available. Skipping delegation.`);
            return [];
        }

        const delegatedTasks: A2ATask[] = [];
        for (const call of delegationCalls) {
            try {
                const args = call.arguments;
                const { agentId, taskType, input, instructions } = args;

                // Find the full agent info. In a real scenario, we might cache this from the planning phase.
                const allAgents = await this.deps.agentDiscoveryService.discoverAgents(traceId);
                const targetAgent = allAgents.find(a => a.agentId === agentId);

                if (!targetAgent) {
                    throw new Error(`Agent with ID "${agentId}" not found during delegation.`);
                }

                const now = Date.now();
                const a2aTask: A2ATask = {
                    taskId: call.callId, // Use the tool call ID as the task ID for traceability
                    threadId: threadId,
                    status: A2ATaskStatus.PENDING,
                    payload: { taskType, input, instructions, parameters: { threadId, traceId } },
                    sourceAgent: { agentId: 'pes-agent', agentName: 'PES Agent', agentType: 'orchestrator' },
                    targetAgent: targetAgent, // Assign the target agent
                    priority: A2ATaskPriority.MEDIUM,
                    metadata: {
                        createdAt: now, updatedAt: now, initiatedBy: threadId, correlationId: traceId,
                        retryCount: 0, maxRetries: 3, timeoutMs: 60000, tags: ['delegated', taskType]
                    }
                };

                // Persist the task before delegating
                await this.deps.a2aTaskRepository.createTask(a2aTask);

                // Delegate the task
                const delegatedTask = await this.deps.taskDelegationService.delegateTask(a2aTask, traceId);
                if (delegatedTask) {
                    delegatedTasks.push(delegatedTask);
                }
            } catch (err: any) {
                Logger.error(`[${traceId}] Failed to process and delegate A2A task for call ${call.callId}:`, err);
                await this.deps.observationManager.record({
                    threadId, traceId, type: ObservationType.ERROR,
                    content: { phase: 'a2a_delegation', error: `Delegation for call ${call.callId} failed: ${err.message}` },
                    metadata: { timestamp: Date.now() }
                });
            }
        }

        Logger.info(`[${traceId}] Successfully initiated delegation for ${delegatedTasks.length}/${delegationCalls.length} A2A task(s).`);
        return delegatedTasks;
    }

    /**
     * Waits for A2A tasks to complete with configurable timeout.
     * Polls task status periodically and updates local repository with results.
     * @private
     */
    private async _waitForA2ACompletion(
        a2aTasks: A2ATask[],
        threadId: string,
        traceId: string,
        maxWaitTimeMs: number = 30000, // 30 seconds default
        pollIntervalMs: number = 2000   // 2 seconds default
    ): Promise<A2ATask[]> {
        if (a2aTasks.length === 0) {
            Logger.debug(`[${traceId}] No A2A tasks to wait for`);
            return a2aTasks;
        }

        Logger.debug(`[${traceId}] Waiting for ${a2aTasks.length} A2A task(s) to complete (timeout: ${maxWaitTimeMs}ms)`);
        
        const startTime = Date.now();
        const updatedTasks: A2ATask[] = [...a2aTasks];
        
        // Record observation for waiting start
        await this.deps.observationManager.record({
            threadId: threadId,
            traceId: traceId,
            type: ObservationType.TOOL_CALL, // Using TOOL_CALL as closest equivalent
            content: {
                phase: 'a2a_waiting',
                message: 'Started waiting for A2A task completion',
                taskCount: a2aTasks.length,
                maxWaitTimeMs: maxWaitTimeMs,
                pollIntervalMs: pollIntervalMs
            },
            metadata: { timestamp: Date.now() }
        }).catch(err => Logger.error(`[${traceId}] Failed to record A2A waiting observation:`, err));

        try {
            while ((Date.now() - startTime) < maxWaitTimeMs) {
                // Check if all tasks are completed
                const incompleteTasks = updatedTasks.filter(task => 
                    task.status !== A2ATaskStatus.COMPLETED && 
                    task.status !== A2ATaskStatus.FAILED &&
                    task.status !== A2ATaskStatus.CANCELLED
                );

                if (incompleteTasks.length === 0) {
                    Logger.info(`[${traceId}] All A2A tasks completed successfully`);
                    break;
                }

                Logger.debug(`[${traceId}] Waiting for ${incompleteTasks.length} A2A task(s) to complete...`);

                // Poll each incomplete task for status updates
                for (let i = 0; i < updatedTasks.length; i++) {
                    const task = updatedTasks[i];
                    
                    // Skip already completed tasks
                    if (task.status === A2ATaskStatus.COMPLETED || 
                        task.status === A2ATaskStatus.FAILED ||
                        task.status === A2ATaskStatus.CANCELLED) {
                        continue;
                    }

                    try {
                        // Get latest task status from repository (may have been updated by webhooks)
                        const latestTask = await this.deps.a2aTaskRepository.getTask(task.taskId);
                        if (latestTask) {
                            updatedTasks[i] = latestTask;
                            Logger.debug(`[${traceId}] Task ${task.taskId} status updated to: ${latestTask.status}`);
                        }
                    } catch (error: any) {
                        Logger.warn(`[${traceId}] Failed to get updated status for task ${task.taskId}:`, error);
                    }
                }

                // Wait before next poll cycle
                await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            }

            // Check final completion status
            const completedTasks = updatedTasks.filter(task => task.status === A2ATaskStatus.COMPLETED);
            const failedTasks = updatedTasks.filter(task => task.status === A2ATaskStatus.FAILED);
            const timeoutTasks = updatedTasks.filter(task => 
                task.status !== A2ATaskStatus.COMPLETED && 
                task.status !== A2ATaskStatus.FAILED &&
                task.status !== A2ATaskStatus.CANCELLED
            );

            const totalWaitTime = Date.now() - startTime;
            
            // Record completion observation
            await this.deps.observationManager.record({
                threadId: threadId,
                traceId: traceId,
                type: ObservationType.TOOL_CALL,
                content: {
                    phase: 'a2a_waiting_complete',
                    message: 'A2A task waiting completed',
                    totalWaitTimeMs: totalWaitTime,
                    completedTasks: completedTasks.length,
                    failedTasks: failedTasks.length,
                    timeoutTasks: timeoutTasks.length,
                    success: timeoutTasks.length === 0
                },
                metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record A2A waiting completion observation:`, err));

            if (timeoutTasks.length > 0) {
                Logger.warn(`[${traceId}] ${timeoutTasks.length} A2A task(s) did not complete within timeout (${maxWaitTimeMs}ms)`);
            }

            if (completedTasks.length > 0) {
                Logger.info(`[${traceId}] Successfully completed ${completedTasks.length} A2A task(s) in ${totalWaitTime}ms`);
            }

            return updatedTasks;

        } catch (error: any) {
            Logger.error(`[${traceId}] Error during A2A task waiting:`, error);
            
            // Record error observation
            await this.deps.observationManager.record({
                threadId: threadId,
                traceId: traceId,
                type: ObservationType.ERROR,
                content: {
                    phase: 'a2a_waiting',
                    error: error.message,
                    stack: error.stack,
                    waitTimeMs: Date.now() - startTime
                },
                metadata: { timestamp: Date.now() }
            }).catch(err => Logger.error(`[${traceId}] Failed to record A2A waiting error observation:`, err));

            // Don't fail the entire process for A2A waiting errors - return current state
            return updatedTasks;
        }
    }

    /**
     * Executes local tools identified during planning.
     * @private
     */
    private async _executeLocalTools(toolCalls: ParsedToolCall[] | undefined, threadId: string, traceId: string): Promise<ToolResult[]> {
        const localToolCalls = toolCalls?.filter(call => call.toolName !== 'delegate_to_agent') ?? [];

        if (localToolCalls.length === 0) {
            Logger.debug(`[${traceId}] Stage 5: Tool Execution (No local tool calls)`);
            return [];
        }

        Logger.debug(`[${traceId}] Stage 5: Tool Execution (${localToolCalls.length} calls)`);
        try {
            return await this.deps.toolSystem.executeTools(localToolCalls, threadId, traceId);
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
        traceId: string,
        planningContext?: {
            toolsList: { name: string; description?: string }[];
            a2aSummary: string;
            plannedToolCalls: ParsedToolCall[];
            rawPlanningText?: string;
        }
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
            const wrappedSynthesisSystemPrompt = `You are a Zoi. Your purpose is to combine the user's query, the execution plan, and the results from tools and other agents into a single, coherent, and well-formatted final response.

**Core Directives:**
1.  **Truthfulness:** Your response MUST be based *only* on the information provided in the context (user query, plan, tool results, A2A task results). Do not invent facts or speculate beyond the provided data.
2.  **Markdown Formatting:** Structure your response using proper markdown for readability. Use headings, lists, bold text, and code blocks as appropriate to create a clear and well-organized answer.
3.  **Clarity and Flow:** The response should have a logical flow. Start by addressing the user's main query, then present the supporting evidence from the tool and agent results, and conclude with a summary if necessary.
4.  **Source Attribution:** You MUST cite your sources. When you use information from a tool or an A2A task, reference it by its identifier (e.g., from \`(Call ID: calc_1)\` or \`(ID: a2a_task_abc)\`). Append a "Sources" section at the end of your response, listing all the tools and tasks that contributed to the answer. For example: \`[1]\`, and then in the Sources section: \`[1] Tool: calculator (Call ID: calc_1)\`. If a tool or agent provides its own list of original sources (e.g., website URLs), you MUST list them under a separate "Original Sources" section.

**[BEGIN_CUSTOM_GUIDANCE]**
${systemPrompt}
**[END_CUSTOM_GUIDANCE]**

The custom guidance above provides additional context on tone and domain, but it MUST NOT override the core directives, especially the requirement for truthfulness and source attribution.`;

            const toolsDiscovered = (planningContext?.toolsList ?? []).map(t => `- ${t.name}: ${t.description ?? ''}`.trim()).join('\n') || 'No tools were discovered during planning.';
            const plannedCallsSummary = (planningContext?.plannedToolCalls ?? []).map(c => `- ${c.callId}: ${c.toolName} with ${JSON.stringify(c.arguments)}`).join('\n') || 'No tool calls were planned.';
            const a2aSummary = planningContext?.a2aSummary || 'No A2A delegation candidates or actions.';
            synthesisPrompt = [
                { role: 'system', content: wrappedSynthesisSystemPrompt },
                ...formattedHistory,
                {
                    role: 'user',
                    content: `User Query: ${props.query}\n\nDuring planning, we found out:\n- Available Local Tools:\n${toolsDiscovered}\n\n- Planned Tool Calls (as JSON-like summary):\n${plannedCallsSummary}\n\n- Agent Delegation Context:\n${a2aSummary}\n\nOriginal Intent: ${planningOutput.intent ?? ''}\nExecution Plan: ${planningOutput.plan ?? ''}\n\nTool Execution Results:\n${
                        toolResults.length > 0
                        ? toolResults.map(result => `- Tool: ${result.toolName} (Call ID: ${result.callId})\n  Status: ${result.status}\n  ${result.status === 'success' ? `Output: ${JSON.stringify(result.output)}` : ''}\n  ${result.status === 'error' ? `Error: ${result.error ?? 'Unknown error'}` : ''}\n  ${result.metadata?.sources ? `Original Sources: ${JSON.stringify(result.metadata.sources)}` : ''}`).join('\n')
                        : 'No tools were executed.'
                    }\n\nA2A Task Results:\n${
                        a2aTasks.length > 0
                        ? a2aTasks.map(task => `- Task: ${task.payload.taskType} (ID: ${task.taskId})\n  Status: ${task.status}\n  ${task.result?.success ? `Output: ${JSON.stringify(task.result.data)}` : ''}\n  ${task.result?.success === false ? `Error: ${task.result.error ?? 'Unknown error'}` : ''}\n  ${task.result?.metadata?.sources ? `Original Sources: ${JSON.stringify(task.result.metadata.sources)}` : ''}`).join('\n')
                        : 'No A2A tasks were delegated.'
                    }\n\nSynthesize the final answer based on the directives in the system prompt. Give appropriate weight to the verified Tool Execution Results and any successful A2A Task Results. If tools failed, explain briefly and answer using best available evidence.`
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
