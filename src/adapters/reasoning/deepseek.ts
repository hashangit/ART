// src/adapters/reasoning/deepseek.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
import { Logger } from '../../utils/logger';

// Define expected options for the DeepSeek adapter constructor
export interface DeepSeekAdapterOptions {
  apiKey: string;
  model?: string; // e.g., 'deepseek-chat', 'deepseek-coder'
  apiBaseUrl?: string; // Optional override
}

// Re-use OpenAI-compatible structures, adding DeepSeek specific fields
interface DeepSeekChatCompletionPayload {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string | string[];
  reasoning?: boolean; // DeepSeek specific
  // Add other compatible parameters as needed
}

// Add DeepSeek specific response fields
interface DeepSeekChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
      reasoning_content?: string; // DeepSeek specific
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DeepSeekAdapter implements ProviderAdapter {
  readonly providerName = 'deepseek';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;

  constructor(options: DeepSeekAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('DeepSeek API key is required.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model || 'DeepSeek-V3-0324'; // Updated default model
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.deepseek.com/v1'; // Keep v1 for compatibility unless specified otherwise
    Logger.info(`DeepSeekAdapter initialized with model: ${this.model}`); // Use info level
  }

  /**
   * Calls the DeepSeek Chat Completions API (OpenAI compatible).
   * Note: Assumes prompt is a string for basic user input.
   *       Does not yet handle complex history or system prompts robustly.
   *       `onThought` is not implemented (requires streaming API).
   * @param prompt - Treated as the user message content.
   * @param options - Call options including LLM parameters.
   * @returns The content string from the API response.
   */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    if (typeof prompt !== 'string') {
      Logger.warn('DeepSeekAdapter received non-string prompt. Treating as string.', { threadId: options.threadId, traceId: options.traceId });
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

    const payload: DeepSeekChatCompletionPayload = {
      model: this.model,
      messages: messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens || options.maxOutputTokens,
      top_p: options.top_p || options.topP,
      stop: stopSequences,
    };

    // Handle DeepSeek-specific reasoning feature
    if (options.reasoning === true) {
        payload.reasoning = true;
        Logger.debug('DeepSeek reasoning parameter enabled.', { threadId: options.threadId });
    }

    // Remove undefined parameters from payload
    Object.keys(payload).forEach(key => payload[key as keyof DeepSeekChatCompletionPayload] === undefined && delete payload[key as keyof DeepSeekChatCompletionPayload]);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
    };

    Logger.debug(`Calling DeepSeek API: ${apiUrl} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });
    Logger.debug(`DeepSeek Payload: ${JSON.stringify(payload)}`, { threadId: options.threadId, traceId: options.traceId }); // Log payload

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

      const data = await response.json() as DeepSeekChatCompletionResponse;
      Logger.debug('DeepSeek API non-streaming response received.', { threadId: options.threadId, traceId: options.traceId });

      const choice = data.choices?.[0];
      const responseContent = choice?.message?.content;
      const reasoningContent = choice?.message?.reasoning_content;

      if (typeof responseContent !== 'string') {
         Logger.error('Invalid response structure from DeepSeek API: No content found.', { responseData: data, threadId: options.threadId, traceId: options.traceId });
         throw new Error('Invalid response structure from DeepSeek API: No content found.');
      }

      // Log reasoning content if requested and present
      if (options.includeReasoning && reasoningContent) {
          Logger.debug(`DeepSeek API returned reasoning content (length: ${reasoningContent.length})`, { reasoningContent, threadId: options.threadId, traceId: options.traceId });
          // Note: We are currently only returning the main content, not the reasoning content.
          // The application layer would need modification to handle both if required.
      }

      Logger.debug(`DeepSeek API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
      return responseContent.trim();

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