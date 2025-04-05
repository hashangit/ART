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
    *
    * **Note:** This is a basic implementation.
    * - It currently assumes `prompt` is the primary user message content (string). It does not yet parse complex `FormattedPrompt` objects containing history or system roles directly. These would need to be handled by the `PromptManager` creating the input string.
    * - Streaming and the `onThought` callback are **not implemented** in this version.
    * - Error handling is basic; specific OpenAI error codes are not parsed in detail.
    *
    * @param prompt - The prompt content, treated as the user message in this basic implementation.
    * @param options - Call options, including `threadId`, `traceId`, and any OpenAI-specific parameters (like `temperature`, `max_tokens`) passed through.
    * @returns A promise resolving to the content string of the assistant's response.
    * @throws {Error} If the API request fails (network error, invalid API key, bad request, etc.).
    */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    // Basic assumption: prompt is the user message string.
    // TODO: Enhance prompt handling to support system prompts and history from FormattedPrompt if it becomes structured.
    if (typeof prompt !== 'string') {
        Logger.warn('OpenAIAdapter received non-string prompt. Treating as string.');
        prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;
    const payload: OpenAIChatCompletionPayload = {
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

    // Remove undefined parameters from payload
    Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayload] === undefined && delete payload[key as keyof OpenAIChatCompletionPayload]);


    Logger.debug(`Calling OpenAI API: ${apiUrl} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });

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
        Logger.error(`OpenAI API request failed with status ${response.status}: ${errorBody}`, { threadId: options.threadId, traceId: options.traceId });
        throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json() as OpenAIChatCompletionResponse;

      if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
         Logger.error('Invalid response structure from OpenAI API', { responseData: data, threadId: options.threadId, traceId: options.traceId });
        throw new Error('Invalid response structure from OpenAI API: No content found.');
      }

      // TODO: Implement onThought callback if streaming is added later.
      // if (options.onThought) { options.onThought('Received response chunk...'); }

      const responseContent = data.choices[0].message.content.trim();
      Logger.debug(`OpenAI API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
      return responseContent;

    } catch (error: any) {
      Logger.error(`Error during OpenAI API call: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });
      // Re-throw or handle appropriately
      throw error;
    }
  }
}