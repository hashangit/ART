// src/adapters/reasoning/gemini.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
import { Logger } from '../../utils/logger';

// Define expected options for the Gemini adapter constructor
export interface GeminiAdapterOptions {
  apiKey: string;
  model?: string; // e.g., 'gemini-1.5-flash', 'gemini-pro'
  apiBaseUrl?: string; // Optional override for base URL
  apiVersion?: string; // e.g., 'v1beta'
}

// Define the structure expected by the Gemini API (generateContent)
// Based on https://ai.google.dev/api/rest/v1beta/models/generateContent
interface GeminiGenerateContentPayload {
  contents: {
    role?: 'user' | 'model'; // Optional, defaults to user if only one part
    parts: { text: string }[];
  }[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    // Add other Gemini generation parameters as needed
  };
  // safetySettings?: SafetySetting[]; // Add if needed
  // tools?: Tool[]; // Add if needed
}

interface GeminiGenerateContentResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
      role?: string;
    };
    finishReason?: string;
    // index?: number;
    // safetyRatings?: SafetyRating[];
    // citationMetadata?: CitationMetadata;
  }[];
  promptFeedback?: {
    // blockReason?: string;
    // safetyRatings?: SafetyRating[];
  };
}

export class GeminiAdapter implements ProviderAdapter {
  readonly providerName = 'gemini';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;
  private apiVersion: string;

  constructor(options: GeminiAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('Gemini API key is required.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model || 'gemini-2.5-pro-exp-03-25'; // Updated default model
    this.apiVersion = options.apiVersion || 'v1beta';
    this.apiBaseUrl = options.apiBaseUrl || 'https://generativelanguage.googleapis.com';
    Logger.info(`GeminiAdapter initialized with model: ${this.model}, version: ${this.apiVersion}`); // Use info level
  }

  /**
   * Calls the Google Generative AI API (Gemini).
   * Note: Assumes prompt is a string for basic user input.
   *       Does not yet handle complex history or system prompts.
   *       `onThought` is not implemented (requires streaming API).
   * @param prompt - Treated as the user message content.
   * @param options - Call options including LLM parameters.
   * @returns The content string from the API response.
   */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    if (typeof prompt !== 'string') {
      Logger.warn('GeminiAdapter received non-string prompt. Treating as string.', { threadId: options.threadId, traceId: options.traceId });
      prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/${this.apiVersion}/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Handle system prompt by prepending (as per checklist example)
    // TODO: Add history handling by constructing the contents array appropriately
    let userPromptContent = prompt;
    if (options.system || options.system_prompt) {
        userPromptContent = `${options.system || options.system_prompt}\n\n${prompt}`;
        Logger.debug('Prepending system prompt to user message for Gemini.', { threadId: options.threadId });
    }

    const payload: GeminiGenerateContentPayload = {
      contents: [
        { parts: [{ text: userPromptContent }] }
        // Future: Add history turns here following the {role: 'model', parts: [...]}, {role: 'user', parts: [...]} pattern
      ],
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.max_tokens || options.maxOutputTokens,
        topP: options.top_p || options.topP,
        topK: options.top_k || options.topK,
        stopSequences: options.stop || options.stop_sequences || options.stopSequences,
      },
      // TODO: Add tool support if needed, mapping to Gemini's format
      // tools: options.tools ? mapToolsToGeminiFormat(options.tools) : undefined,
    };

    // Remove undefined generationConfig parameters
    if (payload.generationConfig) {
        Object.keys(payload.generationConfig).forEach(key =>
            payload.generationConfig![key as keyof NonNullable<GeminiGenerateContentPayload['generationConfig']>] === undefined &&
            delete payload.generationConfig![key as keyof NonNullable<GeminiGenerateContentPayload['generationConfig']>]
        );
        if (Object.keys(payload.generationConfig).length === 0) {
            delete payload.generationConfig;
        }
    }

    // TODO: Add streaming support if options.onThought is provided

    Logger.debug(`Calling Gemini API: ${apiUrl.split('?')[0]} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });
    Logger.debug(`Gemini Payload: ${JSON.stringify(payload)}`, { threadId: options.threadId, traceId: options.traceId }); // Log payload

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const statusText = response.statusText || 'Unknown Status';
        Logger.error(`${this.providerName} API request failed: ${response.status} ${statusText}`, { errorBody, threadId: options.threadId, traceId: options.traceId });
        // Standard error format
        throw new Error(`${this.providerName} API request failed: ${response.status} ${statusText} - ${errorBody}`);
      }

      // TODO: Add streaming response handling here

      const data = await response.json() as GeminiGenerateContentResponse;
      Logger.debug('Gemini API non-streaming response received.', { threadId: options.threadId, traceId: options.traceId });

      // Extract text from the first candidate's content parts
      const responseText = data.candidates?.[0]?.content?.parts?.map(part => part.text).join('');

      if (responseText === undefined || responseText === null) {
        const finishReason = data.candidates?.[0]?.finishReason;
        const promptFeedback = data.promptFeedback;
        Logger.error('Gemini API call did not return text content.', { finishReason, promptFeedback, responseData: data, threadId: options.threadId, traceId: options.traceId });
        // Provide more specific error based on feedback if possible
        if (finishReason === 'SAFETY' || promptFeedback) {
             throw new Error('Gemini API call blocked due to safety settings or invalid input. Check logs for details.');
        }
        throw new Error('Invalid response structure from Gemini API: No text content found.');
      }

      const responseContent = responseText.trim();
      Logger.debug(`Gemini API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
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