// src/adapters/reasoning/anthropic.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnthropicAdapter, AnthropicAdapterOptions } from './anthropic';
import { Logger } from '../../utils/logger';
import { CallOptions, ArtStandardPrompt, StreamEvent } from '../../types';

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

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk');

import { Anthropic } from '@anthropic-ai/sdk';

// Create typed mock
const MockedAnthropic = vi.mocked(Anthropic);
const mockCreate = vi.fn();

// Configure the mock
MockedAnthropic.mockImplementation(() => ({
  messages: {
    create: mockCreate,
  },
} as any));

// Mock the APIError
const MockAPIError = vi.fn().mockImplementation((message: string, status?: number) => {
  const error = new Error(message);
  (error as any).status = status;
  return error;
});

(MockedAnthropic as any).APIError = MockAPIError;

// Helper function to consume the async iterable stream into an array
async function consumeStream(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
    const events: StreamEvent[] = [];
    for await (const event of stream) {
        events.push(event);
    }
    return events;
}

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  const defaultOptions: AnthropicAdapterOptions = { apiKey: 'test-anthropic-key' };
  const defaultCallOptions: CallOptions = { 
    threadId: 't-anthropic',
    providerConfig: {
      providerName: 'anthropic',
      modelId: 'claude-3-7-sonnet-20250219',
      adapterOptions: { apiKey: 'test-anthropic-key' }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
    
    // Setup mock return value for successful calls
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Mock response' }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'end_turn',
    });
    
    adapter = new AnthropicAdapter(defaultOptions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error if API key is missing', () => {
    expect(() => new AnthropicAdapter({} as AnthropicAdapterOptions)).toThrow('AnthropicAdapter requires an apiKey in options.');
  });

  it('should initialize with default model if not provided', () => {
    expect((adapter as any).defaultModel).toBe('claude-3-7-sonnet-20250219');
    expect(Logger.debug).toHaveBeenCalledWith('AnthropicAdapter initialized with model: claude-3-7-sonnet-20250219');
  });

  it('should initialize with provided model', () => {
    const opts: AnthropicAdapterOptions = { apiKey: 'key', model: 'claude-3-opus-20240229' };
    const customAdapter = new AnthropicAdapter(opts);
    expect((customAdapter as any).defaultModel).toBe('claude-3-opus-20240229');
  });

  describe('call (non-streaming)', () => {
    it('should translate basic ArtStandardPrompt and call Anthropic SDK', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Anthropic says hello!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Say hello' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-7-sonnet-20250219',
          messages: [{ role: 'user', content: 'Say hello' }],
          max_tokens: 4096,
          stream: false,
        }),
        expect.any(Object) // Request options
      );

      expect(results.find(e => e.type === 'TOKEN')?.data).toBe('Anthropic says hello!');
      expect(results.find(e => e.type === 'METADATA')?.data).toMatchObject({
        inputTokens: 10,
        outputTokens: 5,
        stopReason: 'end_turn',
      });
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling Anthropic API'), expect.anything());
    });

    it('should translate ArtStandardPrompt with system prompt', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'Understood system.' }] };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const prompt: ArtStandardPrompt = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ];
      await consumeStream(await adapter.call(prompt, defaultCallOptions));

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        system: 'You are helpful.',
        messages: [{ role: 'user', content: 'Hello' }],
      }), expect.any(Object));
    });

    it('should include optional generation parameters', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'Response with params.' }] };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const callOptions: CallOptions = {
        ...defaultCallOptions,
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.8,
        topK: 40,
        stopSequences: ['\nHuman:'],
      };
      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test params' }];
      await consumeStream(await adapter.call(prompt, callOptions));

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.8,
        top_k: 40,
        stop_sequences: ['\nHuman:'],
      }), expect.any(Object));
    });

    it('should handle SDK error during messages.create', async () => {
      const sdkError = new Error('Invalid API Key');
      mockCreate.mockRejectedValueOnce(sdkError);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test SDK error' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      expect(results.find(e => e.type === 'ERROR')?.data).toBe(sdkError);
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during Anthropic SDK call: Invalid API Key'),
        expect.anything()
      );
    });

    it('should handle invalid response structure (no content)', async () => {
      const invalidResponse = { usage: { input_tokens: 5 } }; // No content array
      mockCreate.mockResolvedValueOnce(invalidResponse);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test invalid' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      const errorEvent = results.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data).toBeInstanceOf(Error);
      expect((errorEvent?.data as Error).message).toContain('Invalid response structure from Anthropic SDK');
      expect(results.some(e => e.type === 'END')).toBe(true);
    });

    it('should yield error if translation fails', async () => {
      const invalidPrompt: ArtStandardPrompt = [
        { role: 'tool_result', content: 'Result', name: undefined, tool_call_id: undefined } as any // Missing required fields
      ];

      const resultStream = await adapter.call(invalidPrompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      expect(mockCreate).not.toHaveBeenCalled(); // SDK should not be called
      const errorEvent = results.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
      expect(results.some(e => e.type === 'END')).toBe(true);
    });
  });

  describe('call (streaming)', () => {
    it('should call messages.create with stream:true and yield events', async () => {
      // Mock the stream response
      const mockStream = (async function*() {
        yield { type: 'message_start', message: { usage: { input_tokens: 5, output_tokens: 0 } } };
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello ' } };
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'World' } };
        yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 10 } };
      })();
      mockCreate.mockResolvedValueOnce(mockStream);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Stream hello' }];
      const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
      const resultStream = await adapter.call(prompt, callOptions);
      const results = await consumeStream(resultStream);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        stream: true,
      }), expect.any(Object));

      const tokens = results.filter(e => e.type === 'TOKEN').map(e => e.data);
      expect(tokens).toEqual(['Hello ', 'World']);

      const metadataEvents = results.filter(e => e.type === 'METADATA');
      expect(metadataEvents.length).toBeGreaterThan(0);

      expect(results.some(e => e.type === 'END')).toBe(true);
    });

    it('should handle SDK error during streaming', async () => {
      const sdkError = new Error('Stream connection failed');
      mockCreate.mockRejectedValueOnce(sdkError);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test stream error' }];
      const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
      const resultStream = await adapter.call(prompt, callOptions);
      const results = await consumeStream(resultStream);

      expect(results.find(e => e.type === 'ERROR')?.data).toBe(sdkError);
      expect(results.some(e => e.type === 'END')).toBe(true);
    });
  });
});