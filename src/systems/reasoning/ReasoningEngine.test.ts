// src/systems/reasoning/ReasoningEngine.test.ts
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'; // Import Mock type
import { ReasoningEngine } from './ReasoningEngine';
import {
    IProviderManager,
    ManagedAdapterAccessor,
    ProviderAdapter,
} from '../../types/providers'; // Import types from providers.ts
import { FormattedPrompt, CallOptions, StreamEvent } from '../../types'; // Import types from ../../types
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

// Mock ProviderAdapter for use within ManagedAdapterAccessor
class MockProviderAdapter implements ProviderAdapter {
    providerName: string = 'mock-adapter';
    async call(_prompt: FormattedPrompt, _options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
        // Simulate a stream
        const stream: AsyncIterable<StreamEvent> = (async function*() {
            yield { type: 'TOKEN', data: 'chunk1', threadId: _options.threadId, traceId: _options.traceId || 'mock-trace-id' };
            yield { type: 'TOKEN', data: 'chunk2', threadId: _options.threadId, traceId: _options.traceId || 'mock-trace-id' };
            yield { type: 'END', data: null, threadId: _options.threadId, traceId: _options.traceId || 'mock-trace-id' };
        })();
        return stream;
    }
    async shutdown(): Promise<void> {
        // Mock shutdown
    }
}

// Mock IProviderManager
const mockProviderManager: IProviderManager = {
    getAvailableProviders: vi.fn(),
    getAdapter: vi.fn(),
    // shutdown: vi.fn(), // Optional shutdown
};

describe('ReasoningEngine', () => {
    let engine: ReasoningEngine;
    const defaultCallOptions: CallOptions = { threadId: 't1', providerConfig: { providerName: 'mock', modelId: 'mock-model', adapterOptions: {} } };
    const defaultPrompt: FormattedPrompt = [{ role: 'user', content: 'Test prompt' }];

    // Mock ManagedAdapterAccessor and its release function
    const mockAdapter = new MockProviderAdapter();
    const mockRelease = vi.fn();
    const mockAccessor: ManagedAdapterAccessor = {
        adapter: mockAdapter,
        release: mockRelease,
    };

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Mock getAdapter to return the mock accessor
        (mockProviderManager.getAdapter as Mock).mockResolvedValue(mockAccessor);

        // Initialize engine with the mock ProviderManager
        engine = new ReasoningEngine(mockProviderManager);
    });

    it('should be instantiated with a valid ProviderManager', () => {
        expect(engine).toBeInstanceOf(ReasoningEngine);
        expect(Logger.info).toHaveBeenCalledOnce();
        expect(Logger.info).toHaveBeenCalledWith('ReasoningEngine initialized with ProviderManager');
    });

    it('should request an adapter from the ProviderManager for each call', async () => {
        await engine.call(defaultPrompt, defaultCallOptions);

        expect(mockProviderManager.getAdapter).toHaveBeenCalledOnce();
        expect(mockProviderManager.getAdapter).toHaveBeenCalledWith(defaultCallOptions.providerConfig); // Assuming providerConfig is in callOptions
    });

    it('should use the adapter returned by the ProviderManager to make the LLM call', async () => {
        const adapterCallSpy = vi.spyOn(mockAdapter, 'call');

        await engine.call(defaultPrompt, defaultCallOptions);

        expect(adapterCallSpy).toHaveBeenCalledOnce();
        expect(adapterCallSpy).toHaveBeenCalledWith(defaultPrompt, defaultCallOptions);
    });

    it('should return an async iterable from the adapter call', async () => {
        const result = await engine.call(defaultPrompt, defaultCallOptions);
        expect(typeof result[Symbol.asyncIterator]).toBe('function');
    });

    it('should call the release function after consuming the async iterable', async () => {
        const resultStream = await engine.call(defaultPrompt, defaultCallOptions);

        // Consume the stream
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _event of resultStream) {
            // Do nothing, just consume
        }

        expect(mockRelease).toHaveBeenCalledOnce();
    });

    it('should call the release function even if consuming the async iterable throws an error', async () => {
        // Mock the adapter's call to return a stream that throws after the first chunk
        const errorStream: AsyncIterable<StreamEvent> = (async function*() {
            yield { type: 'TOKEN', data: 'chunk1', threadId: defaultCallOptions.threadId, traceId: defaultCallOptions.traceId || 'mock-trace-id' };
            throw new Error('Stream error');
        })();
        const adapterCallSpy = vi.spyOn(mockAdapter, 'call').mockResolvedValueOnce(errorStream);

        const resultStream = await engine.call(defaultPrompt, defaultCallOptions);

        // Consume the stream and expect it to throw
        await expect(async () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _event of resultStream) {
                // Consume
            }
        }).rejects.toThrow('Stream error');

        // The release function should still have been called
        expect(mockRelease).toHaveBeenCalledOnce();
        expect(adapterCallSpy).toHaveBeenCalledOnce();
    });

    it('should call the release function even if consuming the async iterable is cancelled (e.g., break)', async () => {
        const resultStream = await engine.call(defaultPrompt, defaultCallOptions);

        // Consume only the first chunk and break
        for await (const event of resultStream) {
            expect(event.type).toBe('TOKEN');
            break; // Cancel consumption
        }

        // The release function should still have been called
        expect(mockRelease).toHaveBeenCalledOnce();
    });

    it('should handle errors from getAdapter, log them, and re-throw', async () => {
        const getAdapterError = new Error('Failed to get adapter');
        (mockProviderManager.getAdapter as Mock).mockRejectedValueOnce(getAdapterError);

        await expect(engine.call(defaultPrompt, defaultCallOptions)).rejects.toThrow('Failed to get adapter');

        expect(mockProviderManager.getAdapter).toHaveBeenCalledOnce();
        expect(Logger.error).toHaveBeenCalledOnce();
        expect(Logger.error).toHaveBeenCalledWith(
            'ReasoningEngine failed to get adapter: Failed to get adapter',
            expect.objectContaining({ error: getAdapterError })
        );
        expect(mockRelease).not.toHaveBeenCalled(); // Release should not be called if adapter wasn't obtained
    });

    // TODO: Add tests for different StreamEvent types being handled/propagated correctly if needed by ReasoningEngine logic (currently it just passes the stream through)
});