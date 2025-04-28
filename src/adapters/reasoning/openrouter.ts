// src/adapters/reasoning/openrouter.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions, StreamEvent, LLMMetadata } from '../../types'; // Added StreamEvent, LLMMetadata
import { Logger } from '../../utils/logger';

// Define expected options for the OpenRouter adapter constructor
/**
 * Configuration options required for the `OpenRouterAdapter`.
 */
export interface OpenRouterAdapterOptions {
  /** Your OpenRouter API key. Handle securely. */
  apiKey: string;
  /** The required OpenRouter model identifier string (e.g., 'google/gemini-pro', 'anthropic/claude-3-haiku', 'openai/gpt-4o'). This specifies which underlying model OpenRouter should use. */
  model: string;
  /** Optional: Override the base URL for the OpenRouter API. Defaults to 'https://openrouter.ai/api/v1'. */
  apiBaseUrl?: string;
  /** Optional: Your application's site URL, sent as the 'HTTP-Referer' header (recommended by OpenRouter). */
  siteUrl?: string;
  /** Optional: Your application's name, sent as the 'X-Title' header (recommended by OpenRouter). */
  appName?: string;
}

// Re-use OpenAI-compatible structures (assuming OpenRouter adheres closely)
interface OpenAIChatCompletionPayload {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  stop?: string | string[];
  // Add other compatible parameters as needed
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string; // The specific model used by OpenRouter
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: { // Usage might be optional or structured differently
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    // OpenRouter might add cost info here
  };
}

/**
 * Implements the `ProviderAdapter` interface for interacting with the OpenRouter API,
 * which provides access to various LLMs through an OpenAI-compatible interface.
 *
 * Handles formatting requests and parsing responses for OpenRouter's chat completions endpoint.
 * Note: Streaming is **not yet implemented** for this adapter. Calls requesting streaming will yield an error.
 *
 * @implements {ProviderAdapter}
 */
export class OpenRouterAdapter implements ProviderAdapter {
  readonly providerName = 'openrouter';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;
  private siteUrl?: string;
  private appName?: string;

  /**
   * Creates an instance of the OpenRouterAdapter.
   * @param options - Configuration options including the API key, the specific OpenRouter model identifier, and optional headers/baseURL.
   * @throws {Error} If the API key or model identifier is missing.
   */
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

  /**
   /**
    * Sends a request to the OpenRouter Chat Completions API endpoint.
    * Uses an OpenAI-compatible payload structure.
    *
    * **Note:** This is a basic implementation.
    * - It currently assumes `prompt` is the primary user message content (string). It does not yet parse complex `FormattedPrompt` objects containing history or system roles directly. These would need to be handled by the `PromptManager`.
    * - Includes recommended OpenRouter headers (`HTTP-Referer`, `X-Title`) if configured.
    *
    * @param prompt - The prompt content.
    * @param options - Call options, including `threadId`, `traceId`, `stream`, and any OpenAI-compatible generation parameters.
    * @returns A promise resolving to an AsyncIterable of StreamEvent objects. If streaming is requested, it currently yields an error event.
    * @throws {Error} If a non-streaming API request fails.
    */
   async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
     const { threadId, traceId = `openrouter-trace-${Date.now()}`, sessionId, stream } = options;
   
     // --- Placeholder for Streaming ---
     if (stream) {
         Logger.warn(`OpenRouterAdapter: Streaming requested but not implemented. Returning error stream.`, { threadId, traceId });
         const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
             const err = new Error("Streaming is not yet implemented for the OpenRouterAdapter.");
             yield { type: 'ERROR', data: err, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
             yield { type: 'END', data: null, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
         };
         return errorGenerator();
     }
   
     // --- Non-Streaming Logic ---
     if (typeof prompt !== 'string') {
       Logger.warn('OpenRouterAdapter received non-string prompt. Treating as string.');
       prompt = String(prompt);
     }
   
     const apiUrl = `${this.apiBaseUrl}/chat/completions`;
     const stopSequences = options.stop || options.stop_sequences || options.stopSequences;
   
     const payload: OpenAIChatCompletionPayload = {
       model: this.model,
       messages: [
         // TODO: Add system prompt/history handling
         { role: 'user', content: prompt },
       ],
       temperature: options.temperature,
       max_tokens: options.max_tokens || options.maxOutputTokens,
       top_p: options.top_p || options.topP,
       top_k: options.top_k || options.topK,
       stop: stopSequences,
     };
   
     Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayload] === undefined && delete payload[key as keyof OpenAIChatCompletionPayload]);
   
     const headers: Record<string, string> = {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${this.apiKey}`,
     };
     if (this.siteUrl) headers['HTTP-Referer'] = this.siteUrl;
     if (this.appName) headers['X-Title'] = this.appName;
   
     Logger.debug(`Calling OpenRouter API (non-streaming): ${apiUrl} with model ${this.model}`, { threadId, traceId });
   
     // Use an async generator for non-streaming case too
     // const adapter = this; // Removed unused alias
     const generator = async function*(): AsyncIterable<StreamEvent> {
         try {
             const response = await fetch(apiUrl, {
                 method: 'POST',
                 headers: headers,
                 body: JSON.stringify(payload),
             });
   
             if (!response.ok) {
                 const errorBody = await response.text();
                 let errorMessage = errorBody;
                 try {
                     const parsedError = JSON.parse(errorBody);
                     if (parsedError?.error?.message) errorMessage = parsedError.error.message;
                 } catch (e) { /* Ignore */ }
                 throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText} - ${errorMessage}`);
             }
   
             const data = await response.json() as OpenAIChatCompletionResponse;
             const choice = data.choices?.[0];
             const responseText = choice?.message?.content;
   
             if (!choice || responseText === undefined || responseText === null) {
                 throw new Error('Invalid response structure from OpenRouter API: No content found.');
             }
   
             const responseContent = responseText.trim();
             Logger.debug(`OpenRouter API call successful. Response length: ${responseContent.length}`, { threadId, traceId });
   
             // Yield TOKEN
             yield { type: 'TOKEN', data: responseContent, threadId, traceId, sessionId, tokenType: 'LLM_RESPONSE' };
             // Yield METADATA
             const metadata: LLMMetadata = {
                 inputTokens: data.usage?.prompt_tokens,
                 outputTokens: data.usage?.completion_tokens,
                 stopReason: choice.finish_reason,
                 providerRawUsage: data.usage,
                 traceId: traceId,
             };
             yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
             // Yield END
             yield { type: 'END', data: null, threadId, traceId, sessionId };
   
         } catch (error: any) {
             Logger.error(`Error during OpenRouter API call: ${error.message}`, { error, threadId, traceId });
             yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId, traceId, sessionId };
             yield { type: 'END', data: null, threadId, traceId, sessionId };
         }
     }.bind(this); // Add .bind(this) back
   
     return generator();
   }
   }