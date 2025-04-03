// src/systems/reasoning/ReasoningEngine.test.ts
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'; // Import Mock type
import { ReasoningEngine } from './ReasoningEngine';
import { ProviderAdapter } from '../../core/interfaces';
import { Logger } from '../../utils/logger';
import { FormattedPrompt, CallOptions } from '../../types';

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

// Create a mock ProviderAdapter
const mockAdapter: ProviderAdapter = {
  providerName: 'mock-adapter',
  call: vi.fn(),
};

describe('ReasoningEngine', () => {
  let engine: ReasoningEngine;
  const defaultCallOptions: CallOptions = { threadId: 't1' };
  const defaultPrompt: FormattedPrompt = 'Test prompt';

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Re-initialize engine with the mock adapter
    engine = new ReasoningEngine(mockAdapter);
  });

  it('should throw error if constructor is called without an adapter', () => {
    expect(() => new ReasoningEngine(null as any)).toThrow('ReasoningEngine requires a valid ProviderAdapter.');
    expect(() => new ReasoningEngine(undefined as any)).toThrow('ReasoningEngine requires a valid ProviderAdapter.');
  });

  it('should initialize correctly and log info message', () => {
    // This is implicitly tested by the beforeEach block, but we can assert the log
    expect(Logger.info).toHaveBeenCalledOnce();
    expect(Logger.info).toHaveBeenCalledWith('ReasoningEngine initialized with adapter: mock-adapter');
  });

  it('should delegate the call method to the adapter', async () => {
    const expectedResult = 'Adapter response';
    (mockAdapter.call as Mock).mockResolvedValueOnce(expectedResult); // Use Mock type directly

    const result = await engine.call(defaultPrompt, defaultCallOptions);

    expect(result).toBe(expectedResult);
    expect(mockAdapter.call).toHaveBeenCalledOnce();
    expect(mockAdapter.call).toHaveBeenCalledWith(defaultPrompt, defaultCallOptions);
    expect(Logger.debug).toHaveBeenCalledWith('ReasoningEngine delegating call to adapter: mock-adapter', expect.anything());
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('should pass prompt and options correctly to the adapter', async () => {
    const specificPrompt: FormattedPrompt = { complex: 'prompt' };
    const specificOptions: CallOptions = { threadId: 't2', traceId: 'trace-123', temperature: 0.7 };
    (mockAdapter.call as Mock).mockResolvedValueOnce('Success'); // Use Mock type directly

    await engine.call(specificPrompt, specificOptions);

    expect(mockAdapter.call).toHaveBeenCalledWith(specificPrompt, specificOptions);
  });

  it('should catch errors from the adapter, log them, and re-throw', async () => {
    const adapterError = new Error('Adapter failed');
    (mockAdapter.call as Mock).mockRejectedValueOnce(adapterError); // Use Mock type directly

    await expect(engine.call(defaultPrompt, defaultCallOptions)).rejects.toThrow('Adapter failed');

    expect(mockAdapter.call).toHaveBeenCalledOnce();
    expect(Logger.error).toHaveBeenCalledOnce();
    expect(Logger.error).toHaveBeenCalledWith(
      'ReasoningEngine encountered an error during adapter call: Adapter failed',
      expect.objectContaining({ error: adapterError })
    );
  });
});