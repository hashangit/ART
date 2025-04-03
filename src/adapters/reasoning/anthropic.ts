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
  stream?: boolean; // For streaming later
  tools?: any[]; // Added for tool calling
  // Add other Anthropic parameters as needed
}

interface AnthropicMessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: { type: 'text'; text: string }[]; // Assuming text content for now
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null; // Added 'tool_use'
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
    // Updated default model
    this.model = options.model || 'claude-3-7-sonnet-20250219';
    this.apiVersion = options.apiVersion || '2023-06-01'; // Explicit version
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.anthropic.com/v1';
    Logger.info(`AnthropicAdapter initialized with model: ${this.model}, version: ${this.apiVersion}`); // Use info level
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
      Logger.warn('AnthropicAdapter received non-string prompt. Treating as string.', { threadId: options.threadId, traceId: options.traceId });
      prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/messages`;
    const maxTokens = options.max_tokens || options.maxOutputTokens || options.max_tokens_to_sample || this.defaultMaxTokens;

    // Build messages array - TODO: Add history handling
    const messages: { role: 'user' | 'assistant'; content: string | object[] }[] = [
        { role: 'user', content: prompt }
    ];

    const payload: AnthropicMessagesPayload = {
      model: this.model,
      messages: messages,
      system: options.system_prompt || options.system, // System prompt is separate
      max_tokens: maxTokens,
      temperature: options.temperature,
      top_p: options.top_p || options.topP,
      top_k: options.top_k || options.topK,
      stop_sequences: options.stop || options.stop_sequences || options.stopSequences,
    };

    // Add tool support
    if (options.tools) {
        payload.tools = options.tools;
        // Note: Anthropic might have specific tool_choice formats if needed
    }

    // Handle streaming (basic setup, full implementation requires more)
    const useStreaming = !!options.onThought;
    if (useStreaming) {
        payload.stream = true;
        // TODO: Implement Anthropic streaming logic similar to OpenAI's
        Logger.warn('Anthropic streaming with onThought is not fully implemented yet.', { threadId: options.threadId, traceId: options.traceId });
    }

    // Remove undefined parameters from payload (excluding max_tokens)
    Object.keys(payload).forEach(key => {
        const K = key as keyof AnthropicMessagesPayload;
        if (K !== 'max_tokens' && payload[K] === undefined) {
            delete payload[K];
        }
    });

    Logger.debug(`Calling Anthropic API: ${apiUrl} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });
    Logger.debug(`Anthropic Payload: ${JSON.stringify(payload)}`, { threadId: options.threadId, traceId: options.traceId }); // Log payload

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          // 'anthropic-beta': 'tools-2024-04-04', // Example beta header if needed for tools
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const statusText = response.statusText || 'Unknown Status';
        let errorMessage = errorBody;
        try {
            const parsedError = JSON.parse(errorBody);
            errorMessage = parsedError?.error?.message || errorMessage;
        } catch (e) { /* Ignore parsing error */ }
        Logger.error(`${this.providerName} API request failed: ${response.status} ${statusText}`, { errorBody, threadId: options.threadId, traceId: options.traceId });
        // Standard error format
        throw new Error(`${this.providerName} API request failed: ${response.status} ${statusText} - ${errorMessage}`);
      }

      // TODO: Add streaming response handling here if payload.stream was true

      const data = await response.json() as AnthropicMessagesResponse;
      Logger.debug('Anthropic API non-streaming response received.', { threadId: options.threadId, traceId: options.traceId });

      // TODO: Handle tool calls in the response if needed
      // const toolUseContent = data.content?.find(c => c.type === 'tool_use');
      // if (toolUseContent) { ... }

      // Extract text content
      const responseText = data.content?.find(c => c.type === 'text')?.text;

      if (responseText === undefined || responseText === null) {
        // Check if it stopped for tool use instead
        if (data.stop_reason === 'tool_use') {
            Logger.debug('Anthropic response stopped for tool use.', { responseData: data, threadId: options.threadId, traceId: options.traceId });
            // Return an empty string or a specific indicator? For now, empty string.
             return '';
        }
        Logger.error('Invalid response structure from Anthropic API: No text content found', { responseData: data, threadId: options.threadId, traceId: options.traceId });
        throw new Error('Invalid response structure from Anthropic API: No text content found.');
      }

      const responseContent = responseText.trim();
      Logger.debug(`Anthropic API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
      return responseContent;

    } catch (error: any) {
      // Log error with standard message format if not already formatted
      if (!error.message.startsWith(`${this.providerName} API request failed:`)) {
          Logger.error(`Error during ${this.providerName} API call: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });
      }
      // Re-throw for consistent upstream handling
      throw error;
    }
  }
}