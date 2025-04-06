// src/adapters/reasoning/gemini.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
import { Logger } from '../../utils/logger';

// Define expected options for the Gemini adapter constructor
/**
 * Configuration options required for the `GeminiAdapter`.
 */
export interface GeminiAdapterOptions {
  /** Your Google AI API key (e.g., from Google AI Studio). Handle securely. */
  apiKey: string;
  /** The default Gemini model ID to use (e.g., 'gemini-1.5-flash-latest', 'gemini-pro'). Defaults to 'gemini-1.5-flash-latest' if not provided. */
  model?: string;
  /** Optional: Override the base URL for the Google Generative AI API. */
  apiBaseUrl?: string;
  /** Optional: Specify the API version to use (e.g., 'v1beta'). Defaults to 'v1beta'. */
  apiVersion?: string;
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

/**
 * Implements the `ProviderAdapter` interface for interacting with Google's
 * Generative AI API (Gemini models).
 *
 * Handles formatting requests for the `generateContent` endpoint and parsing responses.
 * Note: This basic version does not implement streaming or the `onThought` callback.
 *
 * @implements {ProviderAdapter}
 */
export class GeminiAdapter implements ProviderAdapter {
  readonly providerName = 'gemini';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;
  private apiVersion: string;

  /**
   * Creates an instance of the GeminiAdapter.
   * @param options - Configuration options including the API key and optional model/baseURL/apiVersion overrides.
   * @throws {Error} If the API key is missing.
   */
  constructor(options: GeminiAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('GeminiAdapter requires an apiKey in options.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model || 'gemini-2.0-flash-lite'; // Default model
    this.apiVersion = options.apiVersion || 'v1beta';
    this.apiBaseUrl = options.apiBaseUrl || 'https://generativelanguage.googleapis.com';
    Logger.debug(`GeminiAdapter initialized with model: ${this.model}, version: ${this.apiVersion}`);
  }

  /**
   /**
    * Sends a request to the Google Generative AI API (`generateContent` endpoint).
    *
    * **Note:** This is a basic implementation.
    * - It currently assumes `prompt` is the primary user message content (string) and places it in the `contents` array. It does not yet parse complex `FormattedPrompt` objects containing history or specific roles. These would need to be handled by the `PromptManager`.
    * - Streaming and the `onThought` callback are **not implemented** in this version.
    * - Error handling is basic; specific Gemini error reasons (e.g., safety blocks) are not parsed in detail but are logged.
    *
    * @param prompt - The prompt content, treated as the user message in this basic implementation.
    * @param options - Call options, including `threadId`, `traceId`, and any Gemini-specific generation parameters (like `temperature`, `maxOutputTokens`, `topP`, `topK`) passed through.
    * @returns A promise resolving to the combined text content from the first candidate's response parts.
    * @throws {Error} If the API request fails (network error, invalid API key, bad request, blocked content, etc.).
    */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    if (typeof prompt !== 'string') {
      Logger.warn('GeminiAdapter received non-string prompt. Treating as string.');
      prompt = String(prompt);
    }

    const apiUrl = `${this.apiBaseUrl}/${this.apiVersion}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const payload: GeminiGenerateContentPayload = {
      contents: [
        // TODO: Add system prompt/history handling by mapping to Gemini's contents structure
        { parts: [{ text: prompt }] }, // Simple user prompt
      ],
      generationConfig: {
        // Map relevant parameters from CallOptions
        temperature: options.temperature,
        maxOutputTokens: options.max_tokens || options.maxOutputTokens, // Allow both names
        topP: options.top_p || options.topP,
        topK: options.top_k || options.topK,
        stopSequences: options.stop || options.stop_sequences || options.stopSequences,
      },
    };

    // Remove undefined generationConfig parameters
    if (payload.generationConfig) {
        Object.keys(payload.generationConfig).forEach(key =>
            payload.generationConfig![key as keyof GeminiGenerateContentPayload['generationConfig']] === undefined &&
            delete payload.generationConfig![key as keyof GeminiGenerateContentPayload['generationConfig']]
        );
        // If generationConfig becomes empty, remove it entirely
        if (Object.keys(payload.generationConfig).length === 0) {
            delete payload.generationConfig;
        }
    }


    Logger.debug(`Calling Gemini API: ${apiUrl.split('?')[0]} with model ${this.model}`, { threadId: options.threadId, traceId: options.traceId });

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
        Logger.error(`Gemini API request failed with status ${response.status}: ${errorBody}`, { threadId: options.threadId, traceId: options.traceId });
        throw new Error(`Gemini API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json() as GeminiGenerateContentResponse;

      // Extract text from the first candidate's content parts
      const responseText = data.candidates?.[0]?.content?.parts?.map(part => part.text).join('');

      if (responseText === undefined || responseText === null) {
        // Check for prompt feedback indicating blocking
        if (data.promptFeedback) {
             Logger.error('Gemini API call blocked or failed to generate content.', { responseData: data, threadId: options.threadId, traceId: options.traceId });
             throw new Error('Gemini API call blocked or failed to generate content. Check prompt feedback in logs or API documentation.');
        }
        Logger.error('Invalid response structure from Gemini API: No text content found', { responseData: data, threadId: options.threadId, traceId: options.traceId });
        throw new Error('Invalid response structure from Gemini API: No text content found.');
      }

      // TODO: Implement onThought callback if streaming is added later.

      const responseContent = responseText.trim();
      Logger.debug(`Gemini API call successful. Response length: ${responseContent.length}`, { threadId: options.threadId, traceId: options.traceId });
      return responseContent;

    } catch (error: any) {
      Logger.error(`Error during Gemini API call: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });
      throw error;
    }
  }
}