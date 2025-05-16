// src/adapters/reasoning/ollama.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OllamaAdapter, OllamaAdapterOptions } from './ollama';
import { Logger } from '../../utils/logger';
import { ArtStandardPrompt, CallOptions, StreamEvent, LLMMetadata, ToolSchema } from '../../types';
import { ARTError, ErrorCode } from '../../errors';
import OpenAI from 'openai'; // Mocked below

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

// Mock the 'openai' package
const mockCreate = vi.fn();
const mockCompletions = { create: mockCreate };
const mockChat = { completions: mockCompletions };
const mockOpenAIInstance = { chat: mockChat };

vi.mock('openai', () => ({
  __esModule: true,
  default: vi.fn(() => mockOpenAIInstance),
}));


// Helper function to consume the async iterable stream into an array
async function consumeStream(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
    const events: StreamEvent[] = [];
    for await (const event of stream) {
        events.push(event);
    }
    return events;
}

describe('OllamaAdapter', () => {
  let adapter: OllamaAdapter;
  const defaultModel = 'llama3';
  const defaultOptions: OllamaAdapterOptions = { defaultModel: defaultModel };
  const defaultCallOptions: CallOptions = { threadId: 't-ollama', providerConfig: { providerName: 'ollama', modelId: defaultModel, adapterOptions: {} } };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new OllamaAdapter(defaultOptions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default base URL and model', () => {
    expect((adapter as any).ollamaBaseUrl).toBe('http://localhost:11434');
    expect((adapter as any).defaultModel).toBe(defaultModel);
    expect(OpenAI).toHaveBeenCalledWith({
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama',
      dangerouslyAllowBrowser: true,
    });
    expect(Logger.debug).toHaveBeenCalledWith(`OllamaAdapter initialized. Base URL: http://localhost:11434/v1, Default Model: ${defaultModel}`);
  });

  it('should initialize with custom base URL and api key', () => {
    const customOptions: OllamaAdapterOptions = { ollamaBaseUrl: 'http://custom:12345', apiKey: 'custom-key', defaultModel: 'mistral' };
    const customAdapter = new OllamaAdapter(customOptions);
    expect((customAdapter as any).ollamaBaseUrl).toBe('http://custom:12345');
    expect(OpenAI).toHaveBeenCalledWith({
      baseURL: 'http://custom:12345/v1',
      apiKey: 'custom-key',
      dangerouslyAllowBrowser: true,
    });
    expect(Logger.debug).toHaveBeenCalledWith(`OllamaAdapter initialized. Base URL: http://custom:12345/v1, Default Model: mistral`);
  });

   it('should use model from providerConfig if available', async () => {
    const specificModel = 'specific-ollama-model';
    const callOpts: CallOptions = { ...defaultCallOptions, providerConfig: { providerName: 'ollama', modelId: specificModel, adapterOptions: {} } };
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
    await consumeStream(await adapter.call([{ role: 'user', content: 'Hi' }], callOpts));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: specificModel }));
  });

  it('should use model from callOptions if providerConfig.modelId is not set', async () => {
    const specificModel = 'ollama-from-callopts';
     const callOpts: CallOptions = { ...defaultCallOptions, model: specificModel, providerConfig: { providerName: 'ollama', adapterOptions: {} } as any }; // remove modelId from providerConfig
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
    await consumeStream(await adapter.call([{ role: 'user', content: 'Hi' }], callOpts));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: specificModel }));
  });


  it('should yield error if no model is specified', async () => {
    const adapterWithoutModel = new OllamaAdapter({}); // No default model
    const callOpts: CallOptions = { threadId: 't-no-model', providerConfig: { providerName: 'ollama', adapterOptions: {} } as any };
    const resultStream = await adapterWithoutModel.call([{ role: 'user', content: 'Hi' }], callOpts);
    const results = await consumeStream(resultStream);

    const errorEvent = results.find(e => e.type === 'ERROR');
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.data).toBeInstanceOf(ARTError);
    expect((errorEvent?.data as ARTError).code).toBe(ErrorCode.INVALID_CONFIG);
    expect((errorEvent?.data as ARTError).message).toContain('Ollama model ID is not specified');
    expect(results.some(e => e.type === 'END')).toBe(true);
  });


  // --- Non-Streaming Tests ---
  describe('call (non-streaming)', () => {
    // Define basicPrompt at the describe block level
    const basicPrompt: ArtStandardPrompt = [{ role: 'user', content: 'Say hello' }];

    it('should translate basic ArtStandardPrompt and call client.chat.completions.create', async () => {
      const mockApiResponse = {
        id: 'chatcmpl-ollama-123',
        object: 'chat.completion',
        created: Date.now(),
        model: defaultModel,
        choices: [{ index: 0, message: { role: 'assistant', content: 'Ollama says hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      mockCreate.mockResolvedValueOnce(mockApiResponse);

      const resultStream = await adapter.call(basicPrompt, defaultCallOptions); // Use basicPrompt
      const results = await consumeStream(resultStream);

      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith({
        model: defaultModel,
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: false,
        // other potential defaults like temperature might be undefined and thus not sent
      });

      expect(results.find(e => e.type === 'TOKEN')?.data).toBe('Ollama says hello!');
      const metadata = results.find(e => e.type === 'METADATA')?.data as LLMMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.stopReason).toBe('stop');
      expect(metadata.inputTokens).toBe(10);
      expect(metadata.outputTokens).toBe(5);
      expect(results.some(e => e.type === 'END')).toBe(true);
      expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Calling Ollama API'), expect.anything());
    });

    it('should handle tool calls in non-streaming response', async () => {
        const mockApiResponse = {
            id: 'chatcmpl-tool',
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: 'Thinking about tools.',
                    tool_calls: [{ id: 'tool_123', type: 'function', function: { name: 'get_weather', arguments: '{"location":"Paris"}' } }]
                },
                finish_reason: 'tool_calls'
            }],
            usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }
        };
        mockCreate.mockResolvedValueOnce(mockApiResponse);

        const resultStream = await adapter.call(basicPrompt, defaultCallOptions); // Use a distinct prompt variable if needed
        const results = await consumeStream(resultStream);

        const tokenEvent = results.find(e => e.type === 'TOKEN');
        expect(tokenEvent).toBeDefined();
        expect(tokenEvent?.data).toEqual([
            { type: 'text', text: 'Thinking about tools.' },
            { type: 'tool_use', id: 'tool_123', name: 'get_weather', input: { location: 'Paris' } }
        ]);

        const metadata = results.find(e => e.type === 'METADATA')?.data as LLMMetadata;
        expect(metadata.stopReason).toBe('tool_calls');
    });


    it('should handle API error from client by yielding ERROR', async () => {
      const apiError = new OpenAI.APIError(401, { error: { message: 'Unauthorized' } } as any, 'Error message', {});
      mockCreate.mockRejectedValueOnce(apiError);

      const resultStream = await adapter.call(basicPrompt, defaultCallOptions);
      const results = await consumeStream(resultStream);

      const errorEvent = results.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data).toBeInstanceOf(ARTError);
      expect((errorEvent?.data as ARTError).code).toBe(ErrorCode.LLM_PROVIDER_ERROR);
      expect((errorEvent?.data as ARTError).message).toContain('Ollama API Error (401): Unauthorized');
      expect(results.some(e => e.type === 'END')).toBe(true);
    });
  });

  // --- Streaming Tests ---
  describe('call (streaming)', () => {
    const prompt: ArtStandardPrompt = [{ role: 'user', content: 'Stream hello' }];
    const streamCallOptions: CallOptions = { ...defaultCallOptions, stream: true };

    async function* createMockStreamChunks(chunks: Partial<OpenAI.Chat.Completions.ChatCompletionChunk>[]) {
      for (const chunk of chunks) {
        yield chunk as OpenAI.Chat.Completions.ChatCompletionChunk;
      }
    }

    it('should call client.chat.completions.create with stream and yield TOKEN events with correct tokenType', async () => {
      const mockStream = createMockStreamChunks([
        { choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] },
        { choices: [{ index: 0, delta: { content: 'Hello ' }, finish_reason: null }] },
        { choices: [{ index: 0, delta: { content: 'Ollama!' }, finish_reason: null }] },
        { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 } },
      ]);
      mockCreate.mockResolvedValueOnce(mockStream);
      
      const agentThoughtCallOptions: CallOptions = { ...streamCallOptions, callContext: 'AGENT_THOUGHT' };
      const resultStream = await adapter.call(prompt, agentThoughtCallOptions);
      const results = await consumeStream(resultStream);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));

      const tokenEvents = results.filter(e => e.type === 'TOKEN');
      expect(tokenEvents.map(e => e.data)).toEqual(['Hello ', 'Ollama!']);
      tokenEvents.forEach(event => {
        expect(event.tokenType).toBe('AGENT_THOUGHT_LLM_RESPONSE');
      });

      const metadata = results.find(e => e.type === 'METADATA')?.data as LLMMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.stopReason).toBe('stop');
      expect(metadata.inputTokens).toBe(7);
      expect(metadata.outputTokens).toBe(3);
      expect(metadata.timeToFirstTokenMs).toBeGreaterThanOrEqual(0);
      expect(results.some(e => e.type === 'END')).toBe(true);
    });

    it('should handle tool calls in streaming response', async () => {
        const mockStream = createMockStreamChunks([
            { choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] },
            { choices: [{ index: 0, delta: { content: 'Okay, using a tool: ' }, finish_reason: null }] },
            { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_stream_123', type: 'function', function: { name: 'search_web', arguments: '{"query":"' } }] }, finish_reason: null }] },
            { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: 'ollama streaming"}' } }] }, finish_reason: null }] },
            { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }, // Added total_tokens
        ]);
        mockCreate.mockResolvedValueOnce(mockStream);

        const resultStream = await adapter.call(prompt, streamCallOptions);
        const results = await consumeStream(resultStream);

        const tokenEvents = results.filter(e => e.type === 'TOKEN');
        expect(tokenEvents.length).toBe(2); // One for text, one for tool_use
        expect(tokenEvents[0].data).toBe('Okay, using a tool: ');

        const toolUseEventData = tokenEvents[1].data;
        expect(toolUseEventData).toEqual([
            { type: 'tool_use', id: 'call_stream_123', name: 'search_web', input: { query: 'ollama streaming' } }
        ]);

        const metadata = results.find(e => e.type === 'METADATA')?.data as LLMMetadata;
        expect(metadata.stopReason).toBe('tool_calls');
    });


    it('should handle error during stream consumption', async () => {
      const streamError = new Error('Stream read failed');
      async function* errorStream() {
        // Add index to the choice
        yield { choices: [{ index: 0, delta: { content: 'Good ' } }] } as OpenAI.Chat.Completions.ChatCompletionChunk;
        throw streamError;
      }
      mockCreate.mockResolvedValueOnce(errorStream());

      const resultStream = await adapter.call(prompt, streamCallOptions);
      const results = await consumeStream(resultStream);

      expect(results.find(e => e.type === 'TOKEN')?.data).toBe('Good ');
      const errorEvent = results.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data).toBeInstanceOf(ARTError);
      expect((errorEvent?.data as ARTError).message).toContain('Stream read failed');
      expect(results.some(e => e.type === 'END')).toBe(true);
    });
  });
  
  describe('translateToOpenAI (including R1 merging)', () => {
    it('should merge consecutive user messages for deepseek-r1 model', () => {
      const r1Adapter = new OllamaAdapter({ defaultModel: 'deepseek-r1-test' });
      const artPrompt: ArtStandardPrompt = [
        { role: 'user', content: 'Hello.' },
        { role: 'user', content: 'How are you?' },
        { role: 'assistant', content: 'I am fine.' },
        { role: 'user', content: 'Good.' },
      ];
      const openAiMessages = (r1Adapter as any).translateToOpenAI(artPrompt, 'deepseek-r1-model');
      expect(openAiMessages).toEqual([
        { role: 'user', content: 'Hello.\nHow are you?' },
        { role: 'assistant', content: 'I am fine.' },
        { role: 'user', content: 'Good.' },
      ]);
    });

    it('should merge consecutive assistant messages for deepseek-r1 model, including tool_calls', () => {
      const r1Adapter = new OllamaAdapter({ defaultModel: 'deepseek-r1-test' });
      const artPrompt: ArtStandardPrompt = [
        { role: 'user', content: 'What is 2+2 and then 3+3?' },
        { role: 'assistant', content: 'Thinking...', tool_calls: [{id: 'tc1', type: 'function', function: {name: 'calc', arguments: '{"expr":"2+2"}'}}]},
        { role: 'assistant', content: 'And also...', tool_calls: [{id: 'tc2', type: 'function', function: {name: 'calc', arguments: '{"expr":"3+3"}'}}]}
      ];
      const openAiMessages = (r1Adapter as any).translateToOpenAI(artPrompt, 'deepseek-r1-model');
      expect(openAiMessages.length).toBe(2);
      expect(openAiMessages[1].role).toBe('assistant');
      expect(openAiMessages[1].content).toBe('Thinking...\nAnd also...');
      expect(openAiMessages[1].tool_calls?.length).toBe(2);
      expect(openAiMessages[1].tool_calls).toEqual([
        {id: 'tc1', type: 'function', function: {name: 'calc', arguments: '{"expr":"2+2"}'}},
        {id: 'tc2', type: 'function', function: {name: 'calc', arguments: '{"expr":"3+3"}'}}
      ]);
    });

    it('should not merge messages for non-deepseek-r1 models', () => {
      const standardAdapter = new OllamaAdapter({ defaultModel: 'llama3' });
      const artPrompt: ArtStandardPrompt = [
        { role: 'user', content: 'Hello.' },
        { role: 'user', content: 'How are you?' },
      ];
      const openAiMessages = (standardAdapter as any).translateToOpenAI(artPrompt, 'llama3');
      expect(openAiMessages).toEqual([
        { role: 'user', content: 'Hello.' },
        { role: 'user', content: 'How are you?' },
      ]);
    });
  });

  describe('translateArtToolsToOpenAI', () => {
    it('should correctly translate ART ToolSchema to OpenAI tool format', () => {
      const artTools: ToolSchema[] = [
        {
          name: 'get_current_weather',
          description: 'Get the current weather in a given location',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'The city and state, e.g. San Francisco, CA' },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            },
            required: ['location'],
          },
        },
      ];
      const openAiTools = (adapter as any).translateArtToolsToOpenAI(artTools);
      expect(openAiTools).toEqual([
        {
          type: 'function',
          function: {
            name: 'get_current_weather',
            description: 'Get the current weather in a given location',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'The city and state, e.g. San Francisco, CA' },
                unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
              },
              required: ['location'],
            },
          },
        },
      ]);
    });

    it('should throw ARTError for invalid tool schema', () => {
        const invalidArtTools: any[] = [{ description: 'A tool without a name or input schema' }];
        expect(() => (adapter as any).translateArtToolsToOpenAI(invalidArtTools)).toThrow(ARTError);
        expect(() => (adapter as any).translateArtToolsToOpenAI(invalidArtTools)).toThrow(/Invalid ART ToolSchema for tool 'unknown'/);
    });
  });
});