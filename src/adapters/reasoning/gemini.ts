// src/adapters/reasoning/gemini.ts
// Use correct import based on documentation for @google/genai
import { GoogleGenAI, Content, Part, GenerationConfig, GenerateContentResponse } from "@google/genai"; // Import SDK components
import { ProviderAdapter } from '../../core/interfaces';
import { FormattedPrompt, CallOptions, StreamEvent, LLMMetadata, ConversationMessage, MessageRole } from '../../types';
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
  apiBaseUrl?: string; // Note: Not directly used by SDK basic setup
  /** Optional: Specify the API version to use (e.g., 'v1beta'). Defaults to 'v1beta'. */
  apiVersion?: string; // Note: Not directly used by SDK basic setup
}


export class GeminiAdapter implements ProviderAdapter {
  readonly providerName = 'gemini';
  private apiKey: string;
  private defaultModel: string; // Renamed for clarity
  private genAI: GoogleGenAI; // Store SDK instance (using correct type)

  constructor(options: GeminiAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('GeminiAdapter requires an apiKey in options.');
    }
    this.apiKey = options.apiKey;
    this.defaultModel = options.model || 'gemini-1.5-flash-latest'; // Use a common default like flash
    // Initialize the SDK
    // Use correct constructor based on documentation
    this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
    // Note: apiBaseUrl and apiVersion from options are not directly used by the SDK in this basic setup.
    // Advanced SDK configuration might allow proxies if needed.
    Logger.debug(`GeminiAdapter initialized with default model: ${this.defaultModel}`);
  }

  async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const { threadId, traceId = `gemini-trace-${Date.now()}`, sessionId, stream, callContext, model: modelOverride } = options;
    const modelToUse = modelOverride || this.defaultModel;

    // With the new SDK, we call methods directly on genAI.models
    // No need to get a separate model instance here.

    // --- Format Payload for SDK ---
    const contents: Content[] = this.formatMessagesForSDK(prompt); // Use SDK-specific formatter
    const generationConfig: GenerationConfig = { // Use SDK GenerationConfig type
      temperature: options.temperature,
      maxOutputTokens: options.max_tokens || options.maxOutputTokens,
      topP: options.top_p || options.topP,
      topK: options.top_k || options.topK,
      stopSequences: options.stop || options.stop_sequences || options.stopSequences,
      // candidateCount: options.n // Map 'n' if needed
    };
    // Remove undefined generationConfig parameters
    Object.keys(generationConfig).forEach(key =>
        generationConfig[key as keyof GenerationConfig] === undefined &&
        delete generationConfig[key as keyof GenerationConfig]
    );
    // --- End Format Payload ---

    Logger.debug(`Calling Gemini SDK with model ${modelToUse}, stream: ${!!stream}`, { threadId, traceId });

    // Capture 'this.genAI' for use inside the generator function
    const genAIInstance = this.genAI;
    // Use an async generator function
    const generator = async function*(): AsyncIterable<StreamEvent> {
      const startTime = Date.now(); // Use const
      let timeToFirstTokenMs: number | undefined;
      // Removed unused aggregatedResponseText

      try {
        // --- Handle Streaming Response using SDK ---
        if (stream) {
          // Let TypeScript infer the type of streamResult
          // Use the new SDK pattern: genAI.models.generateContentStream
          const streamResult = await genAIInstance.models.generateContentStream({ // Use captured instance
            model: modelToUse, // Pass model name here
            contents,
            config: generationConfig, // Pass config object directly (key is 'config')
          });

          // Process the stream by iterating directly over streamResult (based on docs)
          for await (const chunk of streamResult) {
            if (!timeToFirstTokenMs) {
                timeToFirstTokenMs = Date.now() - startTime;
            }
            const textPart = chunk.text; // Access as property (based on docs)
            if (textPart) {
              // Determine tokenType based on callContext (Gemini SDK doesn't expose thinking markers directly)
              const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
              yield { type: 'TOKEN', data: textPart, threadId, traceId, sessionId, tokenType };
            }
             // Log potential usage metadata if available in chunks (less common)
             if (chunk.usageMetadata) {
                Logger.debug("Gemini stream chunk usageMetadata:", { usageMetadata: chunk.usageMetadata, threadId, traceId });
             }
          }

          // NOTE: The new SDK stream example doesn't show accessing a final .response
          // We might need to aggregate metadata from chunks or handle it differently.
          // For now, remove the finalResponse logic and associated metadata yield for streaming.
          // We still need to yield END.
          const totalGenerationTimeMs = Date.now() - startTime; // Keep total time calculation
          Logger.debug("Gemini stream finished processing chunks.", { totalGenerationTimeMs, threadId, traceId });

          // TODO: Revisit how to get final metadata (stopReason, token counts) for streams if needed.
          // Yield placeholder METADATA for now? Or omit? Let's omit for now to match docs pattern.

        // --- Handle Non-Streaming Response using SDK ---
        } else {
          // Use the new SDK pattern: genAIInstance.models.generateContent
          // Revert direct parameter passing
          const result: GenerateContentResponse = await genAIInstance.models.generateContent({ // Use captured instance
            model: modelToUse, // Pass model name here
            contents,
            config: generationConfig, // Use 'config' key as per documentation
          });
          // Removed incorrect line: const response = result.response;
          const firstCandidate = result.candidates?.[0]; // Access directly from result
          const responseText = result.text; // Access as a property
          const finishReason = firstCandidate?.finishReason;
          const usageMetadata = result.usageMetadata; // Access directly from result
          const totalGenerationTimeMs = Date.now() - startTime;


          // Check if candidate exists AND responseText is truthy (not undefined, null, or empty string)
          if (!firstCandidate || !responseText) {
            if (result.promptFeedback?.blockReason) { // Access directly from result
              Logger.error('Gemini SDK call blocked.', { feedback: result.promptFeedback, threadId, traceId });
              yield { type: 'ERROR', data: new Error(`Gemini API call blocked: ${result.promptFeedback.blockReason}`), threadId, traceId, sessionId };
              return;
            }
            Logger.error('Invalid response structure from Gemini SDK: No text content found', { responseData: result, threadId, traceId }); // Log the whole result
            yield { type: 'ERROR', data: new Error('Invalid response structure from Gemini SDK: No text content found.'), threadId, traceId, sessionId };
            return;
          }

          // Yield TOKEN
          // Determine tokenType based on callContext for non-streaming
          // For planning (AGENT_THOUGHT), yield the raw response text for the OutputParser
          // For synthesis, yield the text as the final response
          const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'LLM_RESPONSE';
          yield { type: 'TOKEN', data: responseText.trim(), threadId, traceId, sessionId, tokenType };

          // Yield METADATA
          const metadata: LLMMetadata = {
            stopReason: finishReason,
            inputTokens: usageMetadata?.promptTokenCount,
            outputTokens: usageMetadata?.candidatesTokenCount,
            totalGenerationTimeMs: totalGenerationTimeMs,
            providerRawUsage: usageMetadata,
            traceId: traceId,
          };
          yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
        }

        // Yield END signal
        yield { type: 'END', data: null, threadId, traceId, sessionId };

      } catch (error: any) {
        Logger.error(`Error during Gemini SDK call: ${error.message}`, { error, threadId, traceId });
        yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId, traceId, sessionId };
        // Ensure END is yielded even after an error
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
    };

    return generator();
  }

  /**
   * Formats messages for the @google/genai SDK's `contents` array.
   * Handles ConversationMessage[] and maps roles correctly.
   */
  private formatMessagesForSDK(prompt: FormattedPrompt): Content[] {
    const sdkContents: Content[] = [];
    let messages: ConversationMessage[] = [];

    if (typeof prompt === 'string') {
        messages.push({ role: MessageRole.USER, content: prompt, messageId: '', threadId: '', timestamp: 0 });
    } else if (Array.isArray(prompt)) {
        messages = prompt as ConversationMessage[];
    } else {
        Logger.warn('GeminiAdapter received complex FormattedPrompt object, attempting to stringify.');
        messages.push({ role: MessageRole.USER, content: JSON.stringify(prompt), messageId: '', threadId: '', timestamp: 0 });
    }

    // Map ART roles to SDK roles ('user' or 'model')
    for (const message of messages) {
        let role: 'user' | 'model';
        if (message.role === MessageRole.USER) {
            role = 'user';
        } else if (message.role === MessageRole.AI) { // Map AI to model (ASSISTANT role doesn't exist in enum)
            role = 'model';
        } else {
            Logger.debug(`Skipping message with role ${message.role} for Gemini contents.`);
            continue; // Skip SYSTEM, TOOL, etc. for basic contents array
        }

        // SDK expects parts array, currently just using text part
        const parts: Part[] = [{ text: message.content }];
        sdkContents.push({ role, parts });
    }

     // Gemini SDK generally handles history ordering, but basic validation can be useful.
     // Ensure conversation doesn't start with 'model' if possible (SDK might handle this better)
     if (sdkContents.length > 0 && sdkContents[0].role === 'model') {
         Logger.warn("Gemini conversation history starts with 'model' role. Prepending a dummy 'user' turn might be needed if issues arise.", { firstRole: sdkContents[0].role });
         // Consider prepending: sdkContents.unshift({ role: 'user', parts: [{ text: "(Context)" }] });
     }


    return sdkContents;
  }
}