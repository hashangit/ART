// src/core/agents/pes-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PESAgent } from './pes-agent';
import {
    StateManager, ConversationManager, ToolRegistry, 
    ReasoningEngine, OutputParser, ObservationManager, ToolSystem, UISystem
} from '../interfaces';
import {
    AgentProps, ThreadContext, ConversationMessage, ToolSchema, 
    ToolResult, ObservationType, MessageRole, AgentState, ThreadConfig, 
    ArtStandardPrompt, StreamEvent, RuntimeProviderConfig
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
    setThreadConfig: vi.fn(),
    enableToolsForThread: vi.fn(),
    disableToolsForThread: vi.fn(),
    getEnabledToolsForThread: vi.fn(),
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
    getObservationSocket: vi.fn().mockReturnValue({ notify: vi.fn() }),
    getConversationSocket: vi.fn().mockReturnValue({ notify: vi.fn() }),
};

const mockDependencies = {
    stateManager: mockStateManager,
    conversationManager: mockConversationManager,
    toolRegistry: mockToolRegistry,
    reasoningEngine: mockReasoningEngine,
    outputParser: mockOutputParser,
    observationManager: mockObservationManager,
    toolSystem: mockToolSystem,
    uiSystem: mockUISystem,
};

// --- Test Data ---
const mockThreadId = 'test-thread-1';
const mockUserId = 'user-abc';
const mockTraceId = 'trace-xyz';
const mockQuery = 'What is the weather in London?';

const mockRuntimeProviderConfig: RuntimeProviderConfig = {
    providerName: 'mock-provider',
    modelId: 'mock-model',
    adapterOptions: { apiKey: 'test-key', temperature: 0.7 }
};

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
    providerConfig: mockRuntimeProviderConfig,
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

const mockToolSchema: ToolSchema = { 
    name: 'get_weather', 
    description: 'Gets weather', 
    inputSchema: { type: 'object', properties: { location: { type: 'string' } } } 
};
const mockAvailableTools: ToolSchema[] = [mockToolSchema];

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

const mockFinalMessageId = 'final-msg-uuid';
const mockFinalTimestamp = Date.now();

// --- Test Suite ---
describe('PESAgent', () => {
    let pesAgent: PESAgent;

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default happy path mocks
        vi.mocked(generateUUID).mockReturnValue(mockFinalMessageId);
        vi.spyOn(Date, 'now').mockReturnValue(mockFinalTimestamp);

        vi.mocked(mockStateManager.loadThreadContext).mockResolvedValue(mockThreadContext);
        vi.mocked(mockStateManager.getThreadConfigValue).mockResolvedValue(undefined); // No thread-level system prompt
        vi.mocked(mockConversationManager.getMessages).mockResolvedValue(mockHistory);
        vi.mocked(mockToolRegistry.getAvailableTools).mockResolvedValue(mockAvailableTools);

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
            .mockResolvedValueOnce(planningStream())
            .mockResolvedValueOnce(synthesisStream());

        vi.mocked(mockOutputParser.parsePlanningOutput).mockResolvedValue(mockParsedPlanningOutput);
        vi.mocked(mockToolSystem.executeTools).mockResolvedValue(mockToolResults);
        vi.mocked(mockConversationManager.addMessages).mockResolvedValue(undefined);
        vi.mocked(mockStateManager.saveStateIfModified).mockResolvedValue(undefined);
        vi.mocked(mockObservationManager.record).mockResolvedValue(undefined);

        pesAgent = new PESAgent(mockDependencies);
    });

    it('should execute the full PES flow successfully', async () => {
        const result = await pesAgent.process(mockAgentProps);

        // Verify Stages were called (via dependency mocks)
        expect(mockStateManager.loadThreadContext).toHaveBeenCalledWith(mockThreadId, mockUserId);
        expect(mockConversationManager.getMessages).toHaveBeenCalledWith(mockThreadId, { limit: mockThreadConfig.historyLimit });
        expect(mockToolRegistry.getAvailableTools).toHaveBeenCalledWith({ enabledForThreadId: mockThreadId });

        // Check reasoning engine calls (planning + synthesis)
        expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2);
        
        // Verify planning call
        const planningCall = vi.mocked(mockReasoningEngine.call).mock.calls[0];
        expect(planningCall[0]).toBeInstanceOf(Array); // ArtStandardPrompt
        expect(planningCall[0]).toEqual(expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
        ]));

        // Verify synthesis call  
        const synthesisCall = vi.mocked(mockReasoningEngine.call).mock.calls[1];
        expect(synthesisCall[0]).toBeInstanceOf(Array); // ArtStandardPrompt
        expect(synthesisCall[0]).toEqual(expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
        ]));

        expect(mockOutputParser.parsePlanningOutput).toHaveBeenCalledWith(mockPlanningLLMOutput);
        expect(mockToolSystem.executeTools).toHaveBeenCalledWith(mockParsedPlanningOutput.toolCalls, mockThreadId, mockTraceId);
        expect(mockConversationManager.addMessages).toHaveBeenCalledWith(mockThreadId, [
            expect.objectContaining({
                messageId: mockFinalMessageId,
                role: MessageRole.AI,
                content: mockSynthesisLLMOutput,
            })
        ]);

        // Verify result structure
        expect(result.response.content).toBe(mockSynthesisLLMOutput);
        expect(result.metadata.status).toBe('success');
        expect(result.metadata.llmCalls).toBe(2);
        expect(result.metadata.toolCalls).toBe(1);
    });

    it('should handle planning failure (config missing)', async () => {
        // Remove providerConfig from thread context
        const threadContextWithoutConfig = {
            ...mockThreadContext,
            config: { ...mockThreadConfig, providerConfig: undefined }
        };
        vi.mocked(mockStateManager.loadThreadContext).mockResolvedValue(threadContextWithoutConfig);

        const result = await pesAgent.process(mockAgentProps);

        // Should return error response instead of throwing
        expect(result.metadata.status).toBe('error');
        expect(result.metadata.error).toContain('RuntimeProviderConfig is missing');
        expect(result.response.content).toContain('RuntimeProviderConfig is missing');
    });

    it('should handle planning failure (reasoning engine error)', async () => {
        const planningError = new ARTError('LLM Planning Failed', ErrorCode.PLANNING_FAILED);
        const errorStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'ERROR', data: planningError, threadId: mockThreadId, traceId: mockTraceId };
        };
        vi.mocked(mockReasoningEngine.call).mockResolvedValueOnce(errorStream());

        await expect(pesAgent.process(mockAgentProps)).rejects.toThrow(ARTError);

        // Verify observation was recorded
        expect(mockObservationManager.record).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ObservationType.LLM_STREAM_ERROR,
                content: expect.objectContaining({
                    phase: 'planning',
                    error: 'LLM Planning Failed'
                })
            })
        );
    });

    it('should handle tool execution failure (partial)', async () => {
        const failedToolResult: ToolResult = { callId: 'call1', toolName: 'get_weather', status: 'error', error: 'API Error' };
        vi.mocked(mockToolSystem.executeTools).mockResolvedValue([failedToolResult]);

        const result = await pesAgent.process(mockAgentProps);

        // Verify synthesis still happens despite tool failure
        expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2); // Planning + Synthesis
        expect(result.metadata.status).toBe('partial');
        expect(result.metadata.error).toContain('Tool execution errors occurred');
    });

    it('should handle synthesis failure (reasoning engine error)', async () => {
        const synthesisError = new ARTError('LLM Synthesis Failed', ErrorCode.SYNTHESIS_FAILED);
        const planningStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: mockPlanningLLMOutput, tokenType: 'AGENT_THOUGHT_LLM_RESPONSE', threadId: mockThreadId, traceId: mockTraceId };
            yield { type: 'END', data: null, threadId: mockThreadId, traceId: mockTraceId };
        };
        const errorStream = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'ERROR', data: synthesisError, threadId: mockThreadId, traceId: mockTraceId };
        };
        vi.mocked(mockReasoningEngine.call)
            .mockResolvedValueOnce(planningStream())
            .mockResolvedValueOnce(errorStream());

        await expect(pesAgent.process(mockAgentProps)).rejects.toThrow(ARTError);

        // Verify observation was recorded
        expect(mockObservationManager.record).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ObservationType.LLM_STREAM_ERROR,
                content: expect.objectContaining({
                    phase: 'synthesis',
                    error: 'LLM Synthesis Failed'
                })
            })
        );
    });

    it('should handle case with no tool calls', async () => {
        const noToolsParsedOutput = {
            intent: 'Simple question',
            plan: 'Answer directly',
            toolCalls: []
        };
        vi.mocked(mockOutputParser.parsePlanningOutput).mockResolvedValue(noToolsParsedOutput);

        const result = await pesAgent.process(mockAgentProps);

        expect(mockToolSystem.executeTools).not.toHaveBeenCalled();
        expect(mockReasoningEngine.call).toHaveBeenCalledTimes(2); // Planning + Synthesis
        expect(result.metadata.status).toBe('success');
        expect(result.metadata.toolCalls).toBe(0);
    });
});