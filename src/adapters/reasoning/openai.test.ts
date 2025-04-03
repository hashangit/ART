// src/adapters/reasoning/openai.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenAIAdapter, OpenAIAdapterOptions } from './openai';
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

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  const defaultOptions: OpenAIAdapterOptions = { apiKey: 'test-api-key' };
  const defaultCallOptions: CallOptions = { threadId: 't1' };

  beforeEach(() => {
    adapter = new OpenAIAdapter(defaultOptions);
    vi.clearAllMocks(); // Clear mocks including fetch and Logger
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Ensure fetch mock doesn't leak
  });

  it('should throw error if API key is missing', () => {
    expect(() => new OpenAIAdapter({} as OpenAIAdapterOptions)).toThrow('OpenAI API key is required.');
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

  it('should make a successful API call with basic prompt', async () => {
    const mockResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-3.5-turbo-0613',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Hello there!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 9, completion_tokens: 12, total_tokens: 21 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: 'OK',
    });

    const prompt = 'Say hello';
    const result = await adapter.call(prompt, defaultCallOptions);

    expect(result).toBe('Hello there!');
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    );
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling OpenAI API'), expect.anything());
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('OpenAI API call successful'), expect.anything());
  });

  it('should handle non-string prompt by coercing to string', async () => {
     const mockResponse = { choices: [{ message: { content: 'Processed object.' } }] };
     mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });
     const prompt = { key: 'value' }; // Non-string prompt
     await adapter.call(prompt as any, defaultCallOptions); // Cast to any for test

     expect(Logger.warn).toHaveBeenCalledWith('OpenAIAdapter received non-string prompt. Treating as string.');
     expect(mockFetch).toHaveBeenCalledWith(
       expect.any(String),
       expect.objectContaining({
         body: JSON.stringify({
           model: 'gpt-3.5-turbo',
           messages: [{ role: 'user', content: '[object Object]' }], // Default string coercion
         }),
       })
     );
  });

  it('should include optional parameters in the API call payload', async () => {
    const mockResponse = { choices: [{ message: { content: 'Response with params.' } }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const callOptions: CallOptions = {
      ...defaultCallOptions,
      temperature: 0.5,
      max_tokens: 100,
      someOtherParam: 'value', // Test arbitrary param passing
    };
    await adapter.call('Test params', callOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test params' }],
          temperature: 0.5,
          max_tokens: 100,
          someOtherParam: 'value',
        }),
      })
    );
  });

  it('should handle API error response (non-200 status)', async () => {
    const errorBody = '{"error": {"message": "Invalid API key"}}';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => errorBody, // Use text() for error body
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(adapter.call('Test API error', defaultCallOptions)).rejects.toThrow(
        'OpenAI API request failed: 401 Unauthorized - {"error": {"message": "Invalid API key"}}'
    );
    expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI API request failed with status 401'),
        expect.anything()
    );
  });

   it('should handle invalid response structure (missing content)', async () => {
    const invalidResponse = { choices: [{ message: {} }] }; // Missing content
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => invalidResponse });

    await expect(adapter.call('Test invalid structure', defaultCallOptions)).rejects.toThrow(
        'Invalid response structure from OpenAI API: No content found.'
    );
     expect(Logger.error).toHaveBeenCalledWith(
        'Invalid response structure from OpenAI API',
        expect.objectContaining({ responseData: invalidResponse })
    );
  });

   it('should handle fetch network error', async () => {
    const networkError = new Error('Network failed');
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(adapter.call('Test network error', defaultCallOptions)).rejects.toThrow('Network failed');
    expect(Logger.error).toHaveBeenCalledWith(
        'Error during OpenAI API call: Network failed',
        expect.objectContaining({ error: networkError })
    );
  });

  // TODO: Add tests for system prompt and history handling once implemented
  // TODO: Add tests for onThought callback once streaming is implemented
});