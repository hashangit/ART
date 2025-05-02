// src/adapters/reasoning/gemini.ts
// Use correct import based on documentation for @google/genai
import { GoogleGenAI, Content, Part, GenerationConfig, GenerateContentResponse } from "@google/genai"; // Import SDK components
import { ProviderAdapter } from '../../core/interfaces';
import {
  ArtStandardPrompt, // Use the new standard type
  // ArtStandardMessage, // Removed unused import
  // ArtStandardMessageRole, // Removed unused import
  CallOptions,
  StreamEvent,
  LLMMetadata,
  // Removed ConversationMessage, MessageRole as they are replaced by ArtStandard types for input
} from '../../types';
import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors'; // Import ARTError and ErrorCode

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
  private genAI: GoogleGenAI; // Stores the initialized GoogleGenAI SDK instance.

  /**
   * Creates an instance of GeminiAdapter.
   * @param {GeminiAdapterOptions} options - Configuration options for the adapter.
   * @throws {Error} If `apiKey` is missing in the options.
   */
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

  /**
   * Makes a call to the configured Gemini model.
   * Translates the `ArtStandardPrompt` into the Gemini API format, sends the request
   * using the `@google/genai` SDK, and yields `StreamEvent` objects representing
   * the response (tokens, metadata, errors, end signal).
   *
   * Handles both streaming and non-streaming requests based on `options.stream`.
   *
   * @param {ArtStandardPrompt} prompt - The standardized prompt messages.
   * @param {CallOptions} options - Options for the LLM call, including streaming preference, model override, and execution context.
   * @returns {Promise<AsyncIterable<StreamEvent>>} An async iterable that yields `StreamEvent` objects.
   *   - `TOKEN`: Contains a chunk of the response text. `tokenType` indicates if it's part of agent thought or final synthesis.
   *   - `METADATA`: Contains information like stop reason, token counts, and timing, yielded once at the end.
   *   - `ERROR`: Contains any error encountered during translation, SDK call, or response processing.
   *   - `END`: Signals the completion of the stream.
   * @see {ArtStandardPrompt}
   * @see {CallOptions}
   * @see {StreamEvent}
   * @see {LLMMetadata}
   */
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const { threadId, traceId = `gemini-trace-${Date.now()}`, sessionId, stream, callContext, model: modelOverride } = options;
    const modelToUse = modelOverride || this.defaultModel;

    // --- Format Payload for SDK ---
    let contents: Content[];
    try {
      contents = this.translateToGemini(prompt); // Use the new translation function
    } catch (error: any) {
      Logger.error(`Error translating ArtStandardPrompt to Gemini format: ${error.message}`, { error, threadId, traceId });
      // Immediately yield error and end if translation fails
      const generator = async function*(): AsyncIterable<StreamEvent> {
          yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId, traceId, sessionId };
          yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
      return generator();
    }

    const generationConfig: GenerationConfig = { // Use SDK GenerationConfig type
      temperature: options.temperature,
      maxOutputTokens: options.max_tokens || options.maxOutputTokens, // Allow both snake_case and camelCase
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
      let streamUsageMetadata: any = undefined; // Variable to hold aggregated usage metadata from stream
      let streamFinishReason: string | undefined; // Will hold finishReason from the LAST chunk
      let lastChunk: GenerateContentResponse | undefined = undefined; // Variable to store the last chunk
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
            lastChunk = chunk; // Store the current chunk as the potential last one
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
             // Capture usage metadata if present in chunks
             if (chunk.usageMetadata) {
                // Note: Based on testing, usageMetadata usually appears only in the *last* chunk,
                // but we check here just in case the behavior changes or varies.
                Logger.debug("Gemini stream chunk usageMetadata:", { usageMetadata: chunk.usageMetadata, threadId, traceId });
                // Simple merge/overwrite for now, might need more sophisticated aggregation
                streamUsageMetadata = { ...(streamUsageMetadata || {}), ...chunk.usageMetadata };
             }
          }

          // NOTE: The new SDK stream example doesn't show accessing a final .response
          // We might need to aggregate metadata from chunks or handle it differently.
          // For now, remove the finalResponse logic and associated metadata yield for streaming.
          // We still need to yield END.
          const totalGenerationTimeMs = Date.now() - startTime; // Keep total time calculation
          Logger.debug("Gemini stream finished processing chunks.", { totalGenerationTimeMs, threadId, traceId });

          // TODO: Revisit how to get final metadata (stopReason, token counts) for streams if needed.
          // --- Extract metadata from the LAST chunk AFTER the loop ---
          if (lastChunk) {
              streamFinishReason = lastChunk.candidates?.[0]?.finishReason;
              streamUsageMetadata = lastChunk.usageMetadata; // Get metadata directly from last chunk
              Logger.debug("Gemini stream - Extracted from last chunk:", { finishReason: streamFinishReason, usageMetadata: streamUsageMetadata, threadId, traceId });
          } else {
              Logger.warn("Gemini stream - No last chunk found after loop.", { threadId, traceId });
          }
          // --- End extraction from last chunk ---
 
          // Yield final METADATA using values extracted from the last chunk
          const finalUsage = streamUsageMetadata || {}; // Use extracted metadata or empty object
          const metadata: LLMMetadata = {
             stopReason: streamFinishReason, // Use finishReason from last chunk
             inputTokens: finalUsage?.promptTokenCount,
             outputTokens: finalUsage?.candidatesTokenCount, // Or totalTokenCount? Check SDK details
             timeToFirstTokenMs: timeToFirstTokenMs,
             totalGenerationTimeMs: totalGenerationTimeMs,
             providerRawUsage: finalUsage, // Use usage from last chunk
             traceId: traceId,
           };
           yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
 
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
   * Translates the provider-agnostic `ArtStandardPrompt` into the Gemini API's `Content[]` format.
   *
   * Key translations:
   * - `system` role: Merged into the first `user` message.
   * - `user` role: Maps to Gemini's `user` role.
   * - `assistant` role: Maps to Gemini's `model` role. Handles text content and `tool_calls` (mapped to `functionCall`).
   * - `tool_result` role: Maps to Gemini's `user` role with a `functionResponse` part.
   * - `tool_request` role: Skipped (implicitly handled by `assistant`'s `tool_calls`).
   *
   * Adds validation to ensure the conversation doesn't start with a 'model' role.
   *
   * @private
   * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
   * @returns {Content[]} The `Content[]` array formatted for the Gemini API.
   * @throws {ARTError} If translation encounters an issue, such as a `tool_result` missing required fields (ErrorCode.PROMPT_TRANSLATION_FAILED).
   * @see https://ai.google.dev/api/rest/v1beta/Content
   */
  private translateToGemini(artPrompt: ArtStandardPrompt): Content[] {
    const geminiContents: Content[] = [];

    // System prompt handling: Gemini prefers system instructions via specific parameters or
    // potentially as the first part of the first 'user' message. For simplicity,
    // we'll merge the system prompt content into the first user message if present.
    let systemPromptContent: string | null = null;

    for (const message of artPrompt) {
      let role: 'user' | 'model';
      const parts: Part[] = [];

      switch (message.role) {
        case 'system':
          // Store system prompt content to potentially merge later.
          if (typeof message.content === 'string') {
            systemPromptContent = message.content;
          } else {
             Logger.warn(`GeminiAdapter: Ignoring non-string system prompt content.`, { content: message.content });
          }
          continue; // Don't add a separate 'system' role message

        case 'user': { // Added braces to fix ESLint error
          role = 'user';
          let userContent = '';
          // Prepend system prompt if this is the first user message
          if (systemPromptContent) {
            userContent += systemPromptContent + "\n\n";
            systemPromptContent = null; // Clear after merging
          }
          if (typeof message.content === 'string') {
            userContent += message.content;
          } else {
             Logger.warn(`GeminiAdapter: Stringifying non-string user content.`, { content: message.content });
             userContent += JSON.stringify(message.content);
          }
          parts.push({ text: userContent });
          break;
        } // Added braces

        case 'assistant':
          role = 'model';
          // Handle text content
          if (typeof message.content === 'string' && message.content.trim() !== '') {
            parts.push({ text: message.content });
          }
          // Handle tool calls (function calls in Gemini)
          if (message.tool_calls && message.tool_calls.length > 0) {
            message.tool_calls.forEach(toolCall => {
              if (toolCall.type === 'function') {
                parts.push({
                  functionCall: {
                    name: toolCall.function.name,
                    args: JSON.parse(toolCall.function.arguments || '{}'), // Gemini expects parsed args object
                  }
                });
              } else {
                 Logger.warn(`GeminiAdapter: Skipping unsupported tool call type: ${toolCall.type}`);
              }
            });
          }
           // If assistant message has neither content nor tool calls, add empty text part? Gemini might require it.
           if (parts.length === 0) {
             parts.push({ text: "" }); // Add empty text part if no content or tool calls
           }
          break;

        case 'tool_result':
          role = 'user'; // Gemini expects tool results within a 'user' role message
          if (!message.tool_call_id || !message.name) {
             throw new ARTError(
               `GeminiAdapter: 'tool_result' message missing required 'tool_call_id' or 'name'.`,
               ErrorCode.PROMPT_TRANSLATION_FAILED
             );
          }
          parts.push({
            functionResponse: {
              name: message.name, // Tool name
              response: {
                // Gemini expects the result content under a 'content' key within 'response'
                // The content should be the stringified output/error from ArtStandardMessage.content
                content: message.content // Assuming content is already stringified result/error
              }
            }
          });
          break;

        case 'tool_request':
           // This role is implicitly handled by 'tool_calls' in the preceding 'assistant' message.
           Logger.debug(`GeminiAdapter: Skipping 'tool_request' role message as it's handled by assistant's tool_calls.`);
           continue; // Skip this message

        default:
          Logger.warn(`GeminiAdapter: Skipping message with unhandled role: ${message.role}`);
          continue;
      }

      geminiContents.push({ role, parts });
    }

     // Handle case where system prompt was provided but no user message followed
     if (systemPromptContent) {
         Logger.warn("GeminiAdapter: System prompt provided but no user message found to merge it into. Adding as a separate initial user message.");
         geminiContents.unshift({ role: 'user', parts: [{ text: systemPromptContent }] });
     }

    // Gemini specific validation: Ensure conversation doesn't start with 'model'
    if (geminiContents.length > 0 && geminiContents[0].role === 'model') {
      Logger.warn("Gemini conversation history starts with 'model' role. Prepending a dummy 'user' turn.", { firstRole: geminiContents[0].role });
      geminiContents.unshift({ role: 'user', parts: [{ text: "(Initial context)" }] }); // Prepend a generic user turn
    }

    return geminiContents;
  }
}