// src/adapters/reasoning/openai.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenAIAdapter, OpenAIAdapterOptions } from './openai';
import { Logger } from '../../utils/logger';
import { CallOptions, ArtStandardPrompt, StreamEvent } from '../../types'; // Import new types
import { ARTError, ErrorCode } from '../../errors'; // Import errors

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

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to consume the async iterable stream into an array
async function consumeStream(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
    const events: StreamEvent[] = [];
    for await (const event of stream) {
        events.push(event);
    }
    return events;
}


describe('OpenAIAdapter (Refactored)', () => {
  let adapter: OpenAIAdapter;
  const defaultOptions: OpenAIAdapterOptions = { apiKey: 'test-api-key' };
  const defaultCallOptions: CallOptions = { 
  threadId: 't-openai',
  providerConfig: {
    providerName: 'openai',
    modelId: 'gpt-4o',
    adapterOptions: { apiKey: 'test-openai-key' }
  }
};

  beforeEach(() => {
    adapter = new OpenAIAdapter(defaultOptions);
    vi.clearAllMocks(); // Clear mocks including fetch and Logger
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Ensure fetch mock doesn't leak
  });

  it('should throw error if API key is missing', () => {
    expect(() => new OpenAIAdapter({} as OpenAIAdapterOptions)).toThrow('OpenAIAdapter requires an apiKey in options.');
  });

  it('should initialize with default model if not provided', () => {
    expect((adapter as any).model).toBe('gpt-3.5-turbo');
    expect((adapter as any).apiBaseUrl).toBe('https://api.openai.com/v1');
    expect(Logger.debug).toHaveBeenCalledWith('OpenAIAdapter initialized with model: gpt-3.5-turbo');
  });

  it('should initialize with provided model and apiBaseUrl', () => {
    const opts: OpenAIAdapterOptions = { apiKey: 'key', model: 'gpt-4', apiBaseUrl: 'http://localhost:8080' };
    const customAdapter = new OpenAIAdapter(opts);
    expect((customAdapter as any).model).toBe('gpt-4');
    expect((customAdapter as any).apiBaseUrl).toBe('http://localhost:8080');
  });

  // --- Non-Streaming Tests ---
  describe('call (non-streaming)', () => {
    it('should translate basic ArtStandardPrompt and call API', async () => {
      const mockApiResponse = {
        id: 'chatcmpl-123', object: 'chat.completion', created: 1677652288, model: 'gpt-3.5-turbo-0613',
        choices: [{ index: 0, message: { role: 'assistant', content: 'OpenAI says hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 9, completion_tokens: 12, total_tokens: 21 },
      };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Say hello' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Authorization': 'Bearer test-api-key' }),
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say hello' }], // Correct translation
            stream: false,
          }),
        })
      );

      expect(results.find(e => e.type === 'TOKEN')?.data).toBe('OpenAI says hello!');
      expect(results.find(e => e.type === 'METADATA')?.data).toMatchObject({
        stopReason: 'stop',
        inputTokens: 9,
        outputTokens: 12,
      });
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling OpenAI API'), expect.anything());
    });

    it('should translate ArtStandardPrompt with system prompt and history', async () => {
      const mockApiResponse = { choices: [{ message: { role: 'assistant', content: 'Understood history.' }, finish_reason: 'stop' }] };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

      const prompt: ArtStandardPrompt = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'My response' },
        { role: 'user', content: 'Second message' },
      ];
      await consumeStream(await adapter.call(prompt, defaultCallOptions));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are helpful.' },
              { role: 'user', content: 'First message' },
              { role: 'assistant', content: 'My response' },
              { role: 'user', content: 'Second message' },
            ],
            stream: false,
          }),
        })
      );
    });

    it('should translate ArtStandardPrompt with assistant tool calls', async () => {
        const mockApiResponse = { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'calculator', arguments: '{"expr":"2+2"}' } }] }, finish_reason: 'tool_calls' }] };
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

        const prompt: ArtStandardPrompt = [
            { role: 'user', content: 'What is 2+2?' },
            {
                role: 'assistant',
                content: null, // No text content
                tool_calls: [{
                    id: 'call_123',
                    type: 'function',
                    function: { name: 'calculator', arguments: '{"expr":"2+2"}' }
                }]
            }
        ];
        await consumeStream(await adapter.call(prompt, defaultCallOptions));

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'user', content: 'What is 2+2?' },
                        { role: 'assistant', content: null, tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'calculator', arguments: '{"expr":"2+2"}' } }] }
                    ],
                    stream: false,
                }),
            })
        );
        // Note: The adapter yields the text content (which is empty/null here) and metadata.
        // The agent is responsible for parsing tool calls from the raw response if needed,
        // though typically the LLM provides them directly in the 'message' object.
    });

     it('should translate ArtStandardPrompt with tool results', async () => {
        const mockApiResponse = { choices: [{ message: { role: 'assistant', content: 'The result is 4.' }, finish_reason: 'stop' }] };
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

        const prompt: ArtStandardPrompt = [
            { role: 'user', content: 'What is 2+2?' },
            { role: 'assistant', content: null, tool_calls: [{ id: 'call_abc', type: 'function', function: { name: 'calculator', arguments: '{"expression":"2+2"}' } }] },
            { role: 'tool_result', tool_call_id: 'call_abc', name: 'calculator', content: '4' } // Stringified result
        ];
        await consumeStream(await adapter.call(prompt, defaultCallOptions));

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'user', content: 'What is 2+2?' },
                        { role: 'assistant', content: null, tool_calls: [{ id: 'call_abc', type: 'function', function: { name: 'calculator', arguments: '{"expression":"2+2"}' } }] },
                        { role: 'tool', tool_call_id: 'call_abc', content: '4' } // Correct translation
                    ],
                    stream: false,
                }),
            })
        );
    });


    it('should include optional parameters in the API call payload', async () => {
      const mockApiResponse = { choices: [{ message: { role: 'assistant', content: 'Response with params.' }, finish_reason: 'stop' }] };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponse });

      const callOptions: CallOptions = {
        ...defaultCallOptions,
        temperature: 0.5,
        max_tokens: 100,
        top_p: 0.9,
        stop_sequences: ["\n"], // Test stop sequence mapping
      };
      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test params' }];
      await consumeStream(await adapter.call(prompt, callOptions));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST', // Ensure method is checked
          // We will check the body separately below by parsing it
        })
      );
       // Check the full body by parsing the JSON string
      const actualBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(actualBody).toMatchObject({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test params' }],
          temperature: 0.5,
          max_tokens: 100,
          top_p: 0.9,
          stop: ["\n"],
          stream: false,
      });
    });

    it('should handle API error response (non-200 status) by yielding ERROR', async () => {
      const errorBody = '{"error": {"message": "Invalid API key"}}';
      mockFetch.mockResolvedValueOnce({ ok: false, text: async () => errorBody, status: 401, statusText: 'Unauthorized' });

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test API error' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      const errorEvent = results.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data).toBeInstanceOf(ARTError);
      expect((errorEvent?.data as ARTError).code).toBe(ErrorCode.LLM_PROVIDER_ERROR);
      expect((errorEvent?.data as ARTError).message).toContain('OpenAI API request failed: 401 Unauthorized');
      expect(results.some(e => e.type === 'END')).toBe(true); // END should still be yielded
      expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('OpenAI API request failed with status 401'), expect.anything());
    });

     it('should handle invalid response structure (missing message) by yielding ERROR', async () => {
      const invalidResponse = { choices: [{ finish_reason: 'stop' }] }; // Missing message
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => invalidResponse });

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test invalid structure' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      const errorEvent = results.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data).toBeInstanceOf(ARTError);
      expect((errorEvent?.data as ARTError).code).toBe(ErrorCode.LLM_PROVIDER_ERROR);
      expect((errorEvent?.data as ARTError).message).toContain('Invalid response structure from OpenAI API: No message found');
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.error).toHaveBeenCalledWith('Invalid response structure from OpenAI API: No message found', expect.anything());
    });

     it('should handle fetch network error by yielding ERROR', async () => {
      const networkError = new Error('Network failed');
      mockFetch.mockRejectedValueOnce(networkError);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test network error' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      const errorEvent = results.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data).toBeInstanceOf(ARTError);
      expect((errorEvent?.data as ARTError).code).toBe(ErrorCode.LLM_PROVIDER_ERROR);
      expect((errorEvent?.data as ARTError).message).toContain('Network failed');
      expect((errorEvent?.data as ARTError).originalError).toBe(networkError);
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.error).toHaveBeenCalledWith('Error during OpenAI API call: Network failed', expect.anything());
    });

     it('should yield error if translation fails', async () => {
        const invalidPrompt: ArtStandardPrompt = [
            { role: 'tool_result', content: 'Result', name: 'tool', tool_call_id: undefined } // Missing tool_call_id
        ];

        const resultStream = await adapter.call(invalidPrompt, defaultCallOptions);
        const results = await consumeStream(resultStream);

        expect(mockFetch).not.toHaveBeenCalled(); // API should not be called
        const errorEvent = results.find(e => e.type === 'ERROR');
        expect(errorEvent).toBeDefined();
        expect(errorEvent?.data).toBeInstanceOf(ARTError);
        expect((errorEvent?.data as ARTError).code).toBe(ErrorCode.PROMPT_TRANSLATION_FAILED);
        expect((errorEvent?.data as ARTError).message).toContain("missing required 'tool_call_id'");
        expect(results.some(e => e.type === 'END')).toBe(true);
        expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating ArtStandardPrompt to OpenAI format'), expect.anything());
    });
  });

  // --- Streaming Tests ---
  describe('call (streaming)', () => {
      // Helper to create a mock ReadableStream from SSE lines
      function createMockStream(lines: string[]): ReadableStream<Uint8Array> {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
              async start(controller) {
                  for (const line of lines) {
                      controller.enqueue(encoder.encode(line + '\n'));
                      await new Promise(resolve => setTimeout(resolve, 1)); // Simulate async nature
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n')); // Add DONE signal
                  controller.close();
              }
          });
          return stream;
      }

      it('should call API with stream flag and yield TOKEN events', async () => {
          const mockStreamLines = [
              'data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":17000,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}',
              'data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":17000,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}',
              'data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":17000,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}',
              'data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":17000,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
          ];
          const mockStream = createMockStream(mockStreamLines);
          mockFetch.mockResolvedValueOnce({ ok: true, body: mockStream });

          const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Stream hello' }];
          const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
          const resultStream = await adapter.call(prompt, callOptions);
          const results = await consumeStream(resultStream);

          expect(mockFetch).toHaveBeenCalledOnce();
          expect(mockFetch).toHaveBeenCalledWith(
              expect.any(String),
              expect.objectContaining({
                  body: expect.stringContaining('"stream":true'),
              })
          );
          const actualBody = JSON.parse(mockFetch.mock.calls[0][1].body);
          expect(actualBody.stream).toBe(true);

          const tokens = results.filter(e => e.type === 'TOKEN').map(e => e.data);
          expect(tokens).toEqual(['Hello', ' world']); // Note: Initial empty content delta is ignored

          const metadataEvent = results.find(e => e.type === 'METADATA');
          expect(metadataEvent).toBeDefined();
          expect(metadataEvent?.data?.stopReason).toBe('stop');
          // Token counts are estimates in stream mode for now
          expect(metadataEvent?.data?.outputTokens).toBe(2);

          expect(results.some(e => e.type === 'END')).toBe(true);
      });

       it('should handle stream error during fetch', async () => {
          const networkError = new Error('Stream connection failed');
          mockFetch.mockRejectedValueOnce(networkError); // Error on initial call

          const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test stream error' }];
          const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
          const resultStream = await adapter.call(prompt, callOptions);
          const results = await consumeStream(resultStream);

          const errorEvent = results.find(e => e.type === 'ERROR');
          expect(errorEvent).toBeDefined();
          expect(errorEvent?.data).toBeInstanceOf(ARTError);
          expect((errorEvent?.data as ARTError).message).toContain('Stream connection failed');
          expect(results.some(e => e.type === 'END')).toBe(true);
      });

       it('should handle error within the stream itself (e.g., read error)', async () => {
          const streamError = new Error('Chunk read error');
          const stream = new ReadableStream({
              async pull(controller) {
                  controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Good "}}]}\n'));
                  await new Promise(resolve => setTimeout(resolve, 1));
                  controller.error(streamError); // Simulate error during read
              }
          });
          mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

          const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test stream error mid' }];
          const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
          const resultStream = await adapter.call(prompt, callOptions);
          const results = await consumeStream(resultStream);

          expect(results.find(e => e.type === 'TOKEN')?.data).toBe('Good ');
          const errorEvent = results.find(e => e.type === 'ERROR');
          expect(errorEvent).toBeDefined();
          expect(errorEvent?.data).toBeInstanceOf(ARTError);
          expect((errorEvent?.data as ARTError).message).toContain('Error reading OpenAI stream: Chunk read error');
          expect(results.some(e => e.type === 'END')).toBe(true); // END should still be yielded
      });

       it('should handle invalid JSON within the stream', async () => {
          const mockStreamLines = [
              'data: {"choices":[{"delta":{"content":"Valid "}}]}',
              'data: {invalid json', // Invalid chunk
              'data: {"choices":[{"delta":{"content":" more"}}]}',
          ];
          const mockStream = createMockStream(mockStreamLines);
          mockFetch.mockResolvedValueOnce({ ok: true, body: mockStream });

          const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test invalid stream json' }];
          const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
          const resultStream = await adapter.call(prompt, callOptions);
          const results = await consumeStream(resultStream);

          const tokens = results.filter(e => e.type === 'TOKEN').map(e => e.data);
          expect(tokens).toEqual(['Valid ', ' more']); // Should skip the invalid chunk

          // Check if a warning was logged
          expect(Logger.warn).toHaveBeenCalledWith(
              expect.stringContaining('Failed to parse OpenAI stream chunk'),
              expect.anything()
          );

          expect(results.some(e => e.type === 'END')).toBe(true);
          // No ERROR event should be yielded for just a parse warning by default
          expect(results.some(e => e.type === 'ERROR')).toBe(false);
      });

      // TODO: Add tests for streaming tool calls once aggregation is properly implemented
  });
});