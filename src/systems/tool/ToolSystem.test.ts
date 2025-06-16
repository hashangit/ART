// src/systems/tool/ToolSystem.test.ts
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'; // Import Mock
import { ToolSystem } from './ToolSystem';
import { ToolRegistry, StateManager, IToolExecutor } from '../../core/interfaces';
import { ParsedToolCall, ToolResult, ExecutionContext, ToolSchema } from '../../types';
import { validateJsonSchema } from '../../utils/validation';
import { Logger } from '../../utils/logger';

// Mock dependencies
vi.mock('../../utils/logger');
vi.mock('../../utils/validation');

// Mock Tool Executor implementation
class MockToolExecutor implements IToolExecutor {
  constructor(public schema: ToolSchema, public shouldSucceed = true, public resultOverride?: Partial<ToolResult>) {}
  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    if (!this.shouldSucceed) {
      throw new Error(`Mock tool ${this.schema.name} forced failure.`);
    }
    return {
      callId: context.traceId || 'mock-call-id', // Executor might not know the original callId
      toolName: this.schema.name,
      status: 'success',
      output: { inputReceived: input, contextReceived: context },
      ...this.resultOverride,
    };
  }
}

describe('ToolSystem', () => {
  let toolSystem: ToolSystem;
  let mockToolRegistry: ToolRegistry;
  let mockStateManager: StateManager;
  let mockObservationManager: any; // Add ObservationManager mock

  let mockTool1: IToolExecutor;
  let mockTool2: IToolExecutor;

  const mockValidateJsonSchema = vi.mocked(validateJsonSchema);

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock tools
    mockTool1 = new MockToolExecutor({
      name: 'calculator',
      description: 'Mock calculator',
      inputSchema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
    });
    mockTool2 = new MockToolExecutor({
      name: 'weather',
      description: 'Mock weather',
      inputSchema: { type: 'object', properties: { location: { type: 'string' } }, required: ['location'] },
    });

    // Mock Registry
    mockToolRegistry = {
      registerTool: vi.fn(),
      getToolExecutor: vi.fn(async (toolName: string) => {
        if (toolName === 'calculator') return mockTool1;
        if (toolName === 'weather') return mockTool2;
        return undefined;
      }),
      getAvailableTools: vi.fn(),
      // clearAllTools: vi.fn(), // Removed: Not part of the ToolRegistry interface
    };

    // Mock StateManager
    mockStateManager = {
      loadThreadContext: vi.fn(),
      isToolEnabled: vi.fn(async (threadId: string, toolName: string) => {
        // Simulate 'calculator' enabled, 'weather' disabled for thread 't1'
        if (threadId === 't1') {
          return toolName === 'calculator';
        }
        return true; // Enabled by default for other threads
      }),
      getThreadConfigValue: vi.fn(),
      saveStateIfModified: vi.fn(),
    };

    // Mock ObservationManager
    mockObservationManager = { 
      record: vi.fn().mockResolvedValue(undefined), // Return resolved Promise
      getObservations: vi.fn().mockResolvedValue([])
    };

    toolSystem = new ToolSystem(
      mockToolRegistry as any, // Cast to any to satisfy interface during mock setup
      mockStateManager as any,
      mockObservationManager as any
    );

    // Default mock for validation (success)
    mockValidateJsonSchema.mockReturnValue({ isValid: true, errors: null });
  });

  it('should execute a single valid tool call successfully', async () => {
    const toolCalls: ParsedToolCall[] = [
      { callId: 'call-123', toolName: 'calculator', arguments: { expression: '2+2' } },
    ];
    const threadId = 't2'; // Use thread where calculator is enabled
    const traceId = 'trace-abc';

    const results = await toolSystem.executeTools(toolCalls, threadId, traceId);

    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result.status).toBe('success');
    expect(result.toolName).toBe('calculator');
    expect(result.callId).toBe('call-123'); // Should use the original callId
    expect(result.output).toEqual({
        inputReceived: { expression: '2+2' },
        contextReceived: { threadId, traceId }
    });
    expect(mockStateManager.isToolEnabled).toHaveBeenCalledWith(threadId, 'calculator');
    expect(mockToolRegistry.getToolExecutor).toHaveBeenCalledWith('calculator');
    expect(mockValidateJsonSchema).toHaveBeenCalledWith(mockTool1.schema.inputSchema, { expression: '2+2' });
    // expect(mockObservationManager.record).toHaveBeenCalledOnce(); // Add when implemented
  });

  it('should execute multiple tool calls sequentially', async () => {
     mockTool1 = new MockToolExecutor({ name: 'toolA', description: '', inputSchema: {} });
     mockTool2 = new MockToolExecutor({ name: 'toolB', description: '', inputSchema: {} });
     (mockToolRegistry.getToolExecutor as Mock)
        .mockResolvedValueOnce(mockTool1)
        .mockResolvedValueOnce(mockTool2);
     (mockStateManager.isToolEnabled as Mock).mockResolvedValue(true); // Enable all

    const toolCalls: ParsedToolCall[] = [
      { callId: 'c1', toolName: 'toolA', arguments: { a: 1 } },
      { callId: 'c2', toolName: 'toolB', arguments: { b: 2 } },
    ];
    const threadId = 'multi';

    const results = await toolSystem.executeTools(toolCalls, threadId);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('success');
    expect(results[0].toolName).toBe('toolA');
    expect(results[0].callId).toBe('c1');
    expect(results[1].status).toBe('success');
    expect(results[1].toolName).toBe('toolB');
    expect(results[1].callId).toBe('c2');
    expect(mockStateManager.isToolEnabled).toHaveBeenCalledTimes(2);
    expect(mockToolRegistry.getToolExecutor).toHaveBeenCalledTimes(2);
    expect(mockValidateJsonSchema).toHaveBeenCalledTimes(2);
  });

  it('should return an error result if a tool is not enabled', async () => {
    const toolCalls: ParsedToolCall[] = [
      { callId: 'call-456', toolName: 'weather', arguments: { location: 'London' } },
    ];
    const threadId = 't1'; // weather is disabled for t1

    const results = await toolSystem.executeTools(toolCalls, threadId);

    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result.status).toBe('error');
    expect(result.toolName).toBe('weather');
    expect(result.callId).toBe('call-456');
    expect(result.error).toBe('Tool "weather" is not enabled for thread "t1".');
    expect(mockStateManager.isToolEnabled).toHaveBeenCalledWith(threadId, 'weather');
    expect(mockToolRegistry.getToolExecutor).not.toHaveBeenCalled();
    expect(mockValidateJsonSchema).not.toHaveBeenCalled();
    // expect(mockObservationManager.record).toHaveBeenCalledOnce(); // Error should still be recorded
  });

  it('should return an error result if a tool is not found in the registry', async () => {
    const toolCalls: ParsedToolCall[] = [
      { callId: 'call-789', toolName: 'nonexistent', arguments: {} },
    ];
    const threadId = 't-any';
    (mockStateManager.isToolEnabled as Mock).mockResolvedValue(true); // Assume enabled

    const results = await toolSystem.executeTools(toolCalls, threadId);

    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result.status).toBe('error');
    expect(result.toolName).toBe('nonexistent');
    expect(result.callId).toBe('call-789');
    expect(result.error).toBe('Tool "nonexistent" not found in registry.');
    expect(mockStateManager.isToolEnabled).toHaveBeenCalledWith(threadId, 'nonexistent');
    expect(mockToolRegistry.getToolExecutor).toHaveBeenCalledWith('nonexistent');
    expect(mockValidateJsonSchema).not.toHaveBeenCalled();
  });

  it('should return an error result if argument validation fails', async () => {
    const toolCalls: ParsedToolCall[] = [
      { callId: 'call-abc', toolName: 'calculator', arguments: { expr: 'wrong_arg_name' } }, // Invalid arg name
    ];
    const threadId = 't2';
    mockValidateJsonSchema.mockReturnValue({
        isValid: false,
        errors: [{ instancePath: '/expr', keyword: 'required', message: 'should have required property \'expression\'', params: {}, schemaPath: '' }]
    });

    const results = await toolSystem.executeTools(toolCalls, threadId);

    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result.status).toBe('error');
    expect(result.toolName).toBe('calculator');
    expect(result.callId).toBe('call-abc');
    expect(result.error).toContain('Invalid arguments for tool "calculator":');
    expect(result.error).toContain('/expr should have required property \'expression\''); // Check specific error message
    expect(mockStateManager.isToolEnabled).toHaveBeenCalledWith(threadId, 'calculator');
    expect(mockToolRegistry.getToolExecutor).toHaveBeenCalledWith('calculator');
    expect(mockValidateJsonSchema).toHaveBeenCalledWith(mockTool1.schema.inputSchema, { expr: 'wrong_arg_name' });
  });

  it('should return an error result if the tool executor throws an error', async () => {
    // Configure mockTool1 to fail
    mockTool1 = new MockToolExecutor(mockTool1.schema, false); // Set shouldSucceed to false
    (mockToolRegistry.getToolExecutor as Mock).mockResolvedValue(mockTool1);
    (mockStateManager.isToolEnabled as Mock).mockResolvedValue(true);

    const toolCalls: ParsedToolCall[] = [
      { callId: 'call-fail', toolName: 'calculator', arguments: { expression: '1/0' } },
    ];
    const threadId = 't-fail';

    const results = await toolSystem.executeTools(toolCalls, threadId);

    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result.status).toBe('error');
    expect(result.toolName).toBe('calculator');
    expect(result.callId).toBe('call-fail');
    expect(result.error).toBe('Mock tool calculator forced failure.');
    expect(mockValidateJsonSchema).toHaveBeenCalled(); // Validation should still happen
    expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Tool "calculator" execution failed for callId "call-fail"'),
        expect.anything()
    );
  });

  it('should handle mixed success and failure results correctly', async () => {
    const failingTool = new MockToolExecutor({ name: 'failing', description: '', inputSchema: {} }, false);
    (mockToolRegistry.getToolExecutor as Mock)
        .mockResolvedValueOnce(mockTool1) // calculator (success)
        .mockResolvedValueOnce(failingTool); // failing (error)
    (mockStateManager.isToolEnabled as Mock).mockResolvedValue(true);

     const toolCalls: ParsedToolCall[] = [
      { callId: 'c-ok', toolName: 'calculator', arguments: { expression: '10' } },
      { callId: 'c-fail', toolName: 'failing', arguments: {} },
    ];
    const threadId = 'mixed';

    const results = await toolSystem.executeTools(toolCalls, threadId);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('success');
    expect(results[0].toolName).toBe('calculator');
    expect(results[0].callId).toBe('c-ok');
    expect(results[1].status).toBe('error');
    expect(results[1].toolName).toBe('failing');
    expect(results[1].callId).toBe('c-fail');
    expect(results[1].error).toBe('Mock tool failing forced failure.');
  });
});