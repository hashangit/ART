// src/adapters/reasoning/openai.ts
import { ProviderAdapter } from '@/core/interfaces';
import {
  ArtStandardPrompt, // Use the new standard type
  ArtStandardMessage, // Keep for translation function type hint
  // ArtStandardMessageRole, // Not directly used after import
  CallOptions,
  StreamEvent,
  LLMMetadata,
} from '@/types';
import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors'; // Import ARTError and ErrorCode

// TODO: Upgrade to use the official 'openai' SDK package instead of raw fetch calls.

/**
 * Configuration options required for the `OpenAIAdapter`.
 */
export interface OpenAIAdapterOptions {
  /** Your OpenAI API key. Handle securely. */
  apiKey: string;
  /** The default OpenAI model ID to use (e.g., 'gpt-4o', 'gpt-4o-mini'). Defaults to 'gpt-3.5-turbo' if not provided. */
  model?: string;
  /** Optional: Override the base URL for the OpenAI API (e.g., for Azure OpenAI or custom proxies). */
  apiBaseUrl?: string;
}

// Define the structure expected by the OpenAI Chat Completions API
// Based on https://platform.openai.com/docs/api-reference/chat/create
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null; // Content can be null for assistant messages with only tool_calls
  name?: string; // Required for tool role
  tool_calls?: OpenAIToolCall[]; // For assistant role
  tool_call_id?: string; // Required for tool role
}

interface OpenAIToolCall {
  id: string;
  type: 'function'; // Currently only 'function' is supported
  function: {
    name: string;
    arguments: string; // Stringified JSON
  };
}

interface OpenAIChatCompletionPayload {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  // TODO: Add support for 'tools' and 'tool_choice' parameters if needed later
}

// Note: No separate WithStream type needed if stream is part of the main payload

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage; // Use the defined OpenAIMessage type
    // logprobs?: object | null; // Optional logprobs
    finish_reason: string; // e.g., 'stop', 'length', 'tool_calls'
  }[];
  usage?: { // Usage might be optional in some error cases or streams
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Implements the `ProviderAdapter` interface for interacting with OpenAI's
 * Chat Completions API (compatible models like GPT-3.5, GPT-4, GPT-4o).
 *
 * Handles formatting requests and parsing responses for OpenAI.
 * Uses raw `fetch` for now.
 *
 * @see {@link ProviderAdapter} for the interface definition.
 */
// TODO: Refactor to use the official OpenAI SDK for better error handling, types, and features.
export class OpenAIAdapter implements ProviderAdapter {
  readonly providerName = 'openai';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;

  /**
   * Creates an instance of the OpenAIAdapter.
   * @param {OpenAIAdapterOptions} options - Configuration options including the API key and optional model/baseURL overrides.
   * @throws {Error} If the API key is missing.
   * @see https://platform.openai.com/docs/api-reference
   */
  constructor(options: OpenAIAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('OpenAIAdapter requires an apiKey in options.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model || 'gpt-3.5-turbo'; // Default model
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.openai.com/v1';
    Logger.debug(`OpenAIAdapter initialized with model: ${this.model}`);
  }

  /**
   * Sends a request to the OpenAI Chat Completions API.
   * Translates `ArtStandardPrompt` to the OpenAI format, handles streaming and non-streaming responses.
   *
   * @param {ArtStandardPrompt} prompt - The standardized prompt messages.
   * @param {CallOptions} options - Call options, including `threadId`, `traceId`, `stream` preference, and any OpenAI-specific parameters (like `temperature`, `max_tokens`) passed through.
   * @returns {Promise<AsyncIterable<StreamEvent>>} A promise resolving to an AsyncIterable of StreamEvent objects.
   * @see https://platform.openai.com/docs/api-reference/chat/create
   */
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const { threadId, traceId = `openai-trace-${Date.now()}`, sessionId, stream, callContext, model: modelOverride } = options;
    const modelToUse = modelOverride || this.model;

    // --- Translate Prompt ---
    let openAiMessages: OpenAIMessage[];
    try {
      openAiMessages = this.translateToOpenAI(prompt);
    } catch (error: any) {
      Logger.error(`Error translating ArtStandardPrompt to OpenAI format: ${error.message}`, { error, threadId, traceId });
      // Immediately yield error and end if translation fails
      const generator = async function*(): AsyncIterable<StreamEvent> {
          const err = error instanceof ARTError ? error : new ARTError(`Prompt translation failed: ${error.message}`, ErrorCode.PROMPT_TRANSLATION_FAILED, error);
          yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
          yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
      return generator();
    }
    // --- End Translate Prompt ---

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;
    const payload: OpenAIChatCompletionPayload = {
      model: modelToUse,
      messages: openAiMessages,
      // Pass through relevant LLM parameters from CallOptions
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
      stop: options.stop || options.stop_sequences,
      stream: !!stream, // Set stream based on options
      // TODO: Add 'tools' and 'tool_choice' if needed
    };

    // Remove undefined parameters from payload
    Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayload] === undefined && delete payload[key as keyof OpenAIChatCompletionPayload]);

    Logger.debug(`Calling OpenAI API: ${apiUrl} with model ${modelToUse}, stream: ${!!stream}`, { threadId, traceId });

    // TODO: Replace fetch with official OpenAI SDK client call
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        Logger.error(`OpenAI API request failed with status ${response.status}: ${errorBody}`, { threadId, traceId });
        // Still yield an ERROR event before throwing for consistency
        const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
            // Pass the underlying error object directly
            const err = new ARTError(
                `OpenAI API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
                ErrorCode.LLM_PROVIDER_ERROR,
                new Error(errorBody) // Create a basic error from the body for context
            );
            yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
            yield { type: 'END', data: null, threadId, traceId, sessionId }; // Ensure END is yielded
        };
        return errorGenerator();
      }

      // --- Handle Streaming Response ---
      if (stream && response.body) {
        // TODO: Update processStream to potentially use official SDK stream handling
        return this.processStream(response.body, options);
      }
      // --- Handle Non-Streaming Response ---
      else {
        const data = await response.json() as OpenAIChatCompletionResponse;
        const firstChoice = data.choices?.[0];

        // TODO: Improve error handling for different API error responses
        if (!firstChoice?.message) {
           Logger.error('Invalid response structure from OpenAI API: No message found', { responseData: data, threadId, traceId });
           const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
               // Pass the problematic data as context in the error
               const err = new ARTError('Invalid response structure from OpenAI API: No message found.', ErrorCode.LLM_PROVIDER_ERROR, new Error(JSON.stringify(data)));
               yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
               yield { type: 'END', data: null, threadId, traceId, sessionId };
           };
           return errorGenerator();
        }

        const responseMessage = firstChoice.message;
        // TODO: Handle tool_calls in non-streaming response if needed by agent logic
        if (responseMessage.tool_calls) {
             Logger.debug("OpenAI response included tool calls (non-streaming)", { toolCalls: responseMessage.tool_calls, threadId, traceId });
             // The OutputParser in PESAgent should handle extracting these from the raw LLM response text if needed.
        }
        Logger.debug(`OpenAI API call successful. Finish reason: ${firstChoice.finish_reason}`, { threadId, traceId });

        // Return AsyncIterable for non-streaming case
        const nonStreamGenerator = async function*(): AsyncIterable<StreamEvent> {
            // 1. Yield Token (entire response content)
            // Determine tokenType based on callContext
            const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
            const responseContent = responseMessage.content ?? ''; // Handle null content
            yield { type: 'TOKEN', data: responseContent.trim(), threadId, traceId, sessionId, tokenType };

            // 2. Yield Metadata
            const metadata: LLMMetadata = {
                stopReason: firstChoice.finish_reason,
                inputTokens: data.usage?.prompt_tokens,
                outputTokens: data.usage?.completion_tokens,
                providerRawUsage: { usage: data.usage, finish_reason: firstChoice.finish_reason }, // Include usage and finish reason
                traceId: traceId,
            };
            yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };

            // 3. Yield End
            yield { type: 'END', data: null, threadId, traceId, sessionId };
        };
        return nonStreamGenerator();
      }

    } catch (error: any) {
      Logger.error(`Error during OpenAI API call: ${error.message}`, { error, threadId, traceId });
      const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
          const artError = error instanceof ARTError ? error : new ARTError(error.message, ErrorCode.LLM_PROVIDER_ERROR, error);
          yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
          yield { type: 'END', data: null, threadId, traceId, sessionId }; // Ensure END is yielded
      };
      return errorGenerator();
    }
  }

 /**
   * Processes the Server-Sent Events (SSE) stream from OpenAI.
   * @param stream - The ReadableStream from the fetch response.
   * @param options - The original CallOptions containing threadId, traceId, sessionId, and callContext.
   * @returns An AsyncIterable yielding StreamEvent objects.
   */
  // TODO: Refactor this significantly when switching to the official SDK's stream handling.
  private async *processStream(stream: ReadableStream<Uint8Array>, options: CallOptions): AsyncIterable<StreamEvent> {
    const { threadId, traceId, sessionId, callContext } = options;
    const startTime = Date.now();
    let timeToFirstTokenMs: number | undefined;
    let outputTokens = 0; // Simple token count based on chunks with content
    let finalStopReason: string | undefined; // Store stop reason from the last relevant chunk
    const aggregatedUsage: any = undefined; // Store usage if provided in stream
    // TODO: Add proper aggregation for streamed tool calls if needed
    let aggregatedToolCalls: any[] | undefined = undefined;
    const reader = stream.pipeThrough(new TextDecoderStream() as any).getReader();
    let buffer = '';
    let done = false;

    while (!done) {
        try {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (done) break;

            buffer += value;
            const lines = buffer.split('\n');

            // Process all complete lines except the last (potentially incomplete) one
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line === '') continue; // Skip empty lines

                if (line.startsWith('data: ')) {
                    const dataContent = line.substring(6); // Remove 'data: ' prefix

                    if (dataContent === '[DONE]') {
                        // OpenAI specific stream end signal
                        done = true; // Ensure loop terminates even if reader isn't done
                        break; // Exit inner loop
                    }

                    try {
                        const chunk = JSON.parse(dataContent);
                        const choice = chunk.choices?.[0];

                        if (!choice) continue; // Skip if no choices in chunk

                        // --- Handle Content Delta ---
                        const deltaContent = choice.delta?.content;
                        if (typeof deltaContent === 'string' && deltaContent.length > 0) {
                            const now = Date.now();
                            if (timeToFirstTokenMs === undefined) {
                                timeToFirstTokenMs = now - startTime;
                            }
                            outputTokens++; // Increment token count
                            const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                            yield { type: 'TOKEN', data: deltaContent, threadId: threadId ?? '', traceId: traceId ?? '', sessionId, tokenType };
                        }

                        // --- Handle Tool Call Delta ---
                        // OpenAI streams tool calls piece by piece (index, id, type, function name, function args)
                        const deltaToolCalls = choice.delta?.tool_calls;
                        if (deltaToolCalls) {
                            // We need to aggregate these deltas. For simplicity in this stream processor,
                            // we'll just store the latest full set if available, or log the deltas.
                            // A more robust implementation would aggregate them properly.
                            if (!aggregatedToolCalls) aggregatedToolCalls = [];
                            // This simple aggregation might be incorrect if multiple tool calls are streamed concurrently.
                            deltaToolCalls.forEach((tcDelta: any) => {
                                if (tcDelta.index !== undefined) {
                                    if (!aggregatedToolCalls![tcDelta.index]) aggregatedToolCalls![tcDelta.index] = {};
                                    if (tcDelta.id) aggregatedToolCalls![tcDelta.index].id = tcDelta.id;
                                    if (tcDelta.type) aggregatedToolCalls![tcDelta.index].type = tcDelta.type;
                                    if (tcDelta.function) {
                                        if (!aggregatedToolCalls![tcDelta.index].function) aggregatedToolCalls![tcDelta.index].function = {};
                                        if (tcDelta.function.name) aggregatedToolCalls![tcDelta.index].function.name = tcDelta.function.name;
                                        // Append arguments
                                        if (tcDelta.function.arguments) {
                                            aggregatedToolCalls![tcDelta.index].function.arguments = (aggregatedToolCalls![tcDelta.index].function.arguments || '') + tcDelta.function.arguments;
                                        }
                                    }
                                }
                            });
                            // Logging the delta might be more practical here than full aggregation
                            Logger.debug("OpenAI stream tool call delta:", { deltaToolCalls, threadId, traceId });
                        }


                        // --- Handle Finish Reason ---
                        if (choice.finish_reason) {
                            finalStopReason = choice.finish_reason; // Correct variable name
                            Logger.debug(`OpenAI stream finish reason received: ${finalStopReason}`, { threadId, traceId }); // Correct variable name
                            // Potentially break if needed, but let loop finish for [DONE]
                        }

                    } catch (parseError: any) {
                        Logger.warn(`Failed to parse OpenAI stream chunk: ${dataContent}`, { parseError, threadId, traceId });
                        // Optionally yield an ERROR event here for parsing issues
                        // yield { type: 'ERROR', data: new Error(`Failed to parse stream chunk: ${parseError.message}`), threadId, traceId, sessionId };
                    }
                }
            }
            // Keep the last potentially incomplete line in the buffer
            buffer = lines[lines.length - 1];

        } catch (error: any) {
            Logger.error(`Error reading OpenAI stream: ${error.message}`, { error, threadId, traceId });
            const artError = error instanceof ARTError ? error : new ARTError(`Error reading OpenAI stream: ${error.message}`, ErrorCode.LLM_PROVIDER_ERROR, error);
            yield { type: 'ERROR', data: artError, threadId: threadId ?? '', traceId: traceId ?? '', sessionId: sessionId ?? '' }; // Ensure strings
            done = true; // Stop processing on stream read error
        }
    }

    // --- Stream finished ---
    const totalGenerationTimeMs = Date.now() - startTime;

    // Yield final METADATA event
    // TODO: Get accurate token counts if possible (e.g., if provided in a final stream message or via separate API call)
    const metadata: LLMMetadata = {
        stopReason: finalStopReason,
        // inputTokens: undefined, // Not available from basic stream processing
        outputTokens: outputTokens > 0 ? outputTokens : undefined, // Use chunk count as rough estimate if > 0
        timeToFirstTokenMs: timeToFirstTokenMs,
        totalGenerationTimeMs: totalGenerationTimeMs,
        providerRawUsage: { finish_reason: finalStopReason, usage: aggregatedUsage, aggregatedToolCalls }, // Include collected raw data
        traceId: traceId,
    };
    yield { type: 'METADATA', data: metadata, threadId: threadId ?? '', traceId: traceId ?? '', sessionId: sessionId ?? '' }; // Ensure strings

    // Final END event
    yield { type: 'END', data: null, threadId: threadId ?? '', traceId: traceId ?? '', sessionId: sessionId ?? '' }; // Ensure strings
    Logger.debug("OpenAI stream processing finished.", { threadId, traceId });
  }

  /**
   * Translates the provider-agnostic `ArtStandardPrompt` into the OpenAI API's `OpenAIMessage[]` format.
   *
   * @private
   * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
   * @returns {OpenAIMessage[]} The `OpenAIMessage[]` array formatted for the OpenAI API.
   * @throws {ARTError} If translation encounters an issue (ErrorCode.PROMPT_TRANSLATION_FAILED).
   */
  private translateToOpenAI(artPrompt: ArtStandardPrompt): OpenAIMessage[] {
    return artPrompt.map((message: ArtStandardMessage): OpenAIMessage => {
      switch (message.role) {
        case 'system':
          if (typeof message.content !== 'string') {
            Logger.warn(`OpenAIAdapter: System message content is not a string. Stringifying.`, { content: message.content });
            return { role: 'system', content: String(message.content) };
          }
          return { role: 'system', content: message.content };

        case 'user':
          if (typeof message.content !== 'string') {
            Logger.warn(`OpenAIAdapter: User message content is not a string. Stringifying.`, { content: message.content });
            return { role: 'user', content: String(message.content) };
          }
          return { role: 'user', content: message.content };

        case 'assistant': { // Add block scope for lexical declaration
          // Assistant message can have content, tool_calls, or both
          const assistantMsg: OpenAIMessage = {
            role: 'assistant',
            content: typeof message.content === 'string' ? message.content : null, // Content can be null
          };
          if (message.tool_calls && message.tool_calls.length > 0) {
            assistantMsg.tool_calls = message.tool_calls.map(tc => {
                // Basic validation
                if (tc.type !== 'function' || !tc.function?.name || typeof tc.function?.arguments !== 'string') {
                     throw new ARTError(
                        `OpenAIAdapter: Invalid tool_call structure in assistant message. ID: ${tc.id}`,
                        ErrorCode.PROMPT_TRANSLATION_FAILED
                    );
                }
                return {
                    id: tc.id,
                    type: tc.type, // Assuming 'function'
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments, // Arguments should already be stringified JSON
                    }
                };
            });
          }
          // If content is null/empty and there are no tool_calls, OpenAI might require content to be explicitly null
          if (assistantMsg.content === '' && !assistantMsg.tool_calls) {
              assistantMsg.content = null;
          }
          // Ensure content is not empty string if tool_calls are present (OpenAI requirement)
          if (assistantMsg.content === '' && assistantMsg.tool_calls) {
              assistantMsg.content = null;
          }
          // Ensure content is null if it's not a string (shouldn't happen with current types but good practice)
          if (typeof assistantMsg.content !== 'string' && assistantMsg.content !== null) {
              assistantMsg.content = null;
          }

          return assistantMsg;
        } // Close block scope

        case 'tool_result': { // Add block scope
          if (!message.tool_call_id) {
            throw new ARTError(
              `OpenAIAdapter: 'tool_result' message missing required 'tool_call_id'.`,
              ErrorCode.PROMPT_TRANSLATION_FAILED
            );
          }
          if (typeof message.content !== 'string') {
             Logger.warn(`OpenAIAdapter: Tool result content is not a string. Stringifying.`, { content: message.content });
          }
          return {
            role: 'tool',
            tool_call_id: message.tool_call_id,
            // name: message.name, // OpenAI uses tool_call_id, name is part of the function call itself
            content: String(message.content), // Content is the stringified result/error
          };
        } // Close block scope

        case 'tool_request': { // Add block scope
          // Skip this role, handled by assistant's tool_calls
          Logger.debug(`OpenAIAdapter: Skipping 'tool_request' role message as it's handled by assistant's tool_calls.`);
          // Throw an error for now, as it shouldn't appear if PESAgent is correct
           throw new ARTError(
              `OpenAIAdapter: Unexpected 'tool_request' role encountered during translation.`,
              ErrorCode.PROMPT_TRANSLATION_FAILED
            );
        } // Close block scope

        default: { // Add block scope
          // Should not happen with ArtStandardMessageRole
          Logger.warn(`OpenAIAdapter: Skipping message with unknown role: ${message.role}`);
           throw new ARTError(
              `OpenAIAdapter: Unknown message role '${message.role}' encountered during translation.`,
              ErrorCode.PROMPT_TRANSLATION_FAILED
            );
        } // Close block scope
      }
    });
    // Note: No need to filter nulls if we throw on unexpected roles
  }
}