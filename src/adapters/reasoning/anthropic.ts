// src/adapters/reasoning/anthropic.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
import { Logger } from '../../utils/logger';

// Define expected options for the Anthropic adapter constructor
export interface AnthropicAdapterOptions {
  apiKey: string;
  model?: string; // e.g., 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'
  apiVersion?: string; // e.g., '2023-06-01'
  apiBaseUrl?: string; // Optional override
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

export class AnthropicAdapter implements ProviderAdapter {
  readonly providerName = 'anthropic';
  private apiKey: string;
  private model: string;
  private apiVersion: string;
  private apiBaseUrl: string;

  // Default max tokens if not provided in options, as Anthropic requires it
  private defaultMaxTokens = 1024;

  constructor(options: AnthropicAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('Anthropic API key is required.');
    }
    this.apiKey = options.apiKey;
    // Common default model, user should override if needed
    this.model = options.model || 'claude-3-haiku-20240307';
    this.apiVersion = options.apiVersion || '2023-06-01';
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.anthropic.com/v1';
    Logger.debug(`AnthropicAdapter initialized with model: ${this.model}, version: ${this.apiVersion}`);
  }

  /**
   * Calls the Anthropic Messages API.
   * Note: Assumes prompt is a string for basic user input.
   *       Does not yet handle complex history or system prompts robustly.
   *       `onThought` is not implemented (requires streaming API).
   * @param prompt - Treated as the user message content.
   * @param options - Call options including LLM parameters. Requires max_tokens/maxOutputTokens.
   * @returns The content string from the API response.
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