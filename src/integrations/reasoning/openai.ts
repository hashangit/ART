// src/integrations/reasoning/openai.ts
import OpenAI from 'openai';
import { ProviderAdapter, ToolSchema } from '@/core/interfaces';
import {
  ArtStandardPrompt,
  ArtStandardMessage,
  CallOptions,
  StreamEvent,
  LLMMetadata,
} from '@/types';
import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors';

// Default model configuration
const OPENAI_DEFAULT_MODEL_ID = 'gpt-4o';
const OPENAI_DEFAULT_MAX_TOKENS = 4096;
const OPENAI_DEFAULT_TEMPERATURE = 0.7;

/**
 * Configuration options required for the `OpenAIAdapter`.
 */
export interface OpenAIAdapterOptions {
  /** Your OpenAI API key. Handle securely. */
  apiKey: string;
  /** The default OpenAI model ID to use (e.g., 'gpt-4o', 'gpt-5', 'gpt-5-mini'). */
  model?: string;
  /** Optional: Override the base URL for the OpenAI API (e.g., for Azure OpenAI or custom proxies). */
  apiBaseUrl?: string;
  /** Optional: Default maximum tokens for responses. */
  defaultMaxTokens?: number;
  /** Optional: Default temperature for responses. */
  defaultTemperature?: number;
}

// Types for OpenAI Responses API
interface OpenAIResponsesInputMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'input_text' | 'output_text' | 'input_image';
    text?: string;
    image_url?: string;
  }>;
}

interface OpenAIResponsesPayload {
  model: string;
  input: OpenAIResponsesInputMessage[];
  instructions?: string; // System prompt goes here
  temperature?: number;
  max_output_tokens?: number;
  stream?: boolean;
  store?: boolean;
  reasoning?: {
    effort?: 'low' | 'medium' | 'high';
    summary?: 'auto' | 'concise' | 'detailed';
  };
  tools?: OpenAIResponsesTool[];
}

interface OpenAIResponsesTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object; // JSON Schema
  };
}

interface OpenAIResponsesUsage {
  input_tokens?: number;
  output_tokens?: number;
  output_tokens_details?: {
    reasoning_tokens?: number;
  };
  total_tokens?: number;
}

interface OpenAIResponsesResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  output?: Array<{
    type: 'message' | 'reasoning';
    id?: string;
    content?: Array<{
      type: 'output_text';
      text: string;
    }>;
    summary?: Array<{
      type: 'summary_text';
      text: string;
    }>;
  }>;
  status: 'completed' | 'incomplete' | 'failed';
  usage?: OpenAIResponsesUsage;
}

/**
 * Implements the `ProviderAdapter` interface for interacting with OpenAI's
 * Responses API (supports reasoning models like GPT-5 family and other models).
 *
 * Handles formatting requests, parsing responses, streaming, reasoning token detection, and tool use.
 * Uses the official OpenAI SDK with the new Responses API for full reasoning model support.
 *
 * @see {@link ProviderAdapter} for the interface definition.
 * @see {@link OpenAIAdapterOptions} for configuration options.
 */
export class OpenAIAdapter implements ProviderAdapter {
  readonly providerName = 'openai';
  private client: OpenAI;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  /**
   * Creates an instance of the OpenAIAdapter.
   * @param options - Configuration options including the API key and optional model/baseURL/defaults.
   * @throws {ARTError} If the API key is missing.
   */
  constructor(options: OpenAIAdapterOptions) {
    if (!options.apiKey) {
      throw new ARTError('OpenAIAdapter requires an apiKey in options.', ErrorCode.INVALID_CONFIG);
    }

    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.apiBaseUrl || undefined,
    });

    this.defaultModel = options.model || OPENAI_DEFAULT_MODEL_ID;
    this.defaultMaxTokens = options.defaultMaxTokens || OPENAI_DEFAULT_MAX_TOKENS;
    this.defaultTemperature = options.defaultTemperature || OPENAI_DEFAULT_TEMPERATURE;

    Logger.debug(`OpenAIAdapter initialized with model: ${this.defaultModel}`);
  }

  /**
   * Sends a request to the OpenAI Responses API.
   * Translates `ArtStandardPrompt` to the Responses API format and handles streaming/reasoning.
   *
   * @param {ArtStandardPrompt} prompt - The standardized prompt messages.
   * @param {CallOptions} options - Call options, including streaming, reasoning options, and model parameters.
   * @returns {Promise<AsyncIterable<StreamEvent>>} A promise resolving to an AsyncIterable of StreamEvent objects.
   */
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const {
      threadId,
      traceId = `openai-trace-${Date.now()}`,
      sessionId,
      stream = false,
      callContext,
      model: modelOverride,
      tools: availableArtTools,
      providerConfig,
    } = options;

    const modelToUse = providerConfig?.modelId || modelOverride || this.defaultModel;

    // Extract OpenAI specific parameters
    const openaiApiParams = providerConfig?.adapterOptions || {};
    const maxTokens = openaiApiParams.max_tokens || openaiApiParams.maxTokens || options.max_tokens || options.maxOutputTokens || this.defaultMaxTokens;
    const temperature = openaiApiParams.temperature ?? options.temperature ?? this.defaultTemperature;
    
    // Extract reasoning configuration from options
    const openaiOptions = (options as any).openai || {};
    const reasoningEffort = openaiOptions.reasoning?.effort || 'medium';
    const reasoningSummary = openaiOptions.reasoning?.summary || 'auto';

    let systemPrompt: string | undefined;
    let responsesInput: OpenAIResponsesInputMessage[];
    try {
      const translationResult = this.translateToResponsesFormat(prompt);
      systemPrompt = translationResult.systemPrompt;
      responsesInput = translationResult.input;
    } catch (error: any) {
      Logger.error(`Error translating ArtStandardPrompt to OpenAI Responses format: ${error.message}`, { error, threadId, traceId });
      const artError = error instanceof ARTError ? error : new ARTError(`Prompt translation failed: ${error.message}`, ErrorCode.PROMPT_TRANSLATION_FAILED, error);
      const errorGenerator = async function* (): AsyncIterable<StreamEvent> {
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      };
      return errorGenerator();
    }

    const openaiTools: OpenAIResponsesTool[] | undefined = availableArtTools
      ? this.translateArtToolsToOpenAI(availableArtTools)
      : undefined;

    const requestBody: OpenAIResponsesPayload = {
      model: modelToUse,
      input: responsesInput,
      instructions: systemPrompt,
      temperature: temperature,
      max_output_tokens: maxTokens,
      stream: stream,
      store: true, // Enable conversation continuity
      reasoning: {
        effort: reasoningEffort,
        summary: reasoningSummary,
      },
      tools: openaiTools,
    };

    // Remove undefined keys from the request body
    Object.keys(requestBody).forEach(key => {
      const K = key as keyof OpenAIResponsesPayload;
      if (requestBody[K] === undefined) {
        delete requestBody[K];
      }
    });

    Logger.debug(`Calling OpenAI Responses API with model ${modelToUse}`, { stream, tools: !!openaiTools, threadId, traceId });

    // Use an async generator function
    const generator = async function* (this: OpenAIAdapter): AsyncIterable<StreamEvent> {
      try {
        const startTime = Date.now();
        let timeToFirstTokenMs: number | undefined;
        
        if (stream) {
          // Use the OpenAI SDK's responses.create method for streaming
          const streamInstance = await (this.client as any).responses.create({
            ...requestBody,
            stream: true,
          });

          let accumulatedText = "";
          let accumulatedReasoning = "";
          let finalStopReason: string | undefined;
          let finalUsage: OpenAIResponsesUsage | undefined;
          let accumulatedToolCalls: any[] = [];

          // Process the stream
          for await (const event of streamInstance) {
            if (timeToFirstTokenMs === undefined) {
              timeToFirstTokenMs = Date.now() - startTime;
            }

            // Handle reasoning deltas
            if (event.type === 'response.reasoning.delta' || event.type === 'response.reasoning_text.delta') {
              if (event.delta) {
                accumulatedReasoning += event.delta;
                const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
                yield { type: 'TOKEN', data: event.delta, threadId, traceId, sessionId, tokenType };
              }
            }
            // Handle reasoning summary deltas
            else if (event.type === 'response.reasoning_summary.delta' || event.type === 'response.reasoning_summary_text.delta') {
              if (event.delta) {
                const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
                yield { type: 'TOKEN', data: event.delta, threadId, traceId, sessionId, tokenType };
              }
            }
            // Handle text/output deltas
            else if (event.type === 'response.text.delta' || event.type === 'response.output_text.delta') {
              if (event.delta) {
                accumulatedText += event.delta;
                const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                yield { type: 'TOKEN', data: event.delta, threadId, traceId, sessionId, tokenType };
              }
            }
            // Handle output item additions (alternative format for complete items)
            else if (event.type === 'response.output_item.added') {
              if (event.item) {
                if (event.item.type === 'text' && event.item.text) {
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                  yield { type: 'TOKEN', data: event.item.text, threadId, traceId, sessionId, tokenType };
                } else if (event.item.type === 'reasoning' && event.item.text) {
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
                  yield { type: 'TOKEN', data: event.item.text, threadId, traceId, sessionId, tokenType };
                } else if (event.item.type === 'message' && event.item.content) {
                  for (const content of event.item.content) {
                    if (content.type === 'output_text' && content.text) {
                      const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                      yield { type: 'TOKEN', data: content.text, threadId, traceId, sessionId, tokenType };
                    }
                  }
                }
              }
            }
            // Handle completion events with usage data
            else if (event.type === 'response.done' || event.type === 'response.completed') {
              if (event.response?.usage) {
                finalUsage = event.response.usage;
              }
              if (event.response?.status) {
                // Map status to finish reason
                finalStopReason = event.response.status === 'completed' ? 'stop' : event.response.status;
              }
            }
            // Handle error events
            else if (event.type === 'response.error' || event.type === 'error') {
              const errorMessage = event.error?.message || event.message || 'Unknown OpenAI Responses API error';
              throw new ARTError(`OpenAI Responses API Error: ${errorMessage}`, ErrorCode.LLM_PROVIDER_ERROR, new Error(errorMessage));
            }
          }

          // Yield final metadata for streaming
          const totalGenerationTimeMs = Date.now() - startTime;
          const metadata: LLMMetadata = {
            inputTokens: finalUsage?.input_tokens,
            outputTokens: finalUsage?.output_tokens,
            thinkingTokens: finalUsage?.output_tokens_details?.reasoning_tokens,
            stopReason: finalStopReason,
            timeToFirstTokenMs,
            totalGenerationTimeMs,
            providerRawUsage: finalUsage,
            traceId: traceId,
          };
          yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };

        } else {
          // Non-streaming response using the Responses API
          const response = await (this.client as any).responses.create({
            ...requestBody,
            stream: false,
          }) as OpenAIResponsesResponse;

          Logger.debug(`OpenAI Responses API call successful (non-streaming). Status: ${response.status}`, { threadId, traceId });

          let responseText = "";
          let reasoningText = "";
          const toolUseBlocks: any[] = [];

          // Extract content from response
          if (response.output && Array.isArray(response.output)) {
            for (const outputItem of response.output) {
              if (outputItem.type === 'message' && outputItem.content) {
                for (const content of outputItem.content) {
                  if (content.type === 'output_text') {
                    responseText += content.text;
                  }
                }
              } else if (outputItem.type === 'reasoning' && outputItem.summary) {
                for (const summary of outputItem.summary) {
                  if (summary.type === 'summary_text') {
                    reasoningText += summary.text;
                  }
                }
              }
            }
          }

          // Yield reasoning tokens first if available
          if (reasoningText.trim()) {
            const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
            yield { type: 'TOKEN', data: reasoningText.trim(), threadId, traceId, sessionId, tokenType };
          }

          // Then yield response tokens
          if (responseText.trim()) {
            const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
            yield { type: 'TOKEN', data: responseText.trim(), threadId, traceId, sessionId, tokenType };
          }

          // Handle tool calls if present
          if (toolUseBlocks.length > 0) {
            const toolData = toolUseBlocks.map(tu => ({
              type: 'tool_use',
              id: tu.id,
              name: tu.name,
              input: tu.input,
            }));
            const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
            yield { type: 'TOKEN', data: toolData, threadId, traceId, sessionId, tokenType };
          }

          // Yield metadata for non-streaming
          if (response.usage) {
            const totalGenerationTimeMs = Date.now() - startTime;
            const metadata: LLMMetadata = {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              thinkingTokens: response.usage.output_tokens_details?.reasoning_tokens,
              stopReason: response.status === 'completed' ? 'stop' : response.status,
              totalGenerationTimeMs,
              providerRawUsage: { usage: response.usage, status: response.status },
              traceId: traceId,
            };
            yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
          }
        }

        // Yield END signal for both streaming and non-streaming
        yield { type: 'END', data: null, threadId, traceId, sessionId };

      } catch (error: any) {
        Logger.error(`Error during OpenAI Responses API call: ${error.message}`, { error, threadId, traceId });
        const artError = error instanceof ARTError ? error :
          (error instanceof Error && error.message.includes('OpenAI') ? 
            new ARTError(`OpenAI API Error: ${error.message}`, ErrorCode.LLM_PROVIDER_ERROR, error) :
            new ARTError(error.message || 'Unknown OpenAI adapter error', ErrorCode.LLM_PROVIDER_ERROR, error));
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
    }.bind(this);

    return generator();
  }

  /**
   * Optional: Method for graceful shutdown
   */
  async shutdown(): Promise<void> {
    Logger.debug(`OpenAIAdapter shutdown called.`);
    // Clean up any resources if needed
  }

  /**
   * Translates the provider-agnostic `ArtStandardPrompt` into the OpenAI Responses API format.
   * Extracts system prompt separately and formats messages as input array.
   *
   * @private
   * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
   * @returns {{ systemPrompt?: string; input: OpenAIResponsesInputMessage[] }} An object containing the extracted system prompt and the array of Responses API formatted input messages.
   * @throws {ARTError} If translation encounters an issue.
   */
  private translateToResponsesFormat(artPrompt: ArtStandardPrompt): { systemPrompt?: string; input: OpenAIResponsesInputMessage[] } {
    let systemPrompt: string | undefined;
    const input: OpenAIResponsesInputMessage[] = [];

    for (const artMsg of artPrompt) {
      if (artMsg.role === 'system') {
        const systemText = (typeof artMsg.content === 'string') ? artMsg.content : String(artMsg.content);
        if (!systemPrompt) {
          systemPrompt = systemText;
        } else {
          Logger.warn(`OpenAIAdapter: Multiple system messages found. Appending to existing system prompt.`);
          systemPrompt += `\n${systemText}`;
        }
        continue;
      }

      const translatedContent = this.mapArtMessageToResponsesContent(artMsg);
      if (translatedContent) {
        input.push(translatedContent);
      }
    }

    return { systemPrompt, input };
  }

  /**
   * Maps a single `ArtStandardMessage` to OpenAI Responses API input format.
   *
   * @private
   * @param {ArtStandardMessage} artMsg - The ART standard message to map.
   * @returns {OpenAIResponsesInputMessage | null} The translated message for the Responses API, or null if should be skipped.
   * @throws {ARTError} If tool call arguments are not valid JSON.
   */
  private mapArtMessageToResponsesContent(artMsg: ArtStandardMessage): OpenAIResponsesInputMessage | null {
    switch (artMsg.role) {
      case 'user':
      case 'tool_result': {
        // Both user and tool_result messages become 'user' role in Responses API
        const content: Array<{ type: 'input_text'; text: string }> = [];
        
        if (artMsg.role === 'tool_result') {
          // Format tool result with context
          const toolResultText = `Tool result for ${artMsg.name || 'unknown tool'}: ${String(artMsg.content)}`;
          content.push({ type: 'input_text', text: toolResultText });
        } else {
          // Regular user message
          const userText = typeof artMsg.content === 'string' ? artMsg.content : String(artMsg.content);
          content.push({ type: 'input_text', text: userText });
        }

        return { role: 'user', content };
      }

      case 'assistant': {
        const content: Array<{ type: 'output_text'; text: string }> = [];
        
        // Handle text content
        if (typeof artMsg.content === 'string' && artMsg.content.trim() !== '') {
          content.push({ type: 'output_text', text: artMsg.content });
        }

        // Handle tool calls - convert to text description for Responses API
        if (artMsg.tool_calls && artMsg.tool_calls.length > 0) {
          const toolCallsText = artMsg.tool_calls.map(tc => {
            try {
              const args = JSON.parse(tc.function.arguments || '{}');
              return `Called tool ${tc.function.name} with arguments: ${JSON.stringify(args)}`;
            } catch (e: any) {
              throw new ARTError(
                `OpenAIAdapter: Failed to parse tool call arguments for tool ${tc.function.name} (ID: ${tc.id}). Arguments must be valid JSON. Error: ${e.message}`,
                ErrorCode.PROMPT_TRANSLATION_FAILED, e
              );
            }
          }).join('\n');
          
          if (content.length > 0) {
            content[0].text += '\n\n' + toolCallsText;
          } else {
            content.push({ type: 'output_text', text: toolCallsText });
          }
        }

        // If no content at all, add empty text
        if (content.length === 0) {
          content.push({ type: 'output_text', text: '' });
        }

        return { role: 'assistant', content };
      }

      case 'tool_request': {
        // Skip tool_request messages - they're handled by assistant's tool_calls
        Logger.debug(`OpenAIAdapter: Skipping 'tool_request' role message as it's handled by assistant's tool_calls.`);
        return null;
      }

      default: {
        Logger.warn(`OpenAIAdapter: Skipping message with unhandled role: ${artMsg.role}`);
        return null;
      }
    }
  }

  /**
   * Translates an array of `ToolSchema` from the ART framework format to OpenAI's Responses API tool format.
   * @private
   * @param {ToolSchema[]} artTools - An array of ART tool schemas.
   * @returns {OpenAIResponsesTool[]} An array of tools formatted for the OpenAI Responses API.
   * @throws {ARTError} If a tool's `inputSchema` is invalid.
   */
  private translateArtToolsToOpenAI(artTools: ToolSchema[]): OpenAIResponsesTool[] {
    return artTools.map(artTool => {
      if (!artTool.inputSchema || typeof artTool.inputSchema !== 'object') {
        throw new ARTError(`Invalid inputSchema definition for tool '${artTool.name}'. Expected a JSON schema object.`, ErrorCode.INVALID_CONFIG);
      }
      return {
        type: 'function',
        function: {
          name: artTool.name,
          description: artTool.description,
          parameters: artTool.inputSchema,
        },
      };
    });
  }
}