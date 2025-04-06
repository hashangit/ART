// src/adapters/reasoning/deepseek.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
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
 * Note: This basic version does not implement streaming or the `onThought` callback.
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
    * - Streaming and the `onThought` callback are **not implemented** in this version.
    *
    * @param prompt - The prompt content, treated as the user message in this basic implementation.
    * @param options - Call options, including `threadId`, `traceId`, and any OpenAI-compatible generation parameters (like `temperature`, `max_tokens`, `stop`).
    * @returns A promise resolving to the content string of the assistant's response.
    * @throws {Error} If the API request fails (network error, invalid API key, bad request, etc.).
    */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    if (typeof prompt !== 'string') {
      Logger.warn('DeepSeekAdapter received non-string prompt. Treating as string.');
      prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;

    // Map relevant parameters from CallOptions
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
      // Add other parameters compatible with DeepSeek spec if needed
    };

    // Remove undefined parameters from payload
    Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayload] === undefined && delete payload[key as keyof OpenAIChatCompletionPayload]);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
    };

    Logger.debug(`Calling DeepSeek API: ${apiUrl} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        Logger.error(`DeepSeek API request failed with status ${response.status}: ${errorBody}`, { threadId: options.threadId, traceId: options.traceId });
        // Attempt to parse error for better message
         let errorMessage = errorBody;
        try {
            const parsedError = JSON.parse(errorBody);
            if (parsedError?.error?.message) {
                errorMessage = parsedError.error.message;
            }
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText} - ${errorMessage}`);
      }

      const data = await response.json() as OpenAIChatCompletionResponse;

      if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
         Logger.error('Invalid response structure from DeepSeek API', { responseData: data, threadId: options.threadId, traceId: options.traceId });
        throw new Error('Invalid response structure from DeepSeek API: No content found.');
      }

      // TODO: Implement onThought callback if streaming is added later.

      const responseContent = data.choices[0].message.content.trim();
      Logger.debug(`DeepSeek API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
      return responseContent;

    } catch (error: any) {
      Logger.error(`Error during DeepSeek API call: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });
      throw error;
    }
  }
}