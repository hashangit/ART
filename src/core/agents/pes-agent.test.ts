// src/core/agents/pes-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PESAgent } from './pes-agent';
import {
    /* IAgentCore, */ StateManager, ConversationManager, ToolRegistry, PromptManager, // Removed IAgentCore
    ReasoningEngine, OutputParser, ObservationManager, ToolSystem, UISystem
} from '../interfaces';
import {
    AgentProps, /* AgentFinalResponse, */ ThreadContext, ConversationMessage, ToolSchema, // Removed AgentFinalResponse
    /* ParsedToolCall, */ ToolResult, ObservationType, /* ExecutionMetadata, */ MessageRole, /* CallOptions, */ AgentState, ThreadConfig, // Removed ParsedToolCall, ExecutionMetadata, CallOptions
    ArtStandardPrompt,
    /* PromptContext, */ // Removed PromptContext
    StreamEvent,
    /* ModelCapability */ // Removed ModelCapability
} from '../../types';
import { generateUUID } from '../../utils/uuid';
import { ARTError, ErrorCode } from '../../errors';

// --- Mocks ---
vi.mock('../../utils/uuid');

const mockStateManager: StateManager = {
    loadThreadContext: vi.fn(),
    isToolEnabled: vi.fn(),
    getThreadConfigValue: vi.fn(),
    saveStateIfModified: vi.fn(),
    setThreadConfig: vi.fn(), // Added missing mock
};

const mockConversationManager: ConversationManager = {
    addMessages: vi.fn(),
    getMessages: vi.fn(),
};

const mockToolRegistry: ToolRegistry = {
    registerTool: vi.fn(),
    getToolExecutor: vi.fn(),
    getAvailableTools: vi.fn(),
};

const mockPromptManager: PromptManager = {
    assemblePrompt: vi.fn(), // Changed to assemblePrompt
};

// Mock ReasoningEngine to handle stream output
const mockReasoningEngine: ReasoningEngine = {
    call: vi.fn(),
};

const mockOutputParser: OutputParser = {
    parsePlanningOutput: vi.fn(),
    parseSynthesisOutput: vi.fn(),
};

const mockObservationManager: ObservationManager = {
    record: vi.fn(),
    getObservations: vi.fn(),
};

const mockToolSystem: ToolSystem = {
    executeTools: vi.fn(),
};

// Mock UISystem
const mockUISystem: UISystem = {
    getLLMStreamSocket: vi.fn().mockReturnValue({ notify: vi.fn() }),
    getObservationSocket: vi.fn().mockReturnValue({ notify: vi.fn() }), // Added mock
    getConversationSocket: vi.fn().mockReturnValue({ notify: vi.fn() }), // Added mock
};


const mockDependencies = {
    stateManager: mockStateManager,
    conversationManager: mockConversationManager,
    toolRegistry: mockToolRegistry,
    promptManager: mockPromptManager,
    reasoningEngine: mockReasoningEngine,
    outputParser: mockOutputParser,
    observationManager: mockObservationManager,
    toolSystem: mockToolSystem,
    uiSystem: mockUISystem, // Added UISystem
};

// --- Test Data ---
const mockThreadId = 'test-thread-1';
const mockUserId = 'user-abc';
const mockTraceId = 'trace-xyz';
const mockQuery = 'What is the weather in London?';

const mockAgentProps: AgentProps = {
    query: mockQuery,
    threadId: mockThreadId,
    userId: mockUserId,
    traceId: mockTraceId,
};

const mockThreadConfig: ThreadConfig = {
    reasoning: { provider: 'mock', model: 'mock-model', parameters: { temp: 0.5 } },
    enabledTools: ['get_weather'],
    historyLimit: 10,
    systemPrompt: 'You are a helpful assistant.',
};

const mockAgentState: AgentState = { preference: 'celsius' };

const mockThreadContext: ThreadContext = {
    config: mockThreadConfig,
    state: mockAgentState,
};

const mockHistory: ConversationMessage[] = [
    { messageId: 'msg1', threadId: mockThreadId, role: MessageRole.USER, content: 'Hello', timestamp: Date.now() - 10000 },
    { messageId: 'msg2', threadId: mockThreadId, role: MessageRole.AI, content: 'Hi there!', timestamp: Date.now() - 9000 },
];

const mockToolSchema: ToolSchema = { name: 'get_weather', description: 'Gets weather', inputSchema: { type: 'object', properties: { location: { type: 'string' } } } }; // Added simple schema
const mockAvailableTools: ToolSchema[] = [mockToolSchema];

// Mock ArtStandardPrompt outputs
const mockPlanningArtPrompt: ArtStandardPrompt = [{ role: 'user', content: 'PLANNING_PROMPT_CONTENT' }];
const mockSynthesisArtPrompt: ArtStandardPrompt = [{ role: 'user', content: 'SYNTHESIS_PROMPT_CONTENT' }];

// Mock LLM stream outputs
const mockPlanningLLMOutput = 'Intent: Get weather. Plan: Call tool. Tool Calls: [{"id": "call1", "type": "function", "function": {"name": "get_weather", "arguments": "{\\"location\\": \\"London\\"}"}}]';
const mockParsedPlanningOutput = {
    intent: 'Get weather',
    plan: 'Call tool',
    toolCalls: [{ callId: 'call1', toolName: 'get_weather', arguments: { location: 'London' } }]
};

const mockToolResult: ToolResult = { callId: 'call1', toolName: 'get_weather', status: 'success', output: { temp: 15, unit: 'C' } };
const mockToolResults: ToolResult[] = [mockToolResult];

// Mock LLM stream outputs
const mockSynthesisLLMOutput = 'The weather in London is 15 degrees Celsius.';
// Synthesis output is now directly the content, no separate parsing step needed in agent
// const mockParsedSynthesisOutput = 'The weather in London is 15 degrees Celsius.';

const mockFinalMessageId = 'final-msg-uuid';
const mockFinalTimestamp = Date.now();

// --- Test Suite ---
describe('PESAgent', () => {
    let pesAgent: PESAgent;

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default happy path mocks
        vi.mocked(generateUUID).mockReturnValue(mockFinalMessageId); // For final message ID
        vi.spyOn(Date, 'now').mockReturnValue(mockFinalTimestamp);

        vi.mocked(mockStateManager.loadThreadContext).mockResolvedValue(mockThreadContext);
        vi.mocked(mockConversationManager.getMessages).mockResolvedValue(mockHistory);
        vi.mocked(mockToolRegistry.getAvailableTools).mockResolvedValue(mockAvailableTools);

        // Mock assemblePrompt
        vi.mocked(mockPromptManager.assemblePrompt)
            .mockResolvedValueOnce(mockPlanningArtPrompt) // First call (planning)
            .mockResolvedValueOnce(mockSynthesisArtPrompt); // Second call (synthesis)

        // Mock reasoningEngine.call to return async iterables (streams)
        const planningStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: mockPlanningLLMOutput, tokenType: 'AGENT_THOUGHT_LLM_RESPONSE', threadId: mockThreadId, traceId: mockTraceId };
            yield { type: 'END', data: null, threadId: mockThreadId, traceId: mockTraceId };
        };
        const synthesisStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: mockSynthesisLLMOutput, tokenType: 'FINAL_SYNTHESIS_LLM_RESPONSE', threadId: mockThreadId, traceId: mockTraceId };
            yield { type: 'END', data: null, threadId: mockThreadId, traceId: mockTraceId };
        };
        vi.mocked(mockReasoningEngine.call)
            .mockResolvedValueOnce(planningStream()) // Planning call returns stream
            .mockResolvedValueOnce(synthesisStream()); // Synthesis call returns stream

        vi.mocked(mockOutputParser.parsePlanningOutput).mockResolvedValue(mockParsedPlanningOutput);
        // No mock needed for parseSynthesisOutput as agent uses raw stream output now
        vi.mocked(mockToolSystem.executeTools).mockResolvedValue(mockToolResults);
        vi.mocked(mockConversationManager.addMessages).mockResolvedValue(undefined);
        vi.mocked(mockStateManager.saveStateIfModified).mockResolvedValue(undefined);
        vi.mocked(mockObservationManager.record).mockResolvedValue(undefined); // Assume recording succeeds

        pesAgent = new PESAgent(mockDependencies);
    });

    it('should execute the full PES flow successfully', async () => {
        const result = await pesAgent.process(mockAgentProps);

        // Verify Stages were called (via dependency mocks)
        expect(mockStateManager.loadThreadContext).toHaveBeenCalledWith(mockThreadId, mockUserId);
        expect(mockConversationManager.getMessages).toHaveBeenCalledWith(mockThreadId, { limit: mockThreadConfig.historyLimit });
        expect(mockToolRegistry.getAvailableTools).toHaveBeenCalledWith({ enabledForThreadId: mockThreadId });

        // Check assemblePrompt calls
        expect(mockPromptManager.assemblePrompt).toHaveBeenCalledTimes(2);
        // Check Planning Context
        expect(mockPromptManager.assemblePrompt).toHaveBeenNthCalledWith(1,
            expect.any(String), // Check blueprint string exists
            expect.objectContaining({
                query: mockQuery,
                systemPrompt: mockThreadConfig.systemPrompt,
                history: expect.arrayContaining([
                    expect.objectContaining({ role: 'user', content: 'Hello' }),
                    expect.objectContaining({ role: 'assistant', content: 'Hi there!', last: true }) // Check formatting helper adds 'last'
                ]),
                availableTools: expect.arrayContaining([
                    expect.objectContaining({ name: 'get_weather', inputSchemaJson: JSON.stringify(mockToolSchema.inputSchema) }) // Check pre-stringified schema
                ])
            })
        );
        // Check Synthesis Context
        expect(mockPromptManager.assemblePrompt).toHaveBeenNthCalledWith(2,
            expect.any(String), // Check blueprint string exists
            expect.objectContaining({
                query: mockQuery,
                systemPrompt: mockThreadConfig.systemPrompt,
                history: expect.any(Array), // Already checked format above
                intent: mockParsedPlanningOutput.intent,
                plan: mockParsedPlanningOutput.plan,
                toolResults: expect.arrayContaining([
                     expect.objectContaining({ callId: 'call1', status: 'success', outputJson: JSON.stringify(mockToolResult.output) }) // Check pre-stringified output
                ])
            })
        );

        // Check reasoning engine calls with ArtStandardPrompt
        expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2);
        expect(mockReasoningEngine.call).toHaveBeenNthCalledWith(1, mockPlanningArtPrompt, expect.objectContaining({ threadId: mockThreadId, traceId: mockTraceId, callContext: 'AGENT_THOUGHT' }));
        expect(mockOutputParser.parsePlanningOutput).toHaveBeenCalledWith(mockPlanningLLMOutput); // Still parse planning output
        expect(mockToolSystem.executeTools).toHaveBeenCalledWith(mockParsedPlanningOutput.toolCalls, mockThreadId, mockTraceId);
        expect(mockReasoningEngine.call).toHaveBeenNthCalledWith(2, mockSynthesisArtPrompt, expect.objectContaining({ threadId: mockThreadId, traceId: mockTraceId, callContext: 'FINAL_SYNTHESIS' }));
        // expect(mockOutputParser.parseSynthesisOutput).not.toHaveBeenCalled(); // Synthesis output is now raw stream content
        expect(mockConversationManager.addMessages).toHaveBeenCalledWith(mockThreadId, [expect.objectContaining({ role: MessageRole.AI, content: mockSynthesisLLMOutput })]); // Use raw synthesis output
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalledWith(mockThreadId);

        // Verify Observations (basic checks) - Update thought observations
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.INTENT }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.PLAN }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.TOOL_CALL }));
        // Note: TOOL_EXECUTION observations are expected to be recorded *within* mockToolSystem.executeTools
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.SYNTHESIS }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.FINAL_RESPONSE }));
        // Check stream observations
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.LLM_STREAM_START, content: { phase: 'planning' } }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.LLM_STREAM_END, content: { phase: 'planning' } }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.LLM_STREAM_START, content: { phase: 'synthesis' } }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.LLM_STREAM_END, content: { phase: 'synthesis' } }));
        // Check UI System calls
        expect(mockUISystem.getLLMStreamSocket().notify).toHaveBeenCalledTimes(4); // TOKEN+END for planning, TOKEN+END for synthesis


        // Verify Final Response
        expect(result.response.role).toBe(MessageRole.AI);
        expect(result.response.content).toBe(mockSynthesisLLMOutput); // Use raw synthesis output
        expect(result.response.messageId).toBe(mockFinalMessageId);
        expect(result.response.threadId).toBe(mockThreadId);
        expect(result.metadata.status).toBe('success');
        expect(result.metadata.threadId).toBe(mockThreadId);
        expect(result.metadata.traceId).toBe(mockTraceId);
        expect(result.metadata.llmCalls).toBe(2);
        expect(result.metadata.toolCalls).toBe(1);
        expect(result.metadata.error).toBeUndefined();
    });

    it('should handle planning failure (assemblePrompt error)', async () => {
        const assembleError = new ARTError('Blueprint invalid', ErrorCode.PROMPT_ASSEMBLY_FAILED);
        vi.mocked(mockPromptManager.assemblePrompt).mockRejectedValueOnce(assembleError); // Fail first assemble call

        await expect(pesAgent.process(mockAgentProps)).rejects.toThrow(assembleError);

        // Verify observations
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.ERROR, content: expect.objectContaining({ phase: 'planning', error: assembleError.message }) }));
        expect(mockReasoningEngine.call).not.toHaveBeenCalled(); // Engine not called if prompt fails
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalledWith(mockThreadId); // Should still attempt save
    });

    it('should handle planning failure (reasoning engine error)', async () => {
        const planningError = new Error('LLM Planning Failed');
        // Mock assemblePrompt to succeed, but reasoningEngine.call to fail (returning error stream)
        vi.mocked(mockPromptManager.assemblePrompt).mockResolvedValueOnce(mockPlanningArtPrompt);
        const errorStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'ERROR', data: planningError, threadId: mockThreadId, traceId: mockTraceId };
            yield { type: 'END', data: null, threadId: mockThreadId, traceId: mockTraceId };
        };
        vi.mocked(mockReasoningEngine.call).mockResolvedValueOnce(errorStream()); // Fail first call

        await expect(pesAgent.process(mockAgentProps)).rejects.toThrow(ARTError); // Expect ARTError wrapper

        // Verify observations
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.ERROR, content: expect.objectContaining({ phase: 'planning', error: planningError.message }) }));

        // Verify finalization attempts
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalledWith(mockThreadId); // Should still attempt save

        // Verify later stages not called
        expect(mockOutputParser.parsePlanningOutput).not.toHaveBeenCalled();
        expect(mockToolSystem.executeTools).not.toHaveBeenCalled();
        expect(mockPromptManager.assemblePrompt).toHaveBeenCalledTimes(1); // Only planning assemble called
        expect(mockConversationManager.addMessages).not.toHaveBeenCalled(); // No final message to add
    });

     it('should handle tool execution failure (partial)', async () => {
        const toolErrorResult: ToolResult = { callId: 'call1', toolName: 'get_weather', status: 'error', error: 'API unavailable' };
        vi.mocked(mockToolSystem.executeTools).mockResolvedValue([toolErrorResult]); // Tool system returns an error result

        const result = await pesAgent.process(mockAgentProps);

        // Verify observations (TOOL_EXECUTION error is handled by ToolSystem, check for synthesis error if it occurs)
        expect(mockObservationManager.record).not.toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.ERROR, content: expect.objectContaining({ phase: 'tool_execution' }) })); // PESAgent doesn't record this directly

        // Verify synthesis still happens
        expect(mockPromptManager.assemblePrompt).toHaveBeenCalledTimes(2); // Planning + Synthesis prompts assembled
        expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2); // Planning + Synthesis
        // expect(mockOutputParser.parseSynthesisOutput).not.toHaveBeenCalled(); // No synthesis parsing

        // Verify final response reflects partial failure
        expect(result.metadata.status).toBe('partial');
        expect(result.metadata.error).toContain('Tool execution errors occurred.');
        expect(result.response.content).toBe(mockSynthesisLLMOutput); // Synthesis should still complete

        // Verify finalization
        expect(mockConversationManager.addMessages).toHaveBeenCalled();
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalled();
    });

     it('should handle synthesis failure (reasoning engine error)', async () => {
        const synthesisError = new Error('LLM Synthesis Failed');
        // Mock planning stream to succeed
        const planningStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: mockPlanningLLMOutput, tokenType: 'AGENT_THOUGHT_LLM_RESPONSE', threadId: mockThreadId, traceId: mockTraceId };
            yield { type: 'END', data: null, threadId: mockThreadId, traceId: mockTraceId };
        };
         // Mock synthesis stream to yield error
        const errorStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'ERROR', data: synthesisError, threadId: mockThreadId, traceId: mockTraceId };
            yield { type: 'END', data: null, threadId: mockThreadId, traceId: mockTraceId };
        };
        vi.mocked(mockReasoningEngine.call)
            .mockResolvedValueOnce(planningStream()) // Planning OK
            .mockResolvedValueOnce(errorStream()); // Synthesis fails

        // Current implementation returns partial if tools ran, error otherwise. Here tools ran.
        const result = await pesAgent.process(mockAgentProps);


        // Verify observations
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.ERROR, content: expect.objectContaining({ phase: 'synthesis', error: synthesisError.message }) }));

        // Verify final response reflects synthesis failure
        expect(result.metadata.status).toBe('partial'); // Partial because tools succeeded
        expect(result.metadata.error).toContain('Synthesis phase failed');
        expect(result.response.content).toContain('Synthesis phase failed'); // Error message becomes content

        // Verify finalization attempts
        expect(mockConversationManager.addMessages).toHaveBeenCalled(); // Adds the error message
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalled();
    });

     it('should handle case with no tool calls', async () => {
         const noToolPlanningOutput = { intent: 'Greeting', plan: 'Respond politely', toolCalls: [] };
         vi.mocked(mockOutputParser.parsePlanningOutput).mockResolvedValue(noToolPlanningOutput);
         vi.mocked(mockToolSystem.executeTools).mockResolvedValue([]); // Should not be called, but setting expectation

         const result = await pesAgent.process(mockAgentProps);

         expect(mockToolSystem.executeTools).not.toHaveBeenCalled(); // Crucial check
         // Check synthesis assemblePrompt call context
         expect(mockPromptManager.assemblePrompt).toHaveBeenNthCalledWith(2,
             expect.any(String),
             expect.objectContaining({
                 intent: noToolPlanningOutput.intent,
                 plan: noToolPlanningOutput.plan,
                 toolResults: [] // Empty tool results
             })
         );
         expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2); // Planning + Synthesis
         expect(result.metadata.status).toBe('success');
         expect(result.metadata.toolCalls).toBe(0);
         expect(result.response.content).toBe(mockSynthesisLLMOutput); // Corrected variable name
     });

});