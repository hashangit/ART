// src/adapters/reasoning/anthropic.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
import { Logger } from '../../utils/logger';

// Define expected options for the Anthropic adapter constructor
/**
 * Configuration options required for the `AnthropicAdapter`.
 */
export interface AnthropicAdapterOptions {
  /** Your Anthropic API key. Handle securely. */
  apiKey: string;
  /** The default Anthropic model ID to use (e.g., 'claude-3-opus-20240229', 'claude-3-5-sonnet-20240620'). Defaults to 'claude-3-haiku-20240307' if not provided. */
  model?: string;
  /** Optional: The Anthropic API version to target (e.g., '2023-06-01'). Defaults to '2023-06-01'. */
  apiVersion?: string;
  /** Optional: Override the base URL for the Anthropic API. */
  apiBaseUrl?: string;
}

// Define the structure expected by the Anthropic Messages API
// Based on https://docs.anthropic.com/claude/reference/messages_post
interface AnthropicMessagesPayload {
  model: string;
  messages: { role: 'user' | 'assistant'; content: string | object[] }[]; // Content can be complex
  system?: string; // Optional system prompt
  max_tokens: number; // Required by Anthropic
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  // stream?: boolean; // For streaming later
  // Add other Anthropic parameters as needed
}

interface AnthropicMessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: { type: 'text'; text: string }[]; // Assuming text content for now
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Implements the `ProviderAdapter` interface for interacting with Anthropic's
 * Messages API (Claude models).
 *
 * Handles formatting requests and parsing responses for Anthropic.
 * Note: This basic version does not implement streaming or the `onThought` callback.
 *
 * @implements {ProviderAdapter}
 */
export class AnthropicAdapter implements ProviderAdapter {
  readonly providerName = 'anthropic';
  private apiKey: string;
  private model: string;
  private apiVersion: string;
  private apiBaseUrl: string;

  // Default max tokens if not provided in options, as Anthropic requires it
  private defaultMaxTokens = 1024;

  /**
   * Creates an instance of the AnthropicAdapter.
   * @param options - Configuration options including the API key and optional model/apiVersion/baseURL overrides.
   * @throws {Error} If the API key is missing.
   */
  constructor(options: AnthropicAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('AnthropicAdapter requires an apiKey in options.');
    }
    this.apiKey = options.apiKey;
    // Common default model, user should override if needed
    this.model = options.model || 'claude-3-haiku-20240307';
    this.apiVersion = options.apiVersion || '2023-06-01';
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.anthropic.com/v1';
    Logger.debug(`AnthropicAdapter initialized with model: ${this.model}, version: ${this.apiVersion}`);
  }

  /**
   /**
    * Sends a request to the Anthropic Messages API.
    *
    * **Note:** This is a basic implementation.
    * - It currently assumes `prompt` is the primary user message content (string) and places it in the `messages` array. It does not yet parse complex `FormattedPrompt` objects containing history or specific roles. These would need to be handled by the `PromptManager`.
    * - It supports passing a `system` prompt via `options.system` or `options.system_prompt`.
    * - Streaming and the `onThought` callback are **not implemented** in this version.
    * - Requires `max_tokens` (or alias) in the options, as it's mandatory for the Anthropic API.
    *
    * @param prompt - The prompt content, treated as the user message in this basic implementation.
    * @param options - Call options, including `threadId`, `traceId`, `system` prompt, and any Anthropic-specific generation parameters (like `temperature`, `max_tokens`, `top_p`, `top_k`).
    * @returns A promise resolving to the text content from the assistant's response.
    * @throws {Error} If the API request fails (network error, invalid API key, bad request, etc.) or if `max_tokens` is missing.
    */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    if (typeof prompt !== 'string') {
      Logger.warn('AnthropicAdapter received non-string prompt. Treating as string.');
      prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/messages`;
    const maxTokens = options.max_tokens || options.maxOutputTokens || options.max_tokens_to_sample || this.defaultMaxTokens;

    const payload: AnthropicMessagesPayload = {
      model: this.model,
      messages: [
        // TODO: Add system prompt/history handling by mapping to Anthropic's messages structure
        { role: 'user', content: prompt }, // Simple user prompt
      ],
      system: options.system_prompt || options.system, // Allow system prompt via options
      max_tokens: maxTokens, // Use mapped or default value
      // Map relevant parameters from CallOptions
      temperature: options.temperature,
      top_p: options.top_p || options.topP,
      top_k: options.top_k || options.topK,
      stop_sequences: options.stop || options.stop_sequences || options.stopSequences,
    };

    // Remove undefined parameters from payload (excluding max_tokens which is required)
    Object.keys(payload).forEach(key => {
        const K = key as keyof AnthropicMessagesPayload;
        if (K !== 'max_tokens' && payload[K] === undefined) {
            delete payload[K];
        }
    });

    Logger.debug(`Calling Anthropic API: ${apiUrl} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          // 'anthropic-beta': 'messages-2023-12-15', // Might be needed for certain features
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        Logger.error(`Anthropic API request failed with status ${response.status}: ${errorBody}`, { threadId: options.threadId, traceId: options.traceId });
        // Attempt to parse error body for better message
        let errorMessage = errorBody;
        try {
            const parsedError = JSON.parse(errorBody);
            if (parsedError?.error?.message) {
                errorMessage = parsedError.error.message;
            }
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(`Anthropic API request failed: ${response.status} ${response.statusText} - ${errorMessage}`);
      }

      const data = await response.json() as AnthropicMessagesResponse;

      // Extract text content - assumes simple text response for now
      const responseText = data.content?.find(c => c.type === 'text')?.text;

      if (responseText === undefined || responseText === null) {
        Logger.error('Invalid response structure from Anthropic API: No text content found', { responseData: data, threadId: options.threadId, traceId: options.traceId });
        throw new Error('Invalid response structure from Anthropic API: No text content found.');
      }

      // TODO: Implement onThought callback if streaming is added later.

      const responseContent = responseText.trim();
      Logger.debug(`Anthropic API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
      return responseContent;

    } catch (error: any) {
      Logger.error(`Error during Anthropic API call: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });
      throw error;
    }
  }
}