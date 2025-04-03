// src/adapters/reasoning/anthropic.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnthropicAdapter, AnthropicAdapterOptions } from './anthropic';
import { Logger } from '../../utils/logger';
import { CallOptions } from '../../types';

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

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  const defaultOptions: AnthropicAdapterOptions = { apiKey: 'test-anthropic-key' };
  const defaultCallOptions: CallOptions = { threadId: 't-anthropic' };
  const defaultMaxTokens = 1024; // From adapter implementation

  beforeEach(() => {
    adapter = new AnthropicAdapter(defaultOptions);
    vi.clearAllMocks(); // Clear mocks including fetch and Logger
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Ensure fetch mock doesn't leak
  });

  it('should throw error if API key is missing', () => {
    expect(() => new AnthropicAdapter({} as AnthropicAdapterOptions)).toThrow('Anthropic API key is required.');
  });

  it('should initialize with default model and API version if not provided', () => {
    expect((adapter as any).model).toBe('claude-3-haiku-20240307');
    expect((adapter as any).apiVersion).toBe('2023-06-01');
    expect((adapter as any).apiBaseUrl).toBe('https://api.anthropic.com/v1');
    expect(Logger.debug).toHaveBeenCalledWith('AnthropicAdapter initialized with model: claude-3-haiku-20240307, version: 2023-06-01');
  });

  it('should initialize with provided model, version, and apiBaseUrl', () => {
    const opts: AnthropicAdapterOptions = { apiKey: 'key', model: 'claude-3-opus-20240229', apiVersion: '2024-01-01', apiBaseUrl: 'http://localhost:8082' };
    const customAdapter = new AnthropicAdapter(opts);
    expect((customAdapter as any).model).toBe('claude-3-opus-20240229');
    expect((customAdapter as any).apiVersion).toBe('2024-01-01');
    expect((customAdapter as any).apiBaseUrl).toBe('http://localhost:8082');
  });

  it('should make a successful API call with basic prompt', async () => {
    const mockResponse = {
      id: 'msg_123', type: 'message', role: 'assistant', model: 'claude-3...',
      content: [{ type: 'text', text: ' Anthropic says hello! ' }],
      stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: 'OK',
    });

    const prompt = 'Say hello';
    const result = await adapter.call(prompt, defaultCallOptions);

    expect(result).toBe('Anthropic says hello!'); // Should be trimmed
    expect(mockFetch).toHaveBeenCalledOnce();
    const expectedUrl = `https://api.anthropic.com/v1/messages`;
    expect(mockFetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': defaultOptions.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: defaultMaxTokens, // Default max_tokens
        }),
      })
    );
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling Anthropic API'), expect.anything());
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Anthropic API call successful'), expect.anything());
  });

   it('should handle non-string prompt by coercing to string', async () => {
     const mockResponse = { content: [{ type: 'text', text: 'Processed object.' }] };
     mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });
     const prompt = { value: true }; // Non-string prompt
     await adapter.call(prompt as any, defaultCallOptions); // Cast to any for test

     expect(Logger.warn).toHaveBeenCalledWith('AnthropicAdapter received non-string prompt. Treating as string.');
     expect(mockFetch).toHaveBeenCalledWith(
       expect.any(String),
       expect.objectContaining({
         body: JSON.stringify({
           model: 'claude-3-haiku-20240307',
           messages: [{ role: 'user', content: '[object Object]' }], // Default string coercion
           max_tokens: defaultMaxTokens,
         }),
       })
     );
  });

  it('should include optional parameters in the API call payload', async () => {
    const mockResponse = { content: [{ type: 'text', text: 'Response with params.' }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const callOptions: CallOptions = {
      ...defaultCallOptions,
      temperature: 0.7,
      max_tokens: 500, // Explicitly set max_tokens
      topP: 0.8,
      topK: 40,
      stopSequences: ['\nHuman:'],
      system: 'You are a helpful bot.', // System prompt
    };
    await adapter.call('Test params', callOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Test params' }],
          system: 'You are a helpful bot.',
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.8,
          top_k: 40,
          stop_sequences: ['\nHuman:'],
        }),
      })
    );
  });

  it('should use default max_tokens if not provided in options', async () => {
    const mockResponse = { content: [{ type: 'text', text: 'Response default tokens.' }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    await adapter.call('Test default tokens', defaultCallOptions); // No max_tokens in options

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining(`"max_tokens":${defaultMaxTokens}`), // Check default is used
      })
    );
  });


  it('should handle API error response (non-200 status) with JSON body', async () => {
    const errorBody = JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'Invalid API key.' } });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => errorBody,
      json: async () => JSON.parse(errorBody), // Mock json() as well if needed
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(adapter.call('Test API error', defaultCallOptions)).rejects.toThrow(
        'Anthropic API request failed: 401 Unauthorized - Invalid API key.' // Parsed message
    );
    expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Anthropic API request failed with status 401'),
        expect.anything()
    );
  });

  it('should handle API error response (non-200 status) with non-JSON body', async () => {
    const errorBody = 'Internal Server Error';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => errorBody,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(adapter.call('Test API error non-json', defaultCallOptions)).rejects.toThrow(
        'Anthropic API request failed: 500 Internal Server Error - Internal Server Error' // Raw text body
    );
  });

   it('should handle invalid response structure (missing text content)', async () => {
    const invalidResponse = { content: [{ type: 'other', value: '...' }] }; // No text content
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => invalidResponse });

    await expect(adapter.call('Test invalid structure', defaultCallOptions)).rejects.toThrow(
        'Invalid response structure from Anthropic API: No text content found.'
    );
     expect(Logger.error).toHaveBeenCalledWith(
        'Invalid response structure from Anthropic API: No text content found',
        expect.objectContaining({ responseData: invalidResponse })
    );
  });

   it('should handle fetch network error', async () => {
    const networkError = new Error('Network connection failed');
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(adapter.call('Test network error', defaultCallOptions)).rejects.toThrow('Network connection failed');
    expect(Logger.error).toHaveBeenCalledWith(
        'Error during Anthropic API call: Network connection failed',
        expect.objectContaining({ error: networkError })
    );
  });

  // TODO: Add tests for system prompt and history handling once implemented
});