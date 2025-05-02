// src/adapters/reasoning/gemini.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiAdapter, GeminiAdapterOptions } from './gemini';
import { Logger } from '../../utils/logger';
import { CallOptions, ArtStandardPrompt, StreamEvent } from '../../types'; // Removed LLMMetadata
import { GoogleGenAI } from '@google/genai'; // Import SDK for mocking
import { ARTError, ErrorCode } from '../../errors';

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

// Mock the @google/genai SDK
const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();
const mockModels = {
  generateContent: mockGenerateContent,
  generateContentStream: mockGenerateContentStream,
};
const mockGenAIInstance = {
  models: mockModels,
};

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => mockGenAIInstance), // Mock constructor to return our instance
}));


describe('GeminiAdapter (Refactored)', () => {
  let adapter: GeminiAdapter;
  const defaultOptions: GeminiAdapterOptions = { apiKey: 'test-gemini-key' };
  const defaultCallOptions: CallOptions = { threadId: 't-gemini' };

  beforeEach(() => {
    vi.clearAllMocks(); // Clear all mocks before each test
    adapter = new GeminiAdapter(defaultOptions);
  });

  it('should throw error if API key is missing', () => {
    // Need to clear the mock constructor for this specific test
    (GoogleGenAI as any).mockImplementationOnce(() => { throw new Error('Simulated constructor error'); });
    expect(() => new GeminiAdapter({} as GeminiAdapterOptions)).toThrow('GeminiAdapter requires an apiKey in options.');
  });

  it('should initialize with default model', () => {
    expect((adapter as any).defaultModel).toBe('gemini-1.5-flash-latest');
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-gemini-key' });
    expect(Logger.debug).toHaveBeenCalledWith('GeminiAdapter initialized with default model: gemini-1.5-flash-latest');
  });

  it('should initialize with provided model', () => {
    const opts: GeminiAdapterOptions = { apiKey: 'key', model: 'gemini-pro' };
    const customAdapter = new GeminiAdapter(opts);
    expect((customAdapter as any).defaultModel).toBe('gemini-pro');
  });

  // --- Non-Streaming Tests ---
  describe('call (non-streaming)', () => {
    it('should translate basic ArtStandardPrompt and call generateContent', async () => {
      const mockApiResponse = {
        text: () => 'Gemini says hello!', // Simplified mock response
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      };
      mockGenerateContent.mockResolvedValueOnce(mockApiResponse);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Say hello' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      expect(mockGenerateContent).toHaveBeenCalledOnce();
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-1.5-flash-latest',
        contents: [{ role: 'user', parts: [{ text: 'Say hello' }] }],
        config: {}, // Empty config by default
      });

      expect(results.find(e => e.type === 'TOKEN')?.data).toBe('Gemini says hello!');
      expect(results.find(e => e.type === 'METADATA')?.data).toMatchObject({
        stopReason: 'STOP',
        inputTokens: 10,
        outputTokens: 5,
      });
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling Gemini SDK'), expect.anything());
    });

    it('should translate ArtStandardPrompt with system prompt and history', async () => {
      const mockApiResponse = { text: () => 'Understood history.' };
      mockGenerateContent.mockResolvedValueOnce(mockApiResponse);

      const prompt: ArtStandardPrompt = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'My response' },
        { role: 'user', content: 'Second message' },
      ];
      await consumeStream(await adapter.call(prompt, defaultCallOptions));

      expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
        contents: [
          { role: 'user', parts: [{ text: 'You are helpful.\n\nFirst message' }] }, // System merged
          { role: 'model', parts: [{ text: 'My response' }] },
          { role: 'user', parts: [{ text: 'Second message' }] },
        ],
      }));
    });

     it('should translate ArtStandardPrompt with tool calls', async () => {
        const mockApiResponse = {
            text: () => '', // No text response when requesting tools
            candidates: [{
                content: {
                    role: 'model',
                    parts: [{ functionCall: { name: 'calculator', args: { expression: '2+2' } } }]
                },
                finishReason: 'TOOL_USE', // Or similar
            }],
            usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
        };
        mockGenerateContent.mockResolvedValueOnce(mockApiResponse);

        const prompt: ArtStandardPrompt = [
            { role: 'user', content: 'What is 2+2?' },
            {
                role: 'assistant',
                content: null, // No text content
                tool_calls: [{
                    id: 'call_123',
                    type: 'function',
                    function: { name: 'calculator', arguments: '{"expression":"2+2"}' }
                }]
            }
        ];
        // We don't consume the stream here, just check the call to generateContent
        await adapter.call(prompt, defaultCallOptions);

        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            contents: [
                { role: 'user', parts: [{ text: 'What is 2+2?' }] },
                { role: 'model', parts: [{ functionCall: { name: 'calculator', args: { expression: '2+2' } } }] }
            ],
        }));
        // Note: The adapter's `call` method itself doesn't return the raw tool call structure,
        // it yields stream events. The test verifies the input to the SDK.
        // A full E2E test would verify the agent correctly handles the LLM response containing tool calls.
    });

     it('should translate ArtStandardPrompt with tool results', async () => {
        const mockApiResponse = { text: () => 'The result is 4.' };
        mockGenerateContent.mockResolvedValueOnce(mockApiResponse);

        const prompt: ArtStandardPrompt = [
            { role: 'user', content: 'What is 2+2?' },
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'call_abc', type: 'function', function: { name: 'calculator', arguments: '{"expression":"2+2"}' } }]
            },
            {
                role: 'tool_result',
                tool_call_id: 'call_abc',
                name: 'calculator',
                content: '4' // Stringified result
            }
        ];
        await consumeStream(await adapter.call(prompt, defaultCallOptions));

        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            contents: [
                { role: 'user', parts: [{ text: 'What is 2+2?' }] },
                { role: 'model', parts: [{ functionCall: { name: 'calculator', args: { expression: '2+2' } } }] },
                { role: 'user', parts: [{ functionResponse: { name: 'calculator', response: { content: '4' } } }] } // Tool result mapped to user role with functionResponse
            ],
        }));
    });


    it('should include optional generation parameters', async () => {
      const mockApiResponse = { text: () => 'Response with params.' };
      mockGenerateContent.mockResolvedValueOnce(mockApiResponse);

      const callOptions: CallOptions = {
        ...defaultCallOptions,
        temperature: 0.6,
        maxOutputTokens: 150, // Use camelCase for SDK
        topP: 0.9,
        stopSequences: ['\nObservation:'],
      };
      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test params' }];
      await consumeStream(await adapter.call(prompt, callOptions));

      expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
        config: {
          temperature: 0.6,
          maxOutputTokens: 150,
          topP: 0.9,
          stopSequences: ['\nObservation:'],
        },
      }));
    });

    it('should handle SDK error during generateContent', async () => {
      const sdkError = new Error('Invalid API Key');
      mockGenerateContent.mockRejectedValueOnce(sdkError);

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test SDK error' }];
      const resultStream = await adapter.call(prompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      expect(results.find(e => e.type === 'ERROR')?.data).toBe(sdkError);
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during Gemini SDK call: Invalid API Key'),
        expect.anything()
      );
    });

     it('should handle blocked content response from SDK', async () => {
        const blockedResponse = {
            text: () => '', // No text
            promptFeedback: { blockReason: 'SAFETY' }, // Block reason provided
            candidates: [], // No candidates
        };
        mockGenerateContent.mockResolvedValueOnce(blockedResponse);

        const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Risky prompt' }];
        const resultStream = await adapter.call(prompt, defaultCallOptions);
        const results = await consumeStream(resultStream);

        const errorEvent = results.find(e => e.type === 'ERROR');
        expect(errorEvent).toBeDefined();
        expect(errorEvent?.data).toBeInstanceOf(Error);
        expect((errorEvent?.data as Error).message).toContain('Gemini API call blocked: SAFETY');
        expect(results.some(e => e.type === 'END')).toBe(true);
        expect(Logger.error).toHaveBeenCalledWith('Gemini SDK call blocked.', expect.anything());
    });

     it('should handle invalid response structure (no text/candidate) from SDK', async () => {
        const invalidResponse = {
            text: () => undefined, // No text method or returns undefined
            candidates: [], // No candidates
        };
        mockGenerateContent.mockResolvedValueOnce(invalidResponse);

        const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Weird prompt' }];
        const resultStream = await adapter.call(prompt, defaultCallOptions);
        const results = await consumeStream(resultStream);

        const errorEvent = results.find(e => e.type === 'ERROR');
        expect(errorEvent).toBeDefined();
        expect(errorEvent?.data).toBeInstanceOf(Error);
        expect((errorEvent?.data as Error).message).toContain('Invalid response structure from Gemini SDK: No text content found');
        expect(results.some(e => e.type === 'END')).toBe(true);
        expect(Logger.error).toHaveBeenCalledWith('Invalid response structure from Gemini SDK: No text content found', expect.anything());
    });

     it('should yield error if translation fails', async () => {
        const invalidPrompt: ArtStandardPrompt = [
            { role: 'tool_result', content: 'Result', name: undefined, tool_call_id: undefined } // Missing required fields
        ];

        const resultStream = await adapter.call(invalidPrompt, defaultCallOptions);
        const results = await consumeStream(resultStream);

        expect(mockGenerateContent).not.toHaveBeenCalled(); // SDK should not be called
        const errorEvent = results.find(e => e.type === 'ERROR');
        expect(errorEvent).toBeDefined();
        expect(errorEvent?.data).toBeInstanceOf(ARTError);
        expect((errorEvent?.data as ARTError).code).toBe(ErrorCode.PROMPT_TRANSLATION_FAILED);
        expect((errorEvent?.data as ARTError).message).toContain("missing required 'tool_call_id' or 'name'");
        expect(results.some(e => e.type === 'END')).toBe(true);
        expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating ArtStandardPrompt to Gemini format'), expect.anything());
    });

  });

  // --- Streaming Tests ---
  describe('call (streaming)', () => {
      it('should call generateContentStream and yield events', async () => {
          // Mock the stream response
          const mockStream = (async function*() {
              yield { text: () => 'Hello ' };
              yield { text: () => 'World', usageMetadata: { promptTokenCount: 5 } }; // Add some metadata mid-stream
              yield { text: () => '!', candidates: [{ finishReason: 'STOP' }], usageMetadata: { candidatesTokenCount: 15 } }; // Final chunk with reason and more metadata
          })();
          mockGenerateContentStream.mockResolvedValueOnce(mockStream);

          const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Stream hello' }];
          const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
          const resultStream = await adapter.call(prompt, callOptions);
          const results = await consumeStream(resultStream);

          expect(mockGenerateContentStream).toHaveBeenCalledOnce();
          expect(mockGenerateContentStream).toHaveBeenCalledWith({
              model: 'gemini-1.5-flash-latest',
              contents: [{ role: 'user', parts: [{ text: 'Stream hello' }] }],
              config: {},
          });

          const tokens = results.filter(e => e.type === 'TOKEN').map(e => e.data);
          expect(tokens).toEqual(['Hello ', 'World', '!']);

          const metadataEvent = results.find(e => e.type === 'METADATA');
          expect(metadataEvent).toBeDefined();
          expect(metadataEvent?.data).toMatchObject({
              stopReason: 'STOP',
              inputTokens: 5, // From second chunk
              outputTokens: 15, // From last chunk
              providerRawUsage: { candidatesTokenCount: 15 }, // Raw usage from last chunk overwrites previous
          });

          expect(results.some(e => e.type === 'END')).toBe(true);
      });

       it('should handle SDK error during generateContentStream', async () => {
          const sdkError = new Error('Stream connection failed');
          mockGenerateContentStream.mockRejectedValueOnce(sdkError); // Error on initial call

          const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test stream error' }];
          const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
          const resultStream = await adapter.call(prompt, callOptions);
          const results = await consumeStream(resultStream);

          expect(results.find(e => e.type === 'ERROR')?.data).toBe(sdkError);
          expect(results.some(e => e.type === 'END')).toBe(true);
          expect(Logger.error).toHaveBeenCalledWith(
              expect.stringContaining('Error during Gemini SDK call: Stream connection failed'),
              expect.anything()
          );
      });

       it('should handle error within the stream itself', async () => {
          const streamError = new Error('Chunk processing error');
          const mockStream = (async function*() {
              yield { text: () => 'Good chunk ' };
              throw streamError; // Error after first chunk
          })();
          mockGenerateContentStream.mockResolvedValueOnce(mockStream);

          const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Test stream error mid' }];
          const callOptions: CallOptions = { ...defaultCallOptions, stream: true };
          const resultStream = await adapter.call(prompt, callOptions);
          const results = await consumeStream(resultStream);

          expect(results.find(e => e.type === 'TOKEN')?.data).toBe('Good chunk ');
          expect(results.find(e => e.type === 'ERROR')?.data).toBe(streamError);
          expect(results.some(e => e.type === 'END')).toBe(true); // END should still be yielded
          expect(Logger.error).toHaveBeenCalledWith(
              expect.stringContaining('Error during Gemini SDK call: Chunk processing error'),
              expect.anything()
          );
      });
  });

});

// Helper function to consume the async iterable stream into an array
async function consumeStream(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
    const events: StreamEvent[] = [];
    for await (const event of stream) {
        events.push(event);
    }
    return events;
}