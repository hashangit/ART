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
  stream?: boolean; // Added for streaming
  tools?: any[]; // Added for tool calling
  tool_choice?: any; // Added for tool calling
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
    this.model = options.model || 'gpt-4o'; // Updated default model
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.openai.com/v1';
    Logger.info(`OpenAIAdapter initialized with model: ${this.model}`); // Use info level for initialization
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
    // Enhanced prompt handling
    if (typeof prompt !== 'string') {
      Logger.warn('OpenAIAdapter received non-string prompt. Treating as string.', { threadId: options.threadId, traceId: options.traceId });
      prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;

    // Build messages array
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    if (options.system || options.system_prompt) {
      messages.push({ role: 'system', content: options.system || options.system_prompt || '' });
    }
    // TODO: Add conversation history handling here if needed, before the user prompt
    messages.push({ role: 'user', content: prompt });

    // Build payload
    const payload: OpenAIChatCompletionPayload = {
      model: this.model,
      messages: messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      // Add other common parameters, ensuring they are not undefined
      ...(options.top_p && { top_p: options.top_p }),
      ...(options.stop && { stop: options.stop }),
    };

    // Add tool calling support
    if (options.tools) {
      payload.tools = options.tools;
      if (options.tool_choice) {
        payload.tool_choice = options.tool_choice;
      }
    }

    // Handle streaming
    const useStreaming = !!options.onThought;
    if (useStreaming) {
      payload.stream = true;
    }

    // Remove undefined top-level keys (like temperature if not provided)
    Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayload] === undefined && delete payload[key as keyof OpenAIChatCompletionPayload]);

    Logger.debug(`Calling OpenAI API: ${apiUrl} with model ${this.model}${useStreaming ? ' (streaming)' : ''}`, { threadId: options.threadId, traceId: options.traceId });
    Logger.debug(`OpenAI Payload: ${JSON.stringify(payload)}`, { threadId: options.threadId, traceId: options.traceId }); // Log payload for debugging

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
        const statusText = response.statusText || 'Unknown Status';
        Logger.error(`OpenAI API request failed: ${response.status} ${statusText}`, { errorBody, threadId: options.threadId, traceId: options.traceId });
        // Standard error format
        throw new Error(`${this.providerName} API request failed: ${response.status} ${statusText} - ${errorBody}`);
      }

      // --- Streaming Logic ---
      if (useStreaming && response.body) {
        Logger.debug('OpenAI API streaming response started.', { threadId: options.threadId, traceId: options.traceId });
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullResponseContent = '';
        let accumulatedDelta = ''; // Accumulate deltas for onThought

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            Logger.debug('OpenAI API stream finished.', { threadId: options.threadId, traceId: options.traceId });
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last partial line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataJson = line.substring(6).trim();
              if (dataJson === '[DONE]') {
                continue; // End of stream signal
              }
              try {
                const chunk = JSON.parse(dataJson);
                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta) {
                  fullResponseContent += delta;
                  accumulatedDelta += delta;
                  // Trigger onThought - potentially debounce or send based on sentence boundaries later
                  if (options.onThought) {
                    // Simple immediate trigger for now
                    options.onThought(accumulatedDelta);
                    accumulatedDelta = ''; // Reset delta for next thought chunk
                  }
                }
                // TODO: Handle tool calls in streaming if needed
              } catch (parseError: any) {
                Logger.warn(`Failed to parse OpenAI stream chunk: ${parseError.message}`, { chunk: dataJson, threadId: options.threadId, traceId: options.traceId });
              }
            }
          }
        }
        // Final thought with any remaining delta
        if (options.onThought && accumulatedDelta) {
            options.onThought(accumulatedDelta);
        }
        Logger.debug(`OpenAI API stream completed. Total length: ${fullResponseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
        return fullResponseContent.trim();

      // --- Non-Streaming Logic ---
      } else {
        const data = await response.json() as OpenAIChatCompletionResponse;
        Logger.debug('OpenAI API non-streaming response received.', { threadId: options.threadId, traceId: options.traceId });

        // TODO: Handle tool calls in non-streaming response if needed
        // const toolCalls = data.choices?.[0]?.message?.tool_calls;
        // if (toolCalls) { ... }

        const responseContent = data.choices?.[0]?.message?.content;

        if (typeof responseContent !== 'string') {
          Logger.error('Invalid response structure from OpenAI API (non-streaming)', { responseData: data, threadId: options.threadId, traceId: options.traceId });
          throw new Error('Invalid response structure from OpenAI API: No content found.');
        }

        Logger.debug(`OpenAI API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
        return responseContent.trim();
      }

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