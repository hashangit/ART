// src/adapters/reasoning/deepseek.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions, StreamEvent, LLMMetadata } from '../../types'; // Added StreamEvent, LLMMetadata
import { Logger } from '../../utils/logger';

// Define expected options for the DeepSeek adapter constructor
/**
 * Configuration options required for the `DeepSeekAdapter`.
 */
export interface DeepSeekAdapterOptions {
  /** Your DeepSeek API key. Handle securely. */
  apiKey: string;
  /** The default DeepSeek model ID to use (e.g., 'deepseek-chat', 'deepseek-coder'). Defaults to 'deepseek-chat' if not provided. */
  model?: string;
  /** Optional: Override the base URL for the DeepSeek API. Defaults to 'https://api.deepseek.com/v1'. */
  apiBaseUrl?: string;
}

// Re-use OpenAI-compatible structures
interface OpenAIChatCompletionPayload {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string | string[];
  // Add other compatible parameters as needed
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
  usage: { // Note: DeepSeek usage structure matches OpenAI
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Implements the `ProviderAdapter` interface for interacting with the DeepSeek API,
 * which uses an OpenAI-compatible Chat Completions endpoint.
 *
 * Handles formatting requests and parsing responses for DeepSeek models.
 * Note: Streaming is **not yet implemented** for this adapter. Calls requesting streaming will yield an error.
 *
 * @implements {ProviderAdapter}
 */
export class DeepSeekAdapter implements ProviderAdapter {
  readonly providerName = 'deepseek';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;

  /**
   * Creates an instance of the DeepSeekAdapter.
   * @param options - Configuration options including the API key and optional model/baseURL overrides.
   * @throws {Error} If the API key is missing.
   */
  constructor(options: DeepSeekAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('DeepSeekAdapter requires an apiKey in options.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model || 'deepseek-chat'; // Default model
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.deepseek.com/v1';
    Logger.debug(`DeepSeekAdapter initialized with model: ${this.model}`);
  }

  /**
   /**
    * Sends a request to the DeepSeek Chat Completions API endpoint.
    * Uses an OpenAI-compatible payload structure.
    *
    * **Note:** This is a basic implementation.
    * - It currently assumes `prompt` is the primary user message content (string). It does not yet parse complex `FormattedPrompt` objects containing history or system roles directly. These would need to be handled by the `PromptManager`.
    *
    * @param prompt - The prompt content.
    * @param options - Call options, including `threadId`, `traceId`, `stream`, and any OpenAI-compatible generation parameters.
    * @returns A promise resolving to an AsyncIterable of StreamEvent objects. If streaming is requested, it currently yields an error event.
    * @throws {Error} If a non-streaming API request fails.
    */
   async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
     const { threadId, traceId = `deepseek-trace-${Date.now()}`, sessionId, stream } = options;
   
     // --- Placeholder for Streaming ---
     if (stream) {
         Logger.warn(`DeepSeekAdapter: Streaming requested but not implemented. Returning error stream.`, { threadId, traceId });
         const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
             const err = new Error("Streaming is not yet implemented for the DeepSeekAdapter.");
             yield { type: 'ERROR', data: err, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
             yield { type: 'END', data: null, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
         };
         return errorGenerator();
     }
   
     // --- Non-Streaming Logic ---
     if (typeof prompt !== 'string') {
       Logger.warn('DeepSeekAdapter received non-string prompt. Treating as string.');
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
       stop: stopSequences,
     };
   
     Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayload] === undefined && delete payload[key as keyof OpenAIChatCompletionPayload]);
   
     const headers: Record<string, string> = {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${this.apiKey}`,
     };
   
     Logger.debug(`Calling DeepSeek API (non-streaming): ${apiUrl} with model ${this.model}`, { threadId, traceId });
   
     // Use an async generator for non-streaming case too
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
                 throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText} - ${errorMessage}`);
             }
   
             const data = await response.json() as OpenAIChatCompletionResponse;
             const choice = data.choices?.[0];
             const responseText = choice?.message?.content;
   
             if (!choice || responseText === undefined || responseText === null) {
                 throw new Error('Invalid response structure from DeepSeek API: No content found.');
             }
   
             const responseContent = responseText.trim();
             Logger.debug(`DeepSeek API call successful. Response length: ${responseContent.length}`, { threadId, traceId });
   
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
             Logger.error(`Error during DeepSeek API call: ${error.message}`, { error, threadId, traceId });
             yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId, traceId, sessionId };
             yield { type: 'END', data: null, threadId, traceId, sessionId };
         }
     }.bind(this); // Bind 'this'
   
     return generator();
   }
   }