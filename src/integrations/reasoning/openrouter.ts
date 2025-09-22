// src/adapters/reasoning/openrouter.ts
import { ProviderAdapter } from '@/core/interfaces';
import {
  ArtStandardPrompt,
  ArtStandardMessage,
  CallOptions,
  StreamEvent,
  LLMMetadata,
  ToolSchema,
} from '@/types';
import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors';

// Using OpenAI-compatible structures, as OpenRouter adheres to them.
// Based on https://openrouter.ai/docs#api-reference-chat-completions
interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
}

interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // Stringified JSON
  };
}

interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object; // JSON Schema
  };
}

interface OpenRouterChatCompletionPayload {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  stream_options?: { include_usage: boolean };
  tools?: OpenRouterTool[];
  tool_choice?: 'auto' | 'any' | 'none' | { type: 'function'; function: { name: string } };
  // OpenRouter specific extensions
  provider?: {
    order?: string[];
    only?: string[];
    allow_fallbacks?: boolean;
  };
  transforms?: string[];
  reasoning?: {
    exclude?: boolean;
    effort?: 'low' | 'medium' | 'high';
    tokens?: number;
  };
}

// See https://openrouter.ai/docs/use-cases/usage-accounting
interface OpenRouterUsage {
  completion_tokens?: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
  prompt_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
  total_tokens?: number;
  cost?: number;
  cost_details?: {
    upstream_inference_cost?: number;
  };
}

interface OpenRouterChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenRouterMessage;
    finish_reason: string;
  }[];
  usage?: OpenRouterUsage;
}

export interface OpenRouterAdapterOptions {
  apiKey: string;
  model: string;
  apiBaseUrl?: string;
  siteUrl?: string;
  appName?: string;
}

export class OpenRouterAdapter implements ProviderAdapter {
  readonly providerName = 'openrouter';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;
  private siteUrl?: string;
  private appName?: string;

  constructor(options: OpenRouterAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('OpenRouterAdapter requires an apiKey in options.');
    }
    if (!options.model) {
      throw new Error('OpenRouterAdapter requires a model identifier in options (e.g., \'google/gemini-pro\').');
    }
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.apiBaseUrl = options.apiBaseUrl || 'https://openrouter.ai/api/v1';
    this.siteUrl = options.siteUrl;
    this.appName = options.appName;
    Logger.debug(`OpenRouterAdapter initialized for model: ${this.model}`);
  }

  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const {
      threadId,
      traceId = `openrouter-trace-${Date.now()}`,
      sessionId,
      stream,
      callContext,
      model: modelOverride,
      tools: artTools,
    } = options;
    const modelToUse = modelOverride || this.model;

    let openAiMessages: OpenRouterMessage[];
    let openAiTools: OpenRouterTool[] | undefined;
    try {
      openAiMessages = this.translateToOpenAI(prompt);
      if (artTools && artTools.length > 0) {
        openAiTools = this.translateArtToolsToOpenAI(artTools);
      }
    } catch (error: any) {
      Logger.error(`Error translating prompt/tools for OpenRouter: ${error.message}`, { error, threadId, traceId });
      const generator = async function* (): AsyncIterable<StreamEvent> {
        const err =
          error instanceof ARTError
            ? error
            : new ARTError(`Prompt translation failed: ${error.message}`, ErrorCode.PROMPT_TRANSLATION_FAILED, error);
        yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      };
      return generator();
    }

    const openRouterOptions = (options as any).openrouter || {};

    const payload: OpenRouterChatCompletionPayload = {
      model: modelToUse,
      messages: openAiMessages,
      temperature: options.temperature,
      max_tokens: options.max_tokens || options.maxOutputTokens,
      top_p: options.top_p || options.topP,
      stop: options.stop || options.stop_sequences || options.stopSequences,
      stream: !!stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
      tools: openAiTools,
      tool_choice: options.tool_choice,
      // OpenRouter specific fields from options
      provider: openRouterOptions.provider,
      transforms: openRouterOptions.useMiddleOutTransform === false ? undefined : ['middle-out'],
      reasoning: openRouterOptions.reasoning,
    };

    Object.keys(payload).forEach(
      (key) => payload[key as keyof OpenRouterChatCompletionPayload] === undefined && delete payload[key as keyof OpenRouterChatCompletionPayload],
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.siteUrl) headers['HTTP-Referer'] = this.siteUrl;
    if (this.appName) headers['X-Title'] = this.appName;

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;
    Logger.debug(`Calling OpenRouter API: ${apiUrl} with model ${modelToUse}, stream: ${!!stream}`, { threadId, traceId });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new ARTError(
          `OpenRouter API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
          ErrorCode.LLM_PROVIDER_ERROR,
          new Error(errorBody),
        );
        const errorGenerator = async function* (): AsyncIterable<StreamEvent> {
          yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
          yield { type: 'END', data: null, threadId, traceId, sessionId };
        };
        return errorGenerator();
      }

      if (stream && response.body) {
        return this.processStream(response.body, options);
      } else {
        const data = (await response.json()) as OpenRouterChatCompletionResponse;
        return this.processNonStreamingResponse(data, options);
      }
    } catch (error: any) {
      Logger.error(`Error during OpenRouter API call: ${error.message}`, { error, threadId, traceId });
      const artError = error instanceof ARTError ? error : new ARTError(error.message, ErrorCode.LLM_PROVIDER_ERROR, error);
      const errorGenerator = async function* (): AsyncIterable<StreamEvent> {
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      };
      return errorGenerator();
    }
  }

  private async *processStream(
    stream: ReadableStream<Uint8Array>,
    options: CallOptions,
  ): AsyncIterable<StreamEvent> {
    const { threadId, traceId, sessionId, callContext } = options;
    const startTime = Date.now();
    let timeToFirstTokenMs: number | undefined;
    let finalStopReason: string | undefined;
    let finalUsage: OpenRouterUsage | undefined;
    const aggregatedToolCalls: any[] = [];

    const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    while (true) {
      try {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataContent = line.substring(6);
            if (dataContent === '[DONE]') break;

            const chunk = JSON.parse(dataContent);
            if (chunk.error) {
              throw new ARTError(
                `OpenRouter stream error: ${chunk.error.message}`,
                ErrorCode.LLM_PROVIDER_ERROR,
                new Error(JSON.stringify(chunk.error)),
              );
            }

            const choice = chunk.choices?.[0];
            if (!choice) continue;

            if (timeToFirstTokenMs === undefined) {
              timeToFirstTokenMs = Date.now() - startTime;
            }

            const delta = choice.delta;
            if (delta?.reasoning && typeof delta.reasoning === 'string') {
              const tokenType =
                callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
              yield { type: 'TOKEN', data: delta.reasoning, threadId, traceId, sessionId, tokenType };
            }

            if (delta?.content) {
              const tokenType =
                callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
              yield { type: 'TOKEN', data: delta.content, threadId, traceId, sessionId, tokenType };
            }

            if (delta?.tool_calls) {
              delta.tool_calls.forEach((tcDelta: any) => {
                if (tcDelta.index !== undefined) {
                  if (!aggregatedToolCalls[tcDelta.index]) aggregatedToolCalls[tcDelta.index] = {};
                  if (tcDelta.id) aggregatedToolCalls[tcDelta.index].id = tcDelta.id;
                  if (tcDelta.type) aggregatedToolCalls[tcDelta.index].type = tcDelta.type;
                  if (tcDelta.function) {
                    if (!aggregatedToolCalls[tcDelta.index].function) aggregatedToolCalls[tcDelta.index].function = {};
                    if (tcDelta.function.name)
                      aggregatedToolCalls[tcDelta.index].function.name = tcDelta.function.name;
                    if (tcDelta.function.arguments) {
                      aggregatedToolCalls[tcDelta.index].function.arguments =
                        (aggregatedToolCalls[tcDelta.index].function.arguments || '') + tcDelta.function.arguments;
                    }
                  }
                }
              });
            }

            if (choice.finish_reason) {
              finalStopReason = choice.finish_reason;
            }
            if (chunk.usage) {
              finalUsage = chunk.usage;
            }
          }
        }
      } catch (error: any) {
        const artError =
          error instanceof ARTError ? error : new ARTError(`Error reading OpenRouter stream: ${error.message}`, ErrorCode.LLM_PROVIDER_ERROR, error);
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        return; // End generation on error
      }
    }

    if (finalStopReason === 'tool_calls' && aggregatedToolCalls.length > 0) {
      const toolData = aggregatedToolCalls.map((tc) => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments || '{}'),
      }));
      const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
      yield { type: 'TOKEN', data: toolData, threadId, traceId, sessionId, tokenType };
    }

    const totalGenerationTimeMs = Date.now() - startTime;
    const metadata: LLMMetadata = {
      stopReason: finalStopReason,
      inputTokens: finalUsage?.prompt_tokens,
      outputTokens: finalUsage?.completion_tokens,
      thinkingTokens: finalUsage?.completion_tokens_details?.reasoning_tokens,
      timeToFirstTokenMs,
      totalGenerationTimeMs,
      providerRawUsage: { ...finalUsage, finish_reason: finalStopReason },
      traceId,
    };
    yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
    yield { type: 'END', data: null, threadId, traceId, sessionId };
  }

  private async *processNonStreamingResponse(
    data: OpenRouterChatCompletionResponse,
    options: CallOptions,
  ): AsyncIterable<StreamEvent> {
    const { threadId, traceId, sessionId, callContext } = options;
    const firstChoice = data.choices?.[0];

    if (!firstChoice?.message) {
      const err = new ARTError(
        'Invalid response structure from OpenRouter API: No message found.',
        ErrorCode.LLM_PROVIDER_ERROR,
        new Error(JSON.stringify(data)),
      );
      yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
      yield { type: 'END', data: null, threadId, traceId, sessionId };
      return;
    }

    const responseMessage = firstChoice.message;
    const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';

    const toolData =
      responseMessage.tool_calls?.map((tc) => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments || '{}'),
      })) || [];

    const responseContent = responseMessage.content ?? '';
    const tokenPayload: any[] = [];
    if (responseContent.trim()) {
      tokenPayload.push({ type: 'text', text: responseContent.trim() });
    }
    tokenPayload.push(...toolData);

    if (tokenPayload.length > 0) {
      yield {
        type: 'TOKEN',
        data: tokenPayload.length === 1 && tokenPayload[0].type === 'text' ? tokenPayload[0].text : tokenPayload,
        threadId,
        traceId,
        sessionId,
        tokenType,
      };
    }

    const usage = data.usage;
    const metadata: LLMMetadata = {
      stopReason: firstChoice.finish_reason,
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
      thinkingTokens: usage?.completion_tokens_details?.reasoning_tokens,
      providerRawUsage: { ...usage, finish_reason: firstChoice.finish_reason },
      traceId,
    };
    yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
    yield { type: 'END', data: null, threadId, traceId, sessionId };
  }

  private translateArtToolsToOpenAI(artTools: ToolSchema[]): OpenRouterTool[] {
    return artTools.map((artTool) => ({
      type: 'function',
      function: {
        name: artTool.name,
        description: artTool.description,
        parameters: artTool.inputSchema,
      },
    }));
  }

  private translateToOpenAI(artPrompt: ArtStandardPrompt): OpenRouterMessage[] {
    return artPrompt.map((message: ArtStandardMessage): OpenRouterMessage => {
      switch (message.role) {
        case 'system':
          return { role: 'system', content: String(message.content) };
        case 'user':
          return { role: 'user', content: String(message.content) };
        case 'assistant': {
          const assistantMsg: OpenRouterMessage = {
            role: 'assistant',
            content: typeof message.content === 'string' ? message.content : null,
          };
          if (message.tool_calls && message.tool_calls.length > 0) {
            assistantMsg.tool_calls = message.tool_calls.map((tc) => {
              if (tc.type !== 'function' || !tc.function?.name || typeof tc.function?.arguments !== 'string') {
                throw new ARTError(
                  `OpenRouterAdapter: Invalid tool_call structure in assistant message. ID: ${tc.id}`,
                  ErrorCode.PROMPT_TRANSLATION_FAILED,
                );
              }
              return {
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              };
            });
          }
          if (assistantMsg.content === '' && assistantMsg.tool_calls) {
            assistantMsg.content = null;
          }
          return assistantMsg;
        }
        case 'tool_result': {
          if (!message.tool_call_id) {
            throw new ARTError(
              `OpenRouterAdapter: 'tool_result' message missing required 'tool_call_id'.`,
              ErrorCode.PROMPT_TRANSLATION_FAILED,
            );
          }
          return {
            role: 'tool',
            tool_call_id: message.tool_call_id,
            content: String(message.content),
          };
        }
        case 'tool_request': {
          throw new ARTError(
            `OpenRouterAdapter: Unexpected 'tool_request' role. This should be handled by 'tool_calls' in an assistant message.`,
            ErrorCode.PROMPT_TRANSLATION_FAILED,
          );
        }
        default: {
          throw new ARTError(
            `OpenRouterAdapter: Unknown message role '${message.role}' encountered.`,
            ErrorCode.PROMPT_TRANSLATION_FAILED,
          );
        }
      }
    });
  }
}