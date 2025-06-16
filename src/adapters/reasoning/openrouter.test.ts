// src/adapters/reasoning/openrouter.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenRouterAdapter, OpenRouterAdapterOptions } from './openrouter';
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

describe('OpenRouterAdapter', () => {
  let adapter: OpenRouterAdapter;
  const defaultOptions: OpenRouterAdapterOptions = {
    apiKey: 'test-openrouter-key',
    model: 'google/gemini-pro', // Example required model
  };
  const defaultCallOptions: CallOptions = { 
  threadId: 't-openrouter',
  providerConfig: {
    providerName: 'openrouter',
    modelId: 'anthropic/claude-3.5-sonnet',
    adapterOptions: { apiKey: 'test-openrouter-key' }
  }
};

  beforeEach(() => {
    adapter = new OpenRouterAdapter(defaultOptions);
    vi.clearAllMocks(); // Clear mocks including fetch and Logger
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Ensure fetch mock doesn't leak
  });

  it('should throw error if API key is missing', () => {
    expect(() => new OpenRouterAdapter({ model: 'test/model' } as OpenRouterAdapterOptions)).toThrow('OpenRouterAdapter requires an apiKey in options.');
  });

  it('should throw error if model is missing', () => {
    expect(() => new OpenRouterAdapter({ apiKey: 'key' } as OpenRouterAdapterOptions)).toThrow('OpenRouterAdapter requires a model identifier in options (e.g., \'google/gemini-pro\').');
  });

  it('should initialize with default apiBaseUrl if not provided', () => {
    expect((adapter as any).model).toBe('google/gemini-pro');
    expect((adapter as any).apiBaseUrl).toBe('https://openrouter.ai/api/v1');
    expect(Logger.debug).toHaveBeenCalledWith('OpenRouterAdapter initialized for model: google/gemini-pro');
  });

  it('should initialize with provided apiBaseUrl, siteUrl, and appName', () => {
    const opts: OpenRouterAdapterOptions = {
        apiKey: 'key',
        model: 'anthropic/claude-3-haiku',
        apiBaseUrl: 'http://localhost:8083',
        siteUrl: 'https://my-site.com',
        appName: 'My Test App'
    };
    const customAdapter = new OpenRouterAdapter(opts);
    expect((customAdapter as any).model).toBe('anthropic/claude-3-haiku');
    expect((customAdapter as any).apiBaseUrl).toBe('http://localhost:8083');
    expect((customAdapter as any).siteUrl).toBe('https://my-site.com');
    expect((customAdapter as any).appName).toBe('My Test App');
  });

  it('should make a successful API call with basic prompt and default headers', async () => {
    const mockResponse = {
      id: 'or-123', object: 'chat.completion', created: 1677652288, model: 'google/gemini-pro',
      choices: [{ index: 0, message: { role: 'assistant', content: ' OpenRouter says hello! ' }, finish_reason: 'stop' }],
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

    expect(result).toBe('OpenRouter says hello!'); // Should be trimmed
    expect(mockFetch).toHaveBeenCalledOnce();
    const expectedUrl = `https://openrouter.ai/api/v1/chat/completions`;
    expect(mockFetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        headers: { // Default headers only
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${defaultOptions.apiKey}`,
        },
        body: JSON.stringify({
          model: defaultOptions.model, // Use the specific model
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    );
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling OpenRouter API'), expect.anything());
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('OpenRouter API call successful'), expect.anything());
  });

  it('should include optional parameters and custom headers in the API call', async () => {
     const optsWithHeaders: OpenRouterAdapterOptions = {
        ...defaultOptions,
        siteUrl: 'https://example.com/art',
        appName: 'ART-Test-Suite'
    };
    const adapterWithHeaders = new OpenRouterAdapter(optsWithHeaders);
    const mockResponse = { choices: [{ message: { content: 'Response with params.' } }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const callOptions: CallOptions = {
      ...defaultCallOptions,
      temperature: 0.7,
      max_tokens: 500,
      topP: 0.8, // Test alias
      stop: ['\nObservation:'], // Test alias
    };
    await adapterWithHeaders.call('Test params', callOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
         headers: { // Check for custom headers
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${defaultOptions.apiKey}`,
          'HTTP-Referer': optsWithHeaders.siteUrl,
          'X-Title': optsWithHeaders.appName,
        },
        body: JSON.stringify({
          model: defaultOptions.model,
          messages: [{ role: 'user', content: 'Test params' }],
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.8,
          stop: ['\nObservation:'],
        }),
      })
    );
  });

  it('should handle API error response (non-200 status)', async () => {
    const errorBody = JSON.stringify({ error: { message: 'Invalid model requested.' } });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => errorBody,
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(adapter.call('Test API error', defaultCallOptions)).rejects.toThrow(
        'OpenRouter API request failed: 400 Bad Request - Invalid model requested.' // Parsed message
    );
    expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('OpenRouter API request failed with status 400'),
        expect.anything()
    );
  });

   it('should handle invalid response structure (missing content)', async () => {
    const invalidResponse = { choices: [{ message: {} }] }; // Missing content
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => invalidResponse });

    await expect(adapter.call('Test invalid structure', defaultCallOptions)).rejects.toThrow(
        'Invalid response structure from OpenRouter API: No content found.'
    );
     expect(Logger.error).toHaveBeenCalledWith(
        'Invalid response structure from OpenRouter API',
        expect.objectContaining({ responseData: invalidResponse })
    );
  });

   it('should handle fetch network error', async () => {
    const networkError = new Error('Network connection failed');
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(adapter.call('Test network error', defaultCallOptions)).rejects.toThrow('Network connection failed');
    expect(Logger.error).toHaveBeenCalledWith(
        'Error during OpenRouter API call: Network connection failed',
        expect.objectContaining({ error: networkError })
    );
  });

  // Other tests like non-string prompt handling would be similar to OpenAIAdapter tests
});