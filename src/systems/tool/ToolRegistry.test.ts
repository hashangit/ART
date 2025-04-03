// src/systems/tool/ToolRegistry.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry } from './ToolRegistry';
import { IToolExecutor } from '../../core/interfaces';
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

  beforeEach(() => {
    registry = new ToolRegistry();
    vi.clearAllMocks(); // Clear logger mocks

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
    await expect(registry.registerTool(null as any)).rejects.toThrow('Invalid tool executor provided for registration.');
    await expect(registry.registerTool({} as any)).rejects.toThrow('Invalid tool executor provided for registration.');
    await expect(registry.registerTool({ schema: {} } as any)).rejects.toThrow('Invalid tool executor provided for registration.');
    expect(Logger.error).toHaveBeenCalledTimes(3);
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
    expect(Logger.debug).toHaveBeenCalledTimes(2); // Called for both registrations
  });

  it('should return undefined for a non-existent tool', async () => {
    const executor = await registry.getToolExecutor('nonexistent_tool');
    expect(executor).toBeUndefined();
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Tool "nonexistent_tool" not found.');
  });

  it('should return available tool schemas', async () => {
    await registry.registerTool(mockTool1);
    await registry.registerTool(mockTool2);

    const schemas = await registry.getAvailableTools();
    expect(schemas).toHaveLength(2);
    expect(schemas).toEqual(expect.arrayContaining([mockTool1.schema, mockTool2.schema]));
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning 2 available tool schemas.');
  });

  it('should return empty array if no tools are registered', async () => {
    const schemas = await registry.getAvailableTools();
    expect(schemas).toHaveLength(0);
    expect(schemas).toEqual([]);
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Returning 0 available tool schemas.');
  });

   it('should ignore filter in getAvailableTools and log warning', async () => {
    await registry.registerTool(mockTool1);
    const schemas = await registry.getAvailableTools({ enabledForThreadId: 't1' });
    expect(schemas).toHaveLength(1); // Still returns all registered tools
    expect(schemas[0]).toBe(mockTool1.schema);
    expect(Logger.warn).toHaveBeenCalledOnce();
    expect(Logger.warn).toHaveBeenCalledWith('ToolRegistry: Filtering by enabledForThreadId is not implemented in the basic ToolRegistry. Returning all tools.');
  });

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
    expect(Logger.debug).toHaveBeenCalledWith('ToolRegistry: Cleared all registered tools.');
  });
});