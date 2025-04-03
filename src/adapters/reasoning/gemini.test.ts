// src/adapters/reasoning/gemini.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GeminiAdapter, GeminiAdapterOptions } from './gemini';
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

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;
  const defaultOptions: GeminiAdapterOptions = { apiKey: 'test-gemini-key' };
  const defaultCallOptions: CallOptions = { threadId: 't-gemini' };

  beforeEach(() => {
    adapter = new GeminiAdapter(defaultOptions);
    vi.clearAllMocks(); // Clear mocks including fetch and Logger
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Ensure fetch mock doesn't leak
  });

  it('should throw error if API key is missing', () => {
    expect(() => new GeminiAdapter({} as GeminiAdapterOptions)).toThrow('Gemini API key is required.');
  });

  it('should initialize with default model and API version if not provided', () => {
    expect((adapter as any).model).toBe('gemini-1.5-flash');
    expect((adapter as any).apiVersion).toBe('v1beta');
    expect((adapter as any).apiBaseUrl).toBe('https://generativelanguage.googleapis.com');
    expect(Logger.debug).toHaveBeenCalledWith('GeminiAdapter initialized with model: gemini-1.5-flash, version: v1beta');
  });

  it('should initialize with provided model, version, and apiBaseUrl', () => {
    const opts: GeminiAdapterOptions = { apiKey: 'key', model: 'gemini-pro', apiVersion: 'v1', apiBaseUrl: 'http://localhost:8081' };
    const customAdapter = new GeminiAdapter(opts);
    expect((customAdapter as any).model).toBe('gemini-pro');
    expect((customAdapter as any).apiVersion).toBe('v1');
    expect((customAdapter as any).apiBaseUrl).toBe('http://localhost:8081');
  });

  it('should make a successful API call with basic prompt', async () => {
    const mockResponse = {
      candidates: [{
        content: { parts: [{ text: 'Gemini says hello!' }], role: 'model' },
        finishReason: 'STOP',
      }],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: 'OK',
    });

    const prompt = 'Say hello';
    const result = await adapter.call(prompt, defaultCallOptions);

    expect(result).toBe('Gemini says hello!');
    expect(mockFetch).toHaveBeenCalledOnce();
    const expectedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${defaultOptions.apiKey}`;
    expect(mockFetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      })
    );
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling Gemini API'), expect.anything());
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Gemini API call successful'), expect.anything());
  });

   it('should handle non-string prompt by coercing to string', async () => {
     const mockResponse = { candidates: [{ content: { parts: [{ text: 'Processed object.' }] } }] };
     mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });
     const prompt = { data: 123 }; // Non-string prompt
     await adapter.call(prompt as any, defaultCallOptions); // Cast to any for test

     expect(Logger.warn).toHaveBeenCalledWith('GeminiAdapter received non-string prompt. Treating as string.');
     expect(mockFetch).toHaveBeenCalledWith(
       expect.any(String),
       expect.objectContaining({
         body: JSON.stringify({
           contents: [{ parts: [{ text: '[object Object]' }] }], // Default string coercion
         }),
       })
     );
  });

  it('should include optional parameters in the API call payload', async () => {
    const mockResponse = { candidates: [{ content: { parts: [{ text: 'Response with params.' }] } }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const callOptions: CallOptions = {
      ...defaultCallOptions,
      temperature: 0.6,
      max_tokens: 150, // Test alias maxOutputTokens
      topP: 0.9,
      stopSequences: ['\nObservation:'],
    };
    await adapter.call('Test params', callOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test params' }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 150,
            topP: 0.9,
            stopSequences: ['\nObservation:'],
          },
        }),
      })
    );
  });

   it('should remove empty generationConfig if no parameters are passed', async () => {
    const mockResponse = { candidates: [{ content: { parts: [{ text: 'Response no params.' }] } }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    await adapter.call('Test no params', defaultCallOptions); // No extra params

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test no params' }] }],
          // generationConfig should be absent
        }),
      })
    );
     // Check that generationConfig is NOT in the stringified body
     const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
     expect(requestBody.generationConfig).toBeUndefined();
  });


  it('should handle API error response (non-200 status)', async () => {
    const errorBody = '{"error": {"message": "API key not valid"}}';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => errorBody,
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(adapter.call('Test API error', defaultCallOptions)).rejects.toThrow(
        'Gemini API request failed: 400 Bad Request - {"error": {"message": "API key not valid"}}'
    );
    expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Gemini API request failed with status 400'),
        expect.anything()
    );
  });

   it('should handle invalid response structure (missing text content)', async () => {
    const invalidResponse = { candidates: [{ content: { parts: [{ /* text missing */ }] } }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => invalidResponse });

    await expect(adapter.call('Test invalid structure', defaultCallOptions)).rejects.toThrow(
        'Invalid response structure from Gemini API: No text content found.'
    );
     expect(Logger.error).toHaveBeenCalledWith(
        'Invalid response structure from Gemini API: No text content found',
        expect.objectContaining({ responseData: invalidResponse })
    );
  });

   it('should handle blocked content response', async () => {
    const blockedResponse = { promptFeedback: { blockReason: 'SAFETY' } }; // No candidates
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => blockedResponse });

    await expect(adapter.call('Test blocked content', defaultCallOptions)).rejects.toThrow(
        'Gemini API call blocked or failed to generate content.'
    );
     expect(Logger.error).toHaveBeenCalledWith(
        'Gemini API call blocked or failed to generate content.',
        expect.objectContaining({ responseData: blockedResponse })
    );
  });

   it('should handle fetch network error', async () => {
    const networkError = new Error('Network connection failed');
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(adapter.call('Test network error', defaultCallOptions)).rejects.toThrow('Network connection failed');
    expect(Logger.error).toHaveBeenCalledWith(
        'Error during Gemini API call: Network connection failed',
        expect.objectContaining({ error: networkError })
    );
  });

  // TODO: Add tests for system prompt and history handling once implemented
});