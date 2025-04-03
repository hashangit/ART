// src/adapters/reasoning/deepseek.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DeepSeekAdapter, DeepSeekAdapterOptions } from './deepseek';
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

describe('DeepSeekAdapter', () => {
  let adapter: DeepSeekAdapter;
  const defaultOptions: DeepSeekAdapterOptions = { apiKey: 'test-deepseek-key' };
  const defaultCallOptions: CallOptions = { threadId: 't-deepseek' };

  beforeEach(() => {
    adapter = new DeepSeekAdapter(defaultOptions);
    vi.clearAllMocks(); // Clear mocks including fetch and Logger
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Ensure fetch mock doesn't leak
  });

  it('should throw error if API key is missing', () => {
    expect(() => new DeepSeekAdapter({} as DeepSeekAdapterOptions)).toThrow('DeepSeek API key is required.');
  });

  it('should initialize with default model and apiBaseUrl if not provided', () => {
    expect((adapter as any).model).toBe('deepseek-chat');
    expect((adapter as any).apiBaseUrl).toBe('https://api.deepseek.com/v1');
    expect(Logger.debug).toHaveBeenCalledWith('DeepSeekAdapter initialized with model: deepseek-chat');
  });

  it('should initialize with provided model and apiBaseUrl', () => {
    const opts: DeepSeekAdapterOptions = { apiKey: 'key', model: 'deepseek-coder', apiBaseUrl: 'http://localhost:8084' };
    const customAdapter = new DeepSeekAdapter(opts);
    expect((customAdapter as any).model).toBe('deepseek-coder');
    expect((customAdapter as any).apiBaseUrl).toBe('http://localhost:8084');
  });

  it('should make a successful API call with basic prompt', async () => {
    const mockResponse = {
      id: 'ds-123', object: 'chat.completion', created: 1677652288, model: 'deepseek-chat',
      choices: [{ index: 0, message: { role: 'assistant', content: ' DeepSeek says hello! ' }, finish_reason: 'stop' }],
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

    expect(result).toBe('DeepSeek says hello!'); // Should be trimmed
    expect(mockFetch).toHaveBeenCalledOnce();
    const expectedUrl = `https://api.deepseek.com/v1/chat/completions`;
    expect(mockFetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${defaultOptions.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    );
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling DeepSeek API'), expect.anything());
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('DeepSeek API call successful'), expect.anything());
  });

  it('should include optional parameters in the API call payload', async () => {
    const mockResponse = { choices: [{ message: { content: 'Response with params.' } }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const callOptions: CallOptions = {
      ...defaultCallOptions,
      temperature: 0.6,
      max_tokens: 600,
      topP: 0.7, // Test alias
      stop: ['\nObservation:'], // Test alias
    };
    await adapter.call('Test params', callOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Test params' }],
          temperature: 0.6,
          max_tokens: 600,
          top_p: 0.7,
          stop: ['\nObservation:'],
        }),
      })
    );
  });

  it('should handle API error response (non-200 status)', async () => {
    const errorBody = JSON.stringify({ error: { message: 'Authentication error.' } });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => errorBody,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(adapter.call('Test API error', defaultCallOptions)).rejects.toThrow(
        'DeepSeek API request failed: 401 Unauthorized - Authentication error.' // Parsed message
    );
    expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('DeepSeek API request failed with status 401'),
        expect.anything()
    );
  });

   it('should handle invalid response structure (missing content)', async () => {
    const invalidResponse = { choices: [{ message: {} }] }; // Missing content
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => invalidResponse });

    await expect(adapter.call('Test invalid structure', defaultCallOptions)).rejects.toThrow(
        'Invalid response structure from DeepSeek API: No content found.'
    );
     expect(Logger.error).toHaveBeenCalledWith(
        'Invalid response structure from DeepSeek API',
        expect.objectContaining({ responseData: invalidResponse })
    );
  });

   it('should handle fetch network error', async () => {
    const networkError = new Error('Network connection failed');
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(adapter.call('Test network error', defaultCallOptions)).rejects.toThrow('Network connection failed');
    expect(Logger.error).toHaveBeenCalledWith(
        'Error during DeepSeek API call: Network connection failed',
        expect.objectContaining({ error: networkError })
    );
  });

  // Other tests like non-string prompt handling would be similar
});