// src/adapters/reasoning/openrouter.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
import { Logger } from '../../utils/logger';

// Define expected options for the OpenRouter adapter constructor
export interface OpenRouterAdapterOptions {
  apiKey: string;
  model: string; // Required: OpenRouter model identifier (e.g., 'google/gemini-pro', 'anthropic/claude-3-haiku')
  apiBaseUrl?: string; // Optional override
  siteUrl?: string; // Optional: Recommended header 'HTTP-Referer'
  appName?: string; // Optional: Recommended header 'X-Title'
}

// Re-use OpenAI-compatible structures, adding OpenRouter specific fields
interface OpenRouterChatCompletionPayload {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  stop?: string | string[];
  transforms?: string[]; // OpenRouter specific
  route_prefix?: string; // OpenRouter specific
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

export class OpenRouterAdapter implements ProviderAdapter {
  readonly providerName = 'openrouter';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;
  private siteUrl?: string;
  private appName?: string;

  constructor(options: OpenRouterAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('OpenRouter API key is required.');
    }
     if (!options.model) {
      // Model is required for OpenRouter as it specifies the underlying provider/model
      throw new Error('OpenRouter model identifier is required (e.g., google/gemini-pro).');
    }
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.apiBaseUrl = options.apiBaseUrl || 'https://openrouter.ai/api/v1';
    this.siteUrl = options.siteUrl;
    this.appName = options.appName;
    Logger.info(`OpenRouterAdapter initialized for model: ${this.model}`); // Use info level
    // Add warning for model format
    if (!this.model.includes('/')) {
        Logger.warn(`OpenRouter model "${this.model}" might be missing the provider prefix (e.g., "openai/gpt-4o").`);
    }
  }

  /**
   * Calls the OpenRouter Chat Completions API (OpenAI compatible).
   * Note: Assumes prompt is a string for basic user input.
   *       Does not yet handle complex history or system prompts robustly.
   *       `onThought` is not implemented (requires streaming API).
   * @param prompt - Treated as the user message content.
   * @param options - Call options including LLM parameters.
   * @returns The content string from the API response.
   */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    if (typeof prompt !== 'string') {
      Logger.warn('OpenRouterAdapter received non-string prompt. Treating as string.', { threadId: options.threadId, traceId: options.traceId });
      prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;

    // Build messages array
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    if (options.system || options.system_prompt) {
      messages.push({ role: 'system', content: options.system || options.system_prompt || '' });
    }
    // TODO: Add conversation history handling here
    messages.push({ role: 'user', content: prompt });

    // Map relevant parameters from CallOptions
    const stopSequences = options.stop || options.stop_sequences || options.stopSequences;

    const payload: OpenRouterChatCompletionPayload = {
      model: this.model, // Use the specific model provided in constructor options
      messages: messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens || options.maxOutputTokens,
      top_p: options.top_p || options.topP,
      top_k: options.top_k || options.topK,
      stop: stopSequences,
      // Add OpenRouter specific parameters from options
      transforms: options.transforms,
      route_prefix: options.route_prefix,
    };

    // Remove undefined parameters from payload
    Object.keys(payload).forEach(key => payload[key as keyof OpenRouterChatCompletionPayload] === undefined && delete payload[key as keyof OpenRouterChatCompletionPayload]);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
    };
    // Add recommended OpenRouter headers if provided
    if (this.siteUrl) {
        headers['HTTP-Referer'] = this.siteUrl;
    }
     if (this.appName) {
        headers['X-Title'] = this.appName;
    }

    Logger.debug(`Calling OpenRouter API: ${apiUrl} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });
    Logger.debug(`OpenRouter Payload: ${JSON.stringify(payload)}`, { threadId: options.threadId, traceId: options.traceId }); // Log payload

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
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

      // TODO: Add streaming support here

      const data = await response.json() as OpenAIChatCompletionResponse; // Assuming OpenAI compatible response
      Logger.debug('OpenRouter API non-streaming response received.', { threadId: options.threadId, traceId: options.traceId });

      if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
         Logger.error('Invalid response structure from OpenRouter API', { responseData: data, threadId: options.threadId, traceId: options.traceId });
        throw new Error('Invalid response structure from OpenRouter API: No content found.');
      }

      const responseContent = data.choices[0].message.content.trim();
      Logger.debug(`OpenRouter API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
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