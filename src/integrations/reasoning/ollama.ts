// src/adapters/reasoning/ollama.ts
import OpenAI from "openai";

import { ProviderAdapter } from '@/core/interfaces';
import {
  ArtStandardPrompt,
  ArtStandardMessage,
  CallOptions,
  StreamEvent,
  LLMMetadata,
  ToolSchema, // Added for tool support
} from '@/types';
import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors';
// XmlMatcher removed, parsing of embedded XML is responsibility of OutputParser

// Define expected options for the Ollama adapter constructor
/**
 * Configuration options required for the `OllamaAdapter`.
 */
export interface OllamaAdapterOptions {
  /**
   * The base URL for the Ollama API. Defaults to 'http://localhost:11434'.
   * The '/v1' suffix for OpenAI compatibility will be added automatically.
   */
  ollamaBaseUrl?: string;
  /**
   * The default Ollama model ID to use (e.g., 'llama3', 'mistral').
   * This can be overridden by `RuntimeProviderConfig.modelId` or `CallOptions.model`.
   * It's recommended to set this if you primarily use one model with Ollama.
   */
  defaultModel?: string;
  /**
   * API key for Ollama (if secured). Defaults to "ollama" as commonly used.
   */
  apiKey?: string;
}

// OpenAI-compatible structures (can be shared or adapted from openai.ts)
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // Stringified JSON
  };
}

// Note: Payload and Response types are from 'openai' package directly.

/**
 * Implements the `ProviderAdapter` interface for interacting with Ollama's
 * OpenAI-compatible API endpoint.
 *
 * Handles formatting requests, parsing responses, streaming, and tool use.
 *
 * @see {@link ProviderAdapter} for the interface definition.
 * @see {@link OllamaAdapterOptions} for configuration options.
 */
export class OllamaAdapter implements ProviderAdapter {
  readonly providerName = 'ollama';
  private client: OpenAI;
  private defaultModel?: string;
  private ollamaBaseUrl: string;

  /**
   * Creates an instance of the OllamaAdapter.
   * @param options - Configuration options.
   */
  constructor(options: OllamaAdapterOptions) {
    this.ollamaBaseUrl = options.ollamaBaseUrl || 'http://localhost:11434';
    this.defaultModel = options.defaultModel;

    // Ensure ollamaBaseUrl doesn't end with /v1 or /
    const cleanBaseUrl = this.ollamaBaseUrl.replace(/\/v1$/, "").replace(/\/$/, "");

    this.client = new OpenAI({
      baseURL: `${cleanBaseUrl}/v1`,
      apiKey: options.apiKey || "ollama", // Default API key for local Ollama
      dangerouslyAllowBrowser: true, // Necessary if running in a browser-like environment for local calls
    });

    Logger.debug(`OllamaAdapter initialized. Base URL: ${cleanBaseUrl}/v1, Default Model: ${this.defaultModel || 'Not set'}`);
  }

  /**
   * Sends a request to the Ollama API.
   * Translates `ArtStandardPrompt` to the OpenAI format and handles streaming and tool use.
   *
   * @param {ArtStandardPrompt} prompt - The standardized prompt messages.
   * @param {CallOptions} options - Call options.
   * @returns {Promise<AsyncIterable<StreamEvent>>} A promise resolving to an AsyncIterable of StreamEvent objects.
   */
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const {
      threadId,
      traceId = `ollama-trace-${Date.now()}`,
      sessionId,
      stream = false,
      callContext,
      model: modelOverride,
      tools: availableArtTools,
      providerConfig,
    } = options;

    const modelToUse = providerConfig?.modelId || modelOverride || this.defaultModel;

    if (!modelToUse) {
      const err = new ARTError(
        "Ollama model ID is not specified. Provide it in adapter options, runtime config, or call options.",
        ErrorCode.INVALID_CONFIG
      );
      const errorGenerator = async function* (): AsyncIterable<StreamEvent> {
        yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      };
      return errorGenerator();
    }

    let openAiMessages: OpenAIMessage[];
    try {
      openAiMessages = this.translateToOpenAI(prompt, modelToUse); // Pass modelToUse here
    } catch (error: any) {
      Logger.error(`Error translating ArtStandardPrompt to OpenAI format for Ollama: ${error.message}`, { error, threadId, traceId });
      const artError = error instanceof ARTError ? error : new ARTError(`Prompt translation failed: ${error.message}`, ErrorCode.PROMPT_TRANSLATION_FAILED, error);
      const errorGenerator = async function* (): AsyncIterable<StreamEvent> {
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      };
      return errorGenerator();
    }

    const openAiTools: OpenAI.Chat.Completions.ChatCompletionTool[] | undefined = availableArtTools
      ? this.translateArtToolsToOpenAI(availableArtTools)
      : undefined;

    const requestBody: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: modelToUse,
      messages: openAiMessages as OpenAI.Chat.ChatCompletionMessageParam[], // Cast needed
      temperature: options.temperature ?? providerConfig?.adapterOptions?.temperature,
      max_tokens: options.max_tokens ?? options.maxOutputTokens ?? providerConfig?.adapterOptions?.max_tokens,
      top_p: options.top_p ?? options.topP ?? providerConfig?.adapterOptions?.top_p,
      stop: (options.stop || options.stop_sequences || options.stopSequences) ?? providerConfig?.adapterOptions?.stop,
      stream: stream,
      tools: openAiTools,
      tool_choice: options.tool_choice ?? providerConfig?.adapterOptions?.tool_choice,
    };

    // Remove undefined keys from the request body
    Object.keys(requestBody).forEach(key => {
      const K = key as keyof OpenAI.Chat.Completions.ChatCompletionCreateParams;
      if (requestBody[K] === undefined) {
        delete requestBody[K];
      }
    });

    Logger.debug(`Calling Ollama API (via OpenAI client) with model ${modelToUse}`, { stream, tools: !!openAiTools, threadId, traceId });

    const generator = async function* (this: OllamaAdapter): AsyncIterable<StreamEvent> {
      const startTime = Date.now();
      let timeToFirstTokenMs: number | undefined;
      let accumulatedOutputTokens = 0;
      let finalApiResponseUsage: OpenAI.CompletionUsage | undefined;
      let finalStopReason: string | undefined;

      try {
        if (stream) {
          const streamInstance = await this.client.chat.completions.create(
            requestBody as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming
          );
 
          // let accumulatedText = ""; // Not strictly needed here as text is yielded token by token
          const accumulatedToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];

          for await (const chunk of streamInstance) {
            if (!timeToFirstTokenMs) {
              timeToFirstTokenMs = Date.now() - startTime;
            }

            const delta = chunk.choices[0]?.delta;
            finalStopReason = chunk.choices[0]?.finish_reason ?? finalStopReason;

            if (delta?.content) {
              accumulatedOutputTokens++; // Approximation: count each content chunk as one token
              // If XML parsing is needed for <think> tags, it should be done by OutputParser
              // Adapter streams raw content.
              const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
              yield { type: 'TOKEN', data: delta.content, threadId, traceId, sessionId, tokenType };
            }

            if (delta?.tool_calls) {
              delta.tool_calls.forEach((tcDelta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall) => {
                if (tcDelta.index === undefined) return;

                if (!accumulatedToolCalls[tcDelta.index]) {
                  accumulatedToolCalls[tcDelta.index] = {
                    id: tcDelta.id || '',
                    type: 'function', // Type is always 'function' for OpenAI tools
                    function: {
                      name: tcDelta.function?.name || '',
                      arguments: tcDelta.function?.arguments || ''
                    }
                  };
                } else {
                  if (tcDelta.id) accumulatedToolCalls[tcDelta.index].id = tcDelta.id;
                  if (tcDelta.function?.name) accumulatedToolCalls[tcDelta.index].function.name = tcDelta.function.name;
                  if (tcDelta.function?.arguments) {
                    // Ensure function object exists if not initialized by name first
                    if (!accumulatedToolCalls[tcDelta.index].function) {
                        accumulatedToolCalls[tcDelta.index].function = { name: '', arguments: ''};
                    }
                    accumulatedToolCalls[tcDelta.index].function.arguments += tcDelta.function.arguments;
                  }
                }
              });
            }
             // Ollama's OpenAI compatible stream might not include usage per chunk.
             // We'll rely on the final non-streaming call for accurate usage if possible,
             // or estimate for streaming.
            if (chunk.usage) { // Check if usage is present in the chunk
                finalApiResponseUsage = chunk.usage;
            }
          }
          
          // If streaming and stop reason is tool_calls, yield the accumulated tool calls.
          // Text content would have been yielded incrementally.
          if (finalStopReason === 'tool_calls' && accumulatedToolCalls.length > 0) {
            const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
            const toolData = accumulatedToolCalls.map(tc => ({
                type: 'tool_use', // ART specific marker
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments || '{}'),
            }));
            yield { type: 'TOKEN', data: toolData, threadId, traceId, sessionId, tokenType };
          }
          // Note: accumulatedText is not explicitly yielded here as all text content from delta.content
          // was already yielded token by token. If there's a scenario where text needs to be combined
          // with tool_calls in a single final stream TOKEN event, this logic would need adjustment,
          // but typically stream consumers aggregate individual TOKENs.

        } else { // Non-streaming
          const response = await this.client.chat.completions.create(
            requestBody as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
          );

          const firstChoice = response.choices[0];
          if (!firstChoice || !firstChoice.message) {
            throw new ARTError('Invalid response structure from Ollama API: No message found.', ErrorCode.LLM_PROVIDER_ERROR, new Error(JSON.stringify(response)));
          }

          finalStopReason = firstChoice.finish_reason ?? undefined;
          finalApiResponseUsage = response.usage;
          const responseMessage = firstChoice.message;

          const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';

          if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolData = responseMessage.tool_calls.map((tc: OpenAI.Chat.Completions.ChatCompletionMessageToolCall) => ({
                type: 'tool_use',
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments || '{}'),
            }));
            if (responseMessage.content) {
                 yield { type: 'TOKEN', data: [{type: 'text', text: responseMessage.content.trim()}, ...toolData], threadId, traceId, sessionId, tokenType };
            } else {
                yield { type: 'TOKEN', data: toolData, threadId, traceId, sessionId, tokenType };
            }
          } else if (responseMessage.content) {
            yield { type: 'TOKEN', data: responseMessage.content.trim(), threadId, traceId, sessionId, tokenType };
          }
        }

        const totalGenerationTimeMs = Date.now() - startTime;
        const metadata: LLMMetadata = {
          stopReason: finalStopReason,
          inputTokens: finalApiResponseUsage?.prompt_tokens,
          outputTokens: finalApiResponseUsage?.completion_tokens ?? (stream ? accumulatedOutputTokens : undefined),
          timeToFirstTokenMs: stream ? timeToFirstTokenMs : undefined, // TTFT only for stream
          totalGenerationTimeMs: totalGenerationTimeMs,
          providerRawUsage: { usage: finalApiResponseUsage, finish_reason: finalStopReason },
          traceId: traceId,
        };
        yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };

      } catch (error: any) {
        Logger.error(`Error during Ollama API call: ${error.message}`, { error, threadId, traceId });
        const artError = error instanceof ARTError ? error :
          (error.constructor.name === 'APIError' ? new ARTError(`Ollama API Error (${(error as any).status}): ${(error as any).message}`, ErrorCode.LLM_PROVIDER_ERROR, error) :
            new ARTError(error.message || 'Unknown Ollama adapter error', ErrorCode.LLM_PROVIDER_ERROR, error));
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
      } finally {
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
    }.bind(this);

    return generator();
  }

  /**
   * Translates the provider-agnostic `ArtStandardPrompt` into the OpenAI API's `OpenAIMessage[]` format.
   * This method can handle model-specific formatting, such as merging consecutive messages for certain models.
   * @private
   * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
   * @param {string} [modelIdForTransform] - The model ID, used to determine if special formatting is needed.
   * @returns {OpenAIMessage[]} The `OpenAIMessage[]` array formatted for the OpenAI API.
   */
  private translateToOpenAI(artPrompt: ArtStandardPrompt, modelIdForTransform?: string): OpenAIMessage[] {
    const messagesToProcess = [...artPrompt];
    const translatedMessages: OpenAIMessage[] = [];

    // Determine if R1-style merging is needed (e.g., for deepseek-r1)
    const useR1Format = modelIdForTransform?.toLowerCase().includes("deepseek-r1");

    if (useR1Format) {
      Logger.debug(`OllamaAdapter: Applying R1-style message merging for model: ${modelIdForTransform}`);
      let lastMessage: OpenAIMessage | null = null;
      for (const artMsg of messagesToProcess) {
        // Map current ArtStandardMessage to a basic OpenAIMessage structure first
        // This mapping needs to be careful about roles, as 'tool_result' becomes 'tool'
        let currentRoleForCompare: 'system' | 'user' | 'assistant' | 'tool' = 'user'; // default
        if (artMsg.role === 'system') currentRoleForCompare = 'system';
        else if (artMsg.role === 'user') currentRoleForCompare = 'user';
        else if (artMsg.role === 'assistant') currentRoleForCompare = 'assistant';
        else if (artMsg.role === 'tool_result') currentRoleForCompare = 'tool';
        // 'tool_request' is an error case handled by mapArtMessageToOpenAIMessage

        const currentOpenAIMsgPart = this.mapArtMessageToOpenAIMessage(artMsg);


        if (lastMessage && lastMessage.role === currentRoleForCompare && currentRoleForCompare !== 'system' && currentRoleForCompare !== 'tool') {
          // Merge content for 'user' or 'assistant' roles
          // Note: OpenAI API generally allows consecutive 'tool' messages if they have different tool_call_ids.
          // And 'system' messages are usually single or handled specially.
          // The primary concern for merging is consecutive 'user' or 'assistant' messages for models like DeepSeek R1.

          let mergedContent = "";
          if (typeof lastMessage.content === 'string' && typeof currentOpenAIMsgPart.content === 'string') {
            mergedContent = `${lastMessage.content}\n${currentOpenAIMsgPart.content}`;
          } else if (typeof lastMessage.content === 'string') {
            mergedContent = `${lastMessage.content}\n${currentOpenAIMsgPart.content === null ? '' : String(currentOpenAIMsgPart.content)}`;
          } else if (typeof currentOpenAIMsgPart.content === 'string') {
            mergedContent = `${lastMessage.content === null ? '' : String(lastMessage.content)}\n${currentOpenAIMsgPart.content}`;
          } else { // both might be null or non-string
            mergedContent = `${lastMessage.content === null ? '' : String(lastMessage.content)}\n${currentOpenAIMsgPart.content === null ? '' : String(currentOpenAIMsgPart.content)}`;
          }
          lastMessage.content = mergedContent.trim() || null;

          // Merge tool_calls for assistant messages
          if (lastMessage.role === 'assistant' && currentOpenAIMsgPart.role === 'assistant' && currentOpenAIMsgPart.tool_calls) {
            lastMessage.tool_calls = [...(lastMessage.tool_calls || []), ...currentOpenAIMsgPart.tool_calls];
          }
          // Ensure content is null if only tool_calls are present after merge
          if (lastMessage.role === 'assistant' && !lastMessage.content && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            lastMessage.content = null;
          }

        } else {
          // If roles are different, or it's a system/tool message not needing merge, or it's the first message
          lastMessage = currentOpenAIMsgPart;
          translatedMessages.push(lastMessage);
        }
      }
    } else {
      // Standard mapping without R1-specific merging
      for (const artMsg of messagesToProcess) {
        translatedMessages.push(this.mapArtMessageToOpenAIMessage(artMsg));
      }
    }
    return translatedMessages;
  }

  // Helper function to map a single ArtStandardMessage to an OpenAIMessage
  // This is called by translateToOpenAI
  /**
   * Maps a single `ArtStandardMessage` to an `OpenAIMessage`.
   * @private
   * @param {ArtStandardMessage} message - The message to map.
   * @returns {OpenAIMessage} The mapped message.
   * @throws {ARTError} If an unsupported or invalid message role is encountered.
   */
  private mapArtMessageToOpenAIMessage(message: ArtStandardMessage): OpenAIMessage {
    switch (message.role) {
      case 'system':
        return { role: 'system', content: typeof message.content === 'string' ? message.content : String(message.content) };
      case 'user':
        // User content can be complex (e.g. multipart with images for some providers, but OpenAI expects string or array of content parts)
        // For Ollama with OpenAI client, we assume string content for user messages for now.
        // If ArtStandardMessage.content for user can be an array of parts, this needs adjustment.
        return { role: 'user', content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) };
      case 'assistant': {
        const assistantMsg: OpenAIMessage = {
          role: 'assistant',
          content: typeof message.content === 'string' ? message.content : null,
        };
        if (message.tool_calls && message.tool_calls.length > 0) {
          assistantMsg.tool_calls = message.tool_calls.map(tc => {
            if (tc.type !== 'function' || !tc.function?.name || typeof tc.function?.arguments !== 'string') {
              throw new ARTError(`OllamaAdapter: Invalid tool_call structure in assistant message. ID: ${tc.id}`, ErrorCode.PROMPT_TRANSLATION_FAILED);
            }
            return {
              id: tc.id,
              type: tc.type,
              function: { name: tc.function.name, arguments: tc.function.arguments },
            };
          });
        }
        // OpenAI API: content is required unless tool_calls is present.
        // If content is an empty string and tool_calls are present, set content to null.
        if (assistantMsg.content === '' && assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
          assistantMsg.content = null;
        } else if (assistantMsg.content === '' && (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0)) {
          // If content is empty string and no tool_calls, it might be an issue for some models.
          // However, OpenAI allows empty string content. For safety, can be null.
          // Let's stick to null if it was not a string initially or became empty.
           if (typeof message.content !== 'string') assistantMsg.content = null;
        }
        // Ensure content is explicitly null if it's not a string and not empty (e.g. if it was an object that didn't become a string)
        if (typeof assistantMsg.content !== 'string' && assistantMsg.content !== null) {
            assistantMsg.content = null;
        }
        return assistantMsg;
      }
      case 'tool_result': {
        if (!message.tool_call_id) {
          throw new ARTError("OllamaAdapter: 'tool_result' message missing required 'tool_call_id'.", ErrorCode.PROMPT_TRANSLATION_FAILED);
        }
        return {
          role: 'tool',
          tool_call_id: message.tool_call_id,
          content: String(message.content), // Content is the stringified result/error
        };
      }
      case 'tool_request': // This role should not be directly translated as it's part of assistant's tool_calls
        throw new ARTError("OllamaAdapter: Unexpected 'tool_request' role during mapping. This should be handled via assistant's tool_calls.", ErrorCode.PROMPT_TRANSLATION_FAILED);
      default:
        // This should ideally not be reached if ArtStandardMessageRole is comprehensive
        throw new ARTError(`OllamaAdapter: Unknown message role '${(message as ArtStandardMessage).role}' encountered during mapping.`, ErrorCode.PROMPT_TRANSLATION_FAILED);
    }
  }

  /**
   * Translates an array of `ToolSchema` from the ART framework format to OpenAI's specific tool format.
   * @private
   * @param {ToolSchema[]} artTools - An array of ART tool schemas.
   * @returns {OpenAI.Chat.Completions.ChatCompletionTool[]} An array of tools formatted for the OpenAI API.
   * @throws {ARTError} If a tool's schema is invalid.
   */
  private translateArtToolsToOpenAI(artTools: ToolSchema[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return artTools.map(artTool => {
      // ART's ToolSchema directly provides name, description, and inputSchema.
      // OpenAI tools are always of type 'function'.
      if (!artTool.name || !artTool.inputSchema) {
        throw new ARTError(`Invalid ART ToolSchema for tool '${artTool.name || 'unknown'}'. Must include name and inputSchema.`, ErrorCode.INVALID_CONFIG);
      }
      return {
        type: 'function', // OpenAI tool type is always 'function'
        function: {
          name: artTool.name,
          description: artTool.description,
          parameters: artTool.inputSchema as OpenAI.FunctionParameters, // artTool.inputSchema is the JSON schema
        },
      };
    });
  }

  /**
   * Optional method for graceful shutdown. For Ollama, which is typically a separate
   * local server, this adapter doesn't manage persistent connections that need explicit closing.
   * @returns {Promise<void>} A promise that resolves when the shutdown is complete.
   */
  async shutdown(): Promise<void> {
    Logger.debug(`OllamaAdapter shutdown called. No specific resources to release for model ${this.defaultModel || 'not set'}.`);
    // No explicit resources to release for a typical Ollama HTTP API client.
    return Promise.resolve();
  }
}
// TODO: Management Features as below
{/*
  Model Management (List, Pull, Delete):

These are administrative tasks. In a complex application, these might be handled by a separate "Ollama Management Service" or utility functions within the application that interact directly with these Ollama API endpoints.
They don't fit naturally into the ProviderAdapter.call() flow, which is about sending a prompt and receiving a response.
Exposing these directly on the OllamaAdapter instance might be possible but could blur its primary responsibility.


Aborting a Stream:

The AsyncIterable<StreamEvent> returned by ProviderAdapter.call() can be aborted by the consumer of the stream. When the consumer stops iterating (e.g., breaks from a for await...of loop or the underlying mechanism like an AbortController signals an abort to the fetch call within the adapter), the adapter's fetch request should be cancelled. This, in turn, should close the connection to the Ollama server, effectively aborting the stream from Ollama's perspective.
The openai SDK (which my OllamaAdapter uses) supports passing an AbortSignal to its methods. This is the standard way to handle cancellation. The OllamaAdapter.call method could accept an AbortSignal in its CallOptions if ART's ReasoningEngine and AgentCore were designed to propagate such a signal.
Currently, CallOptions in ART does not have a standard abortSignal property. Adding this would be a framework-level change.
Without a framework-level abort signal, the adapter itself cannot easily expose an "abort" method for a stream initiated by call(), because the stream consumption is managed externally by the AgentCore.
  */}