// src/adapters/reasoning/openai.ts
import { ProviderAdapter } from '../../core/interfaces'; // Import only ProviderAdapter from here
import { FormattedPrompt, CallOptions } from '../../types'; // Import CallOptions directly from types
import { Logger } from '../../utils/logger';

// Define expected options for the OpenAI adapter constructor
export interface OpenAIAdapterOptions {
  apiKey: string;
  model?: string; // e.g., 'gpt-4', 'gpt-3.5-turbo'
  apiBaseUrl?: string; // Optional override for base URL (e.g., for proxies)
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

export class OpenAIAdapter implements ProviderAdapter {
  readonly providerName = 'openai';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;

  constructor(options: OpenAIAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('OpenAI API key is required.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model || 'gpt-3.5-turbo'; // Default model
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.openai.com/v1';
    Logger.debug(`OpenAIAdapter initialized with model: ${this.model}`);
  }

  /**
   * Calls the OpenAI Chat Completions API.
   * Note: This basic implementation assumes the FormattedPrompt is a string
   *       representing the user's message or a pre-formatted structure.
   *       It doesn't yet handle complex history formatting or system prompts
   *       directly from the FormattedPrompt type itself.
   *       The `onThought` callback is not implemented in this non-streaming version.
   * @param prompt - For this basic version, treated as the primary user message content.
   *                 A more robust version would parse a structured prompt object.
   * @param options - Call options, including threadId, traceId, and LLM parameters.
   * @returns The content string from the API response.
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