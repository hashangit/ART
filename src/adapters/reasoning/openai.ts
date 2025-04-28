// src/adapters/reasoning/openai.ts
import { ProviderAdapter } from '../../core/interfaces'; // Import only ProviderAdapter from here
import { FormattedPrompt, CallOptions } from '../../types'; // Import CallOptions directly from types
import { Logger } from '../../utils/logger';

// Define expected options for the OpenAI adapter constructor
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
interface OpenAIChatCompletionPayload {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_tokens?: number;
  // Add other OpenAI parameters as needed
}

// Extend payload type to include optional stream property
interface OpenAIChatCompletionPayloadWithStream extends OpenAIChatCompletionPayload {
    stream?: boolean;
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
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
 * Note: This basic version does not implement streaming or the `onThought` callback.
 *
 * @implements {ProviderAdapter}
 */
export class OpenAIAdapter implements ProviderAdapter {
  readonly providerName = 'openai';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;

  /**
   * Creates an instance of the OpenAIAdapter.
   * @param options - Configuration options including the API key and optional model/baseURL overrides.
   * @throws {Error} If the API key is missing.
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
   /**
    * Sends a request to the OpenAI Chat Completions API.
    * Handles both standard and streaming requests based on `options.stream`.
    *
    * **Note:**
    * - It currently assumes `prompt` is the primary user message content (string). It does not yet parse complex `FormattedPrompt` objects containing history or system roles directly. These would need to be handled by the `PromptManager` creating the input string.
    * - Streaming implementation is basic and needs further development to handle different event types (METADATA, ERROR) and token types (THINKING vs RESPONSE).
    * - Error handling is basic; specific OpenAI error codes are not parsed in detail.
    *
    * @param prompt - The prompt content, treated as the user message in this basic implementation.
    * @param options - Call options, including `threadId`, `traceId`, `stream` preference, and any OpenAI-specific parameters (like `temperature`, `max_tokens`) passed through.
    * @returns A promise resolving to an AsyncIterable of StreamEvent objects.
    * @throws {Error} If the API request fails (network error, invalid API key, bad request, etc.).
    */
   async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<import("../../types").StreamEvent>> {
    const { threadId, traceId, sessionId } = options;

    // Basic assumption: prompt is the user message string.
    // TODO: Enhance prompt handling to support system prompts and history from FormattedPrompt if it becomes structured.
    if (typeof prompt !== 'string') {
        Logger.warn('OpenAIAdapter received non-string prompt. Treating as string.', { threadId, traceId });
        prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;
    const payload: OpenAIChatCompletionPayloadWithStream = {
      model: this.model,
      messages: [
        // TODO: Add system prompt handling based on options or thread config
        { role: 'user', content: prompt },
        // TODO: Add conversation history handling
      ],
      // Pass through relevant LLM parameters from CallOptions
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      // top_p: options.top_p, // Example of another parameter
    };

    // Add stream flag if requested
    if (options.stream) {
      payload.stream = true;
    }

    // Remove undefined parameters from payload
    Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayloadWithStream] === undefined && delete payload[key as keyof OpenAIChatCompletionPayloadWithStream]);


    Logger.debug(`Calling OpenAI API: ${apiUrl} with model ${this.model}, stream: ${!!options.stream}`, { threadId, traceId });

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
        const errorGenerator = async function*(): AsyncIterable<import("../../types").StreamEvent> {
            yield { type: 'ERROR', data: new Error(`OpenAI API request failed: ${response.status} ${response.statusText} - ${errorBody}`), threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
        };
        // Throw after yielding error event if needed by caller, or just return the generator
        // For now, let's return the generator containing the error.
        return errorGenerator();
        // throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      // --- Handle Streaming Response ---
      if (options.stream && response.body) {
        return this.processStream(response.body, options); // Pass full options object
      }
      // --- Handle Non-Streaming Response ---
      else {
        const data = await response.json() as OpenAIChatCompletionResponse;
        if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
           Logger.error('Invalid response structure from OpenAI API', { responseData: data, threadId, traceId });
           // Yield ERROR event
           const errorGenerator = async function*(): AsyncIterable<import("../../types").StreamEvent> {
               yield { type: 'ERROR', data: new Error('Invalid response structure from OpenAI API: No content found.'), threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
           };
           return errorGenerator();
           // throw new Error('Invalid response structure from OpenAI API: No content found.');
        }

        const responseContent = data.choices[0].message.content.trim();
        Logger.debug(`OpenAI API call successful. Response length: ${responseContent.length}`, { threadId, traceId });

        // Return AsyncIterable for non-streaming case
        const nonStreamGenerator = async function*(): AsyncIterable<import("../../types").StreamEvent> {
            // 1. Yield Token
            yield { type: 'TOKEN', data: responseContent, threadId: threadId ?? '', traceId: traceId ?? '', sessionId, tokenType: 'LLM_RESPONSE' }; // Default token type
            // 2. Yield Metadata (if available)
            if (data.usage) {
                yield {
                    type: 'METADATA',
                    data: {
                        inputTokens: data.usage.prompt_tokens,
                        outputTokens: data.usage.completion_tokens,
                        stopReason: data.choices[0].finish_reason,
                        providerRawUsage: data.usage,
                        traceId: traceId, // Keep original traceId here if needed for metadata itself
                    },
                    threadId: threadId ?? '',
                    traceId: traceId ?? '',
                    sessionId
                };
            }
            // 3. Yield End
            yield { type: 'END', data: null, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
        };
        return nonStreamGenerator();
      }

    } catch (error: any) {
      Logger.error(`Error during OpenAI API call: ${error.message}`, { error, threadId, traceId });
      // Yield ERROR event from the catch block
      const errorGenerator = async function*(): AsyncIterable<import("../../types").StreamEvent> {
          yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
      };
      return errorGenerator();
      // throw error; // Re-throwing might prevent the ERROR event from being processed
    }
  }

  /**
   * Processes the Server-Sent Events (SSE) stream from OpenAI.
   * @param stream - The ReadableStream from the fetch response.
   * @param options - The original CallOptions containing threadId, traceId, sessionId, and callContext.
   * @returns An AsyncIterable yielding StreamEvent objects.
   */
  private async *processStream(stream: ReadableStream<Uint8Array>, options: CallOptions): AsyncIterable<import("../../types").StreamEvent> {
    const { threadId, traceId, sessionId, callContext } = options; // Destructure options
    const startTime = Date.now();
    let firstTokenTime: number | undefined;
    let tokenCount = 0;
    const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
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
                        const jsonData = JSON.parse(dataContent);
                        const delta = jsonData.choices?.[0]?.delta?.content;

                        if (typeof delta === 'string' && delta.length > 0) {
                            // Track token timing and count
                            const now = Date.now();
                            if (firstTokenTime === undefined) {
                              firstTokenTime = now - startTime;
                            }
                            tokenCount++;
                            // Determine tokenType based on callContext (OpenAI doesn't provide thinking markers)
                            const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                            yield { type: 'TOKEN', data: delta, threadId: threadId ?? '', traceId: traceId ?? '', sessionId, tokenType };
                        }
                        // TODO: Extract metadata if provided in stream chunks (less common for OpenAI chat)
                        // TODO: Extract stop reason from final chunk if needed

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
            yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
            done = true; // Stop processing on error
        }
    }

    // Yield metadata event before ending the stream
    yield {
      type: 'METADATA',
      data: {
        outputTokens: tokenCount,
        timeToFirstTokenMs: firstTokenTime,
        totalGenerationTimeMs: Date.now() - startTime,
        traceId,
      },
      threadId: threadId ?? '',
      traceId: traceId ?? '',
      sessionId
    };
    // Final END event after the loop finishes (either by [DONE] or reader completion)
    yield { type: 'END', data: null, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
    Logger.debug("OpenAI stream processing finished.", { threadId, traceId });
  }
}