// src/adapters/reasoning/gemini.ts
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions, StreamEvent, LLMMetadata, ConversationMessage, MessageRole } from '../../types'; // Added types
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
 * Handles formatting requests for the `generateContent` and `streamGenerateContent` endpoints and parsing responses.
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
    * **Note:**
    * - Handles conversation history and system prompts by mapping them to Gemini's `contents` structure.
    * - Implements streaming using the `streamGenerateContent` endpoint.
    * - Extracts metadata (finish reason, token counts if available).
    * - Determines `tokenType` based on `callContext` (Gemini stream doesn't explicitly mark thinking tokens).
    * - Error handling is basic; specific Gemini error reasons (e.g., safety blocks) are logged but might require more specific handling.
    *
    * @param prompt - The prompt, expected to be `ConversationMessage[]` or a simple string.
    * @param options - Call options, including `threadId`, `traceId`, `sessionId`, `stream`, `callContext`, and Gemini-specific generation parameters.
    * @returns A promise resolving to an AsyncIterable of `StreamEvent` objects.
    * @throws {Error} If the API request fails or the response is invalid.
    */
   async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
     const { threadId, traceId = `gemini-trace-${Date.now()}`, sessionId, stream, callContext } = options;
   
     const modelToUse = options.model || this.model;
     const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
     const apiUrl = `${this.apiBaseUrl}/${this.apiVersion}/models/${modelToUse}:${endpoint}?key=${this.apiKey}`;
   
     // --- Format Payload ---
     const payload: GeminiGenerateContentPayload = {
       contents: this.formatMessages(prompt), // Use helper to format history/prompt
       generationConfig: {
         temperature: options.temperature,
         maxOutputTokens: options.max_tokens || options.maxOutputTokens,
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
         if (Object.keys(payload.generationConfig).length === 0) {
             delete payload.generationConfig;
         }
     }
     // --- End Format Payload ---
   
     Logger.debug(`Calling Gemini API: ${apiUrl.split('?')[0]} with model ${modelToUse}, stream: ${!!stream}`, { threadId, traceId });
   
     // Use an async generator function
     const generator = async function*(): AsyncIterable<StreamEvent> {
         // *** Add log before fetch ***
         Logger.debug(`[${traceId}] GeminiAdapter: Preparing to fetch ${apiUrl.split('?')[0]}`, { payload: JSON.stringify(payload).substring(0, 200) + '...', threadId }); // Log truncated payload

         try {
             const response = await fetch(apiUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload),
             });
   
             // Log status immediately after fetch
             Logger.debug(`Gemini API response status: ${response.status} ${response.statusText}`, { threadId, traceId });

             if (!response.ok) {
                 let errorBody = 'Could not read error body.';
                 try {
                     errorBody = await response.text();
                 } catch (readError: any) {
                     Logger.warn(`Failed to read Gemini error response body: ${readError.message}`, { threadId, traceId });
                 }
                 Logger.error(`Gemini API request failed: ${response.status} ${response.statusText}`, { errorBody, threadId, traceId });
                 yield { type: 'ERROR', data: new Error(`Gemini API Error (${response.status}): ${errorBody}`), threadId, traceId, sessionId };
                 return; // Stop processing if the initial request failed
             }
   
             // --- Handle Streaming Response ---
             if (stream && response.body) {
                 // --- Process Stream Directly ---
                 const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
                 let done = false;
                 let finishReason: string | undefined;
                 let finalUsageMetadata: any = null;

                 while (!done) {
                     try {
                         const { value, done: readerDone } = await reader.read();
                         done = readerDone;
                         if (done || !value) break;

                         Logger.debug(`Gemini Stream Raw Chunk Value:\n${value}`); // Log raw value
                         const potentialJsons = value.split('\n').filter(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
                         Logger.debug(`Potential JSONs found: ${potentialJsons.length}`);

                         for (const chunk of potentialJsons) {
                             try {
                                 Logger.debug(`Attempting to parse JSON chunk: ${chunk}`);
                                 const jsonData = JSON.parse(chunk);
                                 Logger.debug(`Parsed JSON data:`, jsonData); // Keep this

                                 // *** Add detailed logging here ***
                                 if (jsonData.usageMetadata) {
                                     Logger.debug(`Gemini Stream Chunk contained usageMetadata:`, { usageMetadata: jsonData.usageMetadata, threadId, traceId });
                                     finalUsageMetadata = jsonData.usageMetadata; // Capture the last seen metadata
                                 }
                                 const candidate = jsonData.candidates?.[0];
                                 if (candidate) {
                                      Logger.debug(`Gemini Stream Chunk Candidate Details:`, { candidate, threadId, traceId }); // Log the full candidate
                                      // ... existing logic to extract textPart, finishReason ...
                                 }
                                 // *** End of added logging ***

                                 const textPart = candidate?.content?.parts?.[0]?.text;

                                 if (textPart) {
                                     // Current logic - relies only on callContext
                                     const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                                     yield { type: 'TOKEN', data: textPart, threadId, traceId, sessionId, tokenType };
                                 }

                                 if (candidate?.finishReason) {
                                     finishReason = candidate.finishReason;
                                 }
                                 // Note: usageMetadata is already captured if present by the logging above

                             } catch (parseError: any) {
                                 Logger.warn(`Failed to parse Gemini stream chunk: ${chunk}`, { parseError, threadId, traceId });
                             }
                         }

                     } catch (streamError: any) {
                         Logger.error(`Error reading Gemini stream: ${streamError.message}`, { error: streamError, threadId, traceId });
                         yield { type: 'ERROR', data: streamError instanceof Error ? streamError : new Error(String(streamError)), threadId, traceId, sessionId };
                         done = true; // Stop processing on error
                     }
                 }

                 // Yield final METADATA after the stream loop
                 const metadata: LLMMetadata = {
                     stopReason: finishReason,
                     inputTokens: finalUsageMetadata?.promptTokenCount,
                     outputTokens: finalUsageMetadata?.candidatesTokenCount,
                     providerRawUsage: finalUsageMetadata,
                     traceId: traceId,
                 };
                 if (metadata.stopReason || metadata.providerRawUsage) {
                     yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
                 }
                 Logger.debug("Gemini stream processing finished.", { threadId, traceId });
                 // --- End Inline Stream Processing ---

             // --- Handle Non-Streaming Response ---
             } else {
                 const data = await response.json() as GeminiGenerateContentResponse;
                 const firstCandidate = data.candidates?.[0];
                 const responseText = firstCandidate?.content?.parts?.map(part => part.text).join('') ?? '';
   
                 if (!firstCandidate || responseText === '') {
                      // Check for prompt feedback indicating blocking
                      if (data.promptFeedback) {
                          Logger.error('Gemini API call blocked or failed to generate content.', { responseData: data, threadId, traceId });
                          yield { type: 'ERROR', data: new Error('Gemini API call blocked or failed to generate content.'), threadId, traceId, sessionId };
                          return; // Stop generation
                      }
                      Logger.error('Invalid response structure from Gemini API: No text content found', { responseData: data, threadId, traceId });
                      yield { type: 'ERROR', data: new Error('Invalid response structure from Gemini API: No text content found.'), threadId, traceId, sessionId };
                      return; // Stop generation
                 }
   
                 // Yield TOKEN
                 yield { type: 'TOKEN', data: responseText.trim(), threadId, traceId, sessionId, tokenType: 'LLM_RESPONSE' };
                 // Yield METADATA (extract finishReason - token counts often unavailable in non-streaming Gemini)
                 const metadata: LLMMetadata = {
                     stopReason: firstCandidate.finishReason,
                     // Check if usageMetadata exists in the non-streaming response
                     inputTokens: (data as any).usageMetadata?.promptTokenCount,
                     outputTokens: (data as any).usageMetadata?.candidatesTokenCount,
                     providerRawUsage: (data as any).usageMetadata,
                     traceId: traceId,
                 };
                 // Only yield metadata if we captured something meaningful
                 if (metadata.stopReason || metadata.providerRawUsage) {
                     yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
                 }
             }
   
             // Yield END signal
             yield { type: 'END', data: null, threadId, traceId, sessionId };
   
         } catch (error: any) {
             Logger.error(`Error during Gemini API call: ${error.message}`, { error, threadId, traceId });
             yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId, traceId, sessionId };
             // Ensure END is yielded even after an error
             yield { type: 'END', data: null, threadId, traceId, sessionId };
         }
     }; // Remove .bind(this)
   
     return generator();
   }
   
   /**
    * Formats the prompt and history into the structure expected by Gemini's `contents` array.
    * Handles alternating 'user' and 'model' roles.
    * @param prompt - The input prompt, either a string or ConversationMessage array.
    * @returns The formatted `contents` array.
    */
   private formatMessages(prompt: FormattedPrompt): GeminiGenerateContentPayload['contents'] {
       const contents: GeminiGenerateContentPayload['contents'] = [];
       let messages: ConversationMessage[] = [];
   
       if (typeof prompt === 'string') {
           messages.push({ role: MessageRole.USER, content: prompt, messageId: '', threadId: '', timestamp: 0 });
       } else if (Array.isArray(prompt)) {
           messages = prompt as ConversationMessage[];
       } else {
           Logger.warn('GeminiAdapter received complex FormattedPrompt object, attempting to stringify.');
           messages.push({ role: MessageRole.USER, content: JSON.stringify(prompt), messageId: '', threadId: '', timestamp: 0 });
       }
   
       // Gemini requires alternating user/model roles.
       let lastRole: 'user' | 'model' | null = null;
       for (const message of messages) {
           let currentRole: 'user' | 'model' | null = null;
           if (message.role === MessageRole.USER) {
               currentRole = 'user';
           } else if (message.role === MessageRole.AI) { // Map AI to model
               currentRole = 'model';
           } else {
               continue; // Skip SYSTEM/TOOL messages for now
           }
   
           if (lastRole === currentRole) {
               // Merge consecutive messages of the same role
               const lastContent = contents[contents.length - 1];
               lastContent.parts[0].text += `\n${message.content}`;
           } else {
               contents.push({ role: currentRole, parts: [{ text: message.content }] });
               lastRole = currentRole;
           }
       }
   
        // Ensure conversation doesn't start with 'model' role if possible
        if (contents.length > 0 && contents[0].role === 'model') {
            contents.unshift({ role: 'user', parts: [{ text: "(Context)" }] }); // Add dummy user turn
        }
   
   
       return contents;
   }
   
   // Removed private processStream method as logic is now inline
}