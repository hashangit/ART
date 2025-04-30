import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry } from './ToolRegistry';
import { IToolExecutor, StateManager } from '../../core/interfaces'; // Import StateManager
import { ToolSchema, ExecutionContext, ToolResult } from '../../types';
import { Logger } from '../../utils/logger';

// Mock Logger
vi.mock('../../utils/logger', () => ({
  Logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    configure: vi.fn(),
  },
}));

// Mock StateManager (basic mock, adjust if specific methods are needed)
// We need to mock the actual module where StateManager might be defined if it's a class,
// or mock the interface implementation if it's expected to be injected.
// Assuming StateManager is conceptually an interface fulfilled elsewhere,
// we mock the expected methods.
const mockLoadThreadContext = vi.fn();
const MockStateManager = vi.fn(() => ({
    loadThreadContext: mockLoadThreadContext,
}));

// Mock Tool Executor implementation
class MockToolExecutor implements IToolExecutor {
  constructor(public schema: ToolSchema) {}
  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    // Basic mock execution
    return {
      callId: context.traceId || 'mock-call-id',
      toolName: this.schema.name,
      status: 'success',
      output: { inputReceived: input },
    };
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockTool1: IToolExecutor;
  let mockTool2: IToolExecutor;
  let mockStateManagerInstance: StateManager; // Instance for tests needing it

  beforeEach(() => {
    vi.clearAllMocks(); // Clear all mocks before each test

    // Create mock StateManager instance for specific tests
    mockStateManagerInstance = new (MockStateManager as any)();

    // Create registry without StateManager by default for most tests
    registry = new ToolRegistry();


    // Create mock tools
    mockTool1 = new MockToolExecutor({
      name: 'tool1',
      description: 'Mock tool 1',
      inputSchema: { type: 'object', properties: { param1: { type: 'string' } } },
    });
    mockTool2 = new MockToolExecutor({
      name: 'tool2',
      description: 'Mock tool 2',
      inputSchema: { type: 'object', properties: { value: { type: 'number' } } },
    });
  });

  it('should register a tool successfully', async () => {
    await registry.registerTool(mockTool1);
    const executor = await registry.getToolExecutor('tool1');
    expect(executor).toBe(mockTool1);
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Registered tool "tool1".');
  });

  it('should throw error when registering an invalid executor', async () => {
    // Use try-catch for async errors or .rejects.toThrow()
    await expect(registry.registerTool(null as any)).rejects.toThrow('Invalid tool executor provided for registration.');
    await expect(registry.registerTool({} as any)).rejects.toThrow('Invalid tool executor provided for registration.');
    await expect(registry.registerTool({ schema: {} } as any)).rejects.toThrow('Invalid tool executor provided for registration.');
    // Check logger after awaiting promises
    expect(Logger.error).toHaveBeenCalledTimes(3);
    expect(Logger.error).toHaveBeenCalledWith('ToolRegistry: Attempted to register an invalid tool executor.');
  });


  it('should overwrite an existing tool registration and log a warning', async () => {
    const newMockTool1 = new MockToolExecutor({ ...mockTool1.schema, description: 'New Tool 1' });
    await registry.registerTool(mockTool1); // Initial registration
    await registry.registerTool(newMockTool1); // Overwrite

    const executor = await registry.getToolExecutor('tool1');
    expect(executor).toBe(newMockTool1); // Should be the new one
    expect(executor?.schema.description).toBe('New Tool 1');
    expect(Logger.warn).toHaveBeenCalledOnce();
    expect(Logger.warn).toHaveBeenCalledWith('ToolRegistry: Overwriting existing tool registration for "tool1".');
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Registered tool "tool1".'); // Called twice
    expect(Logger.debug).toHaveBeenCalledTimes(2);
  });

  it('should return undefined for a non-existent tool', async () => {
    const executor = await registry.getToolExecutor('nonexistent_tool');
    expect(executor).toBeUndefined();
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Tool "nonexistent_tool" not found.');
  });

  // --- Failing Tests Analysis & Fixes ---

  it('should return available tool schemas when StateManager is NOT provided', async () => {
    // Uses default registry without StateManager
    await registry.registerTool(mockTool1);
    await registry.registerTool(mockTool2);

    const schemas = await registry.getAvailableTools();
    expect(schemas).toHaveLength(2);
    // Sort schemas by name for consistent order before comparing
    const sortedSchemas = schemas.sort((a, b) => a.name.localeCompare(b.name));
    const expectedSchemas = [mockTool1.schema, mockTool2.schema].sort((a, b) => a.name.localeCompare(b.name));
    expect(sortedSchemas).toEqual(expectedSchemas); // Use toEqual for deep comparison
    // Check the final log message specifically
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning all 2 registered tool schemas.');
  });

  it('should return empty array if no tools are registered when StateManager is NOT provided', async () => {
    // Uses default registry without StateManager
    const schemas = await registry.getAvailableTools();
    expect(schemas).toHaveLength(0);
    expect(schemas).toEqual([]);
    // Check the final log message specifically
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning all 0 registered tool schemas.');
  });

   it('should ignore filter and log warning if StateManager is NOT provided', async () => {
    // This test uses the default registry created *without* a StateManager
    await registry.registerTool(mockTool1);
    const schemas = await registry.getAvailableTools({ enabledForThreadId: 't1' });

    expect(schemas).toHaveLength(1); // Still returns all registered tools
    expect(schemas[0]).toEqual(mockTool1.schema); // Use toEqual for deep comparison
    expect(Logger.warn).toHaveBeenCalledOnce();
    expect(Logger.warn).toHaveBeenCalledWith('ToolRegistry: Filtering by enabledForThreadId requested, but StateManager was not provided. Returning all tools.');
    // Also check the final debug log
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning all 1 registered tool schemas.');
  });

  // --- New tests for StateManager integration ---

  describe('with StateManager', () => {
    beforeEach(() => {
        // Create a new registry *with* the mock StateManager for these tests
        registry = new ToolRegistry(mockStateManagerInstance);
        // Reset mock calls for the manager between tests in this block
        mockLoadThreadContext.mockClear();
    });

    it('should filter tools if StateManager is provided and returns enabled tools', async () => {
        await registry.registerTool(mockTool1); // name: tool1
        await registry.registerTool(mockTool2); // name: tool2

        // Configure the mock StateManager for this test
        const mockContext = {
            config: { enabledTools: ['tool1'] } // Only tool1 is enabled
        };
        mockLoadThreadContext.mockResolvedValue(mockContext);

        const schemas = await registry.getAvailableTools({ enabledForThreadId: 'thread-abc' });

        expect(mockLoadThreadContext).toHaveBeenCalledWith('thread-abc');
        expect(schemas).toHaveLength(1);
        expect(schemas[0]).toEqual(mockTool1.schema);
        expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Attempting to filter tools for threadId: thread-abc');
        expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Found enabled tools for thread thread-abc: tool1');
        expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning 1 enabled tool schemas for thread thread-abc.');
        expect(Logger.warn).not.toHaveBeenCalled(); // No warnings expected
    });

     it('should return all tools and warn if StateManager has no config/enabledTools for thread', async () => {
        await registry.registerTool(mockTool1);
        await registry.registerTool(mockTool2);

        // Mock StateManager to return context without enabledTools or null
        mockLoadThreadContext.mockResolvedValue({ config: {} }); // or mockResolvedValue(null)

        const schemas = await registry.getAvailableTools({ enabledForThreadId: 'thread-xyz' });

        expect(mockLoadThreadContext).toHaveBeenCalledWith('thread-xyz');
        expect(schemas).toHaveLength(2); // Returns all tools
        expect(schemas).toEqual(expect.arrayContaining([mockTool1.schema, mockTool2.schema]));
        expect(Logger.warn).toHaveBeenCalledWith('ToolRegistry: No specific enabledTools found for thread thread-xyz or config missing. Returning all tools.');
        // Check final debug log
        expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning all 2 registered tool schemas.');
     });

     it('should return all tools and log error if StateManager throws error', async () => {
          await registry.registerTool(mockTool1);

          // Mock StateManager to throw an error
          const loadError = new Error('Database connection failed');
          mockLoadThreadContext.mockRejectedValue(loadError);

          const schemas = await registry.getAvailableTools({ enabledForThreadId: 'thread-err' });

          expect(mockLoadThreadContext).toHaveBeenCalledWith('thread-err');
          expect(schemas).toHaveLength(1); // Returns all tools as fallback
          expect(schemas[0]).toEqual(mockTool1.schema);
          expect(Logger.error).toHaveBeenCalledWith('ToolRegistry: Error loading thread config for thread-err: Database connection failed. Returning all tools.');
          // Check final debug log
          expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning all 1 registered tool schemas.');
     });
  });
  // --- End of new tests ---


  it('should clear all registered tools', async () => {
    await registry.registerTool(mockTool1);
    await registry.registerTool(mockTool2);

    let schemas = await registry.getAvailableTools();
    expect(schemas).toHaveLength(2);

    await registry.clearAllTools();

    schemas = await registry.getAvailableTools();
    expect(schemas).toHaveLength(0);
    const executor1 = await registry.getToolExecutor('tool1');
    expect(executor1).toBeUndefined();
    // Check the specific log message for clearing
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Cleared all registered tools.');
  });
});