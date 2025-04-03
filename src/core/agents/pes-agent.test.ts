// src/core/agents/pes-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PESAgent } from './pes-agent';
import {
    IAgentCore, StateManager, ConversationManager, ToolRegistry, PromptManager,
    ReasoningEngine, OutputParser, ObservationManager, ToolSystem
} from '../interfaces';
import {
    AgentProps, AgentFinalResponse, ThreadContext, ConversationMessage, ToolSchema,
    ParsedToolCall, ToolResult, ObservationType, ExecutionMetadata, MessageRole, CallOptions, AgentState, ThreadConfig
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
    createPlanningPrompt: vi.fn(),
    createSynthesisPrompt: vi.fn(),
};

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

const mockDependencies = {
    stateManager: mockStateManager,
    conversationManager: mockConversationManager,
    toolRegistry: mockToolRegistry,
    promptManager: mockPromptManager,
    reasoningEngine: mockReasoningEngine,
    outputParser: mockOutputParser,
    observationManager: mockObservationManager,
    toolSystem: mockToolSystem,
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

const mockToolSchema: ToolSchema = { name: 'get_weather', description: 'Gets weather', inputSchema: {} };
const mockAvailableTools: ToolSchema[] = [mockToolSchema];

const mockPlanningPrompt = 'PLANNING_PROMPT';
const mockPlanningLLMOutput = 'Intent: Get weather. Plan: Call tool. Tool Call: {"callId": "call1", "toolName": "get_weather", "arguments": {"location": "London"}}';
const mockParsedPlanningOutput = {
    intent: 'Get weather',
    plan: 'Call tool',
    toolCalls: [{ callId: 'call1', toolName: 'get_weather', arguments: { location: 'London' } }]
};

const mockToolResult: ToolResult = { callId: 'call1', toolName: 'get_weather', status: 'success', output: { temp: 15, unit: 'C' } };
const mockToolResults: ToolResult[] = [mockToolResult];

const mockSynthesisPrompt = 'SYNTHESIS_PROMPT';
const mockSynthesisLLMOutput = 'The weather in London is 15 degrees Celsius.';
const mockParsedSynthesisOutput = 'The weather in London is 15 degrees Celsius.';

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
        vi.mocked(mockPromptManager.createPlanningPrompt).mockResolvedValue(mockPlanningPrompt);
        vi.mocked(mockReasoningEngine.call)
            .mockResolvedValueOnce(mockPlanningLLMOutput) // Planning call
            .mockResolvedValueOnce(mockSynthesisLLMOutput); // Synthesis call
        vi.mocked(mockOutputParser.parsePlanningOutput).mockResolvedValue(mockParsedPlanningOutput);
        vi.mocked(mockToolSystem.executeTools).mockResolvedValue(mockToolResults);
        vi.mocked(mockPromptManager.createSynthesisPrompt).mockResolvedValue(mockSynthesisPrompt);
        vi.mocked(mockOutputParser.parseSynthesisOutput).mockResolvedValue(mockParsedSynthesisOutput);
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
        expect(mockPromptManager.createPlanningPrompt).toHaveBeenCalledWith(mockQuery, mockHistory, mockThreadConfig.systemPrompt, mockAvailableTools, mockThreadContext);
        expect(mockReasoningEngine.call).toHaveBeenNthCalledWith(1, mockPlanningPrompt, expect.objectContaining({ threadId: mockThreadId, traceId: mockTraceId }));
        expect(mockOutputParser.parsePlanningOutput).toHaveBeenCalledWith(mockPlanningLLMOutput);
        expect(mockToolSystem.executeTools).toHaveBeenCalledWith(mockParsedPlanningOutput.toolCalls, mockThreadId, mockTraceId);
        expect(mockPromptManager.createSynthesisPrompt).toHaveBeenCalledWith(mockQuery, mockParsedPlanningOutput.intent, mockParsedPlanningOutput.plan, mockToolResults, mockHistory, mockThreadConfig.systemPrompt, mockThreadContext);
        expect(mockReasoningEngine.call).toHaveBeenNthCalledWith(2, mockSynthesisPrompt, expect.objectContaining({ threadId: mockThreadId, traceId: mockTraceId }));
        expect(mockOutputParser.parseSynthesisOutput).toHaveBeenCalledWith(mockSynthesisLLMOutput);
        expect(mockConversationManager.addMessages).toHaveBeenCalledWith(mockThreadId, [expect.objectContaining({ role: MessageRole.AI, content: mockParsedSynthesisOutput })]);
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalledWith(mockThreadId);

        // Verify Observations (basic checks)
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.INTENT }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.PLAN }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.TOOL_CALL }));
        // Note: TOOL_EXECUTION observations are expected to be recorded *within* mockToolSystem.executeTools
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.SYNTHESIS }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.FINAL_RESPONSE }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.THOUGHTS, content: expect.objectContaining({ phase: 'planning' }) }));
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.THOUGHTS, content: expect.objectContaining({ phase: 'synthesis' }) }));


        // Verify Final Response
        expect(result.response.role).toBe(MessageRole.AI);
        expect(result.response.content).toBe(mockParsedSynthesisOutput);
        expect(result.response.messageId).toBe(mockFinalMessageId);
        expect(result.response.threadId).toBe(mockThreadId);
        expect(result.metadata.status).toBe('success');
        expect(result.metadata.threadId).toBe(mockThreadId);
        expect(result.metadata.traceId).toBe(mockTraceId);
        expect(result.metadata.llmCalls).toBe(2);
        expect(result.metadata.toolCalls).toBe(1);
        expect(result.metadata.error).toBeUndefined();
    });

    it('should handle planning failure', async () => {
        const planningError = new Error('LLM Planning Failed');
        vi.mocked(mockReasoningEngine.call).mockRejectedValueOnce(planningError); // Fail first call

        await expect(pesAgent.process(mockAgentProps)).rejects.toThrow(ARTError); // Expect ARTError wrapper

        // Verify observations
        expect(mockObservationManager.record).toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.ERROR, content: expect.objectContaining({ phase: 'planning', error: planningError.message }) }));

        // Verify finalization attempts
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalledWith(mockThreadId); // Should still attempt save

        // Verify later stages not called
        expect(mockOutputParser.parsePlanningOutput).not.toHaveBeenCalled();
        expect(mockToolSystem.executeTools).not.toHaveBeenCalled();
        expect(mockPromptManager.createSynthesisPrompt).not.toHaveBeenCalled();
        expect(mockConversationManager.addMessages).not.toHaveBeenCalled(); // No final message to add
    });

     it('should handle tool execution failure (partial)', async () => {
        const toolErrorResult: ToolResult = { callId: 'call1', toolName: 'get_weather', status: 'error', error: 'API unavailable' };
        vi.mocked(mockToolSystem.executeTools).mockResolvedValue([toolErrorResult]); // Tool system returns an error result

        const result = await pesAgent.process(mockAgentProps);

        // Verify observations (TOOL_EXECUTION error is handled by ToolSystem, check for synthesis error if it occurs)
        expect(mockObservationManager.record).not.toHaveBeenCalledWith(expect.objectContaining({ type: ObservationType.ERROR, content: expect.objectContaining({ phase: 'tool_execution' }) })); // PESAgent doesn't record this directly

        // Verify synthesis still happens
        expect(mockPromptManager.createSynthesisPrompt).toHaveBeenCalled();
        expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2); // Planning + Synthesis
        expect(mockOutputParser.parseSynthesisOutput).toHaveBeenCalled();

        // Verify final response reflects partial failure
        expect(result.metadata.status).toBe('partial');
        expect(result.metadata.error).toContain('Tool execution errors occurred.');
        expect(result.response.content).toBe(mockParsedSynthesisOutput); // Synthesis should still complete

        // Verify finalization
        expect(mockConversationManager.addMessages).toHaveBeenCalled();
        expect(mockStateManager.saveStateIfModified).toHaveBeenCalled();
    });

     it('should handle synthesis failure', async () => {
        const synthesisError = new Error('LLM Synthesis Failed');
        vi.mocked(mockReasoningEngine.call)
            .mockResolvedValueOnce(mockPlanningLLMOutput) // Planning OK
            .mockRejectedValueOnce(synthesisError); // Synthesis fails

        // Depending on error handling strategy, it might throw or return partial
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
         expect(mockPromptManager.createSynthesisPrompt).toHaveBeenCalledWith(mockQuery, noToolPlanningOutput.intent, noToolPlanningOutput.plan, [], mockHistory, mockThreadConfig.systemPrompt, mockThreadContext); // Empty tool results
         expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2); // Planning + Synthesis
         expect(result.metadata.status).toBe('success');
         expect(result.metadata.toolCalls).toBe(0);
         expect(result.response.content).toBe(mockParsedSynthesisOutput);
     });

});