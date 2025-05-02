// src/adapters/reasoning/anthropic.ts
import { ProviderAdapter } from '../../core/interfaces';
import {
  ArtStandardPrompt, // Use the new standard type
  ArtStandardMessage, // Keep for translation function type hint
  CallOptions,
  StreamEvent,
  LLMMetadata,
} from '../../types';
import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors'; // Import ARTError and ErrorCode

// TODO: Implement streaming support for Anthropic.
// TODO: Consider using the official Anthropic SDK (@anthropic-ai/sdk).

// Define expected options for the Anthropic adapter constructor
/**
 * Configuration options required for the `AnthropicAdapter`.
 */
export interface AnthropicAdapterOptions {
  /** Your Anthropic API key. Handle securely. */
  apiKey: string;
  /** The default Anthropic model ID to use (e.g., 'claude-3-opus-20240229', 'claude-3-5-sonnet-20240620'). Defaults to 'claude-3-haiku-20240307' if not provided. */
  model?: string;
  /** Optional: The Anthropic API version to target (e.g., '2023-06-01'). Defaults to '2023-06-01'. */
  apiVersion?: string;
  /** Optional: Override the base URL for the Anthropic API. */
  apiBaseUrl?: string;
}

// Define the structure expected by the Anthropic Messages API
// Based on https://docs.anthropic.com/claude/reference/messages_post
// And tool use: https://docs.anthropic.com/claude/docs/tool-use
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: object } // Assistant requests tool use
  | { type: 'tool_result'; tool_use_id: string; content: string | { type: 'text', text: string }[]; is_error?: boolean }; // User provides tool result

interface AnthropicMessagesPayload {
  model: string;
  messages: AnthropicMessage[];
  system?: string; // System prompt is top-level
  max_tokens: number; // Required
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  // TODO: Add 'tools' parameter if needed for defining available tools
}

interface AnthropicMessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: AnthropicContentBlock[]; // Content is an array of blocks
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Implements the `ProviderAdapter` interface for interacting with Anthropic's
 * Messages API (Claude models).
 *
 * Handles formatting requests and parsing responses for Anthropic.
 * Note: Streaming is **not yet implemented** for this adapter. Calls requesting streaming will yield an error and end.
 *
 * @implements {ProviderAdapter}
 */
export class AnthropicAdapter implements ProviderAdapter {
  readonly providerName = 'anthropic';
  private apiKey: string;
  private model: string;
  private apiVersion: string;
  private apiBaseUrl: string;

  // Default max tokens if not provided in options, as Anthropic requires it
  private defaultMaxTokens = 1024;

  /**
   * Creates an instance of the AnthropicAdapter.
   * @param options - Configuration options including the API key and optional model/apiVersion/baseURL overrides.
   * @throws {Error} If the API key is missing.
   */
  constructor(options: AnthropicAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('AnthropicAdapter requires an apiKey in options.');
    }
    this.apiKey = options.apiKey;
    // Common default model, user should override if needed
    this.model = options.model || 'claude-3-haiku-20240307';
    this.apiVersion = options.apiVersion || '2023-06-01';
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.anthropic.com/v1';
    Logger.debug(`AnthropicAdapter initialized with model: ${this.model}, version: ${this.apiVersion}`);
  }

  /**
   * Sends a request to the Anthropic Messages API.
   * Translates `ArtStandardPrompt` to the Anthropic format.
   *
   * **Note:** Streaming is **not yet implemented**.
   *
   * @param {ArtStandardPrompt} prompt - The standardized prompt messages.
   * @param {CallOptions} options - Call options, including `threadId`, `traceId`, `stream`, and any Anthropic-specific generation parameters.
   * @returns {Promise<AsyncIterable<StreamEvent>>} A promise resolving to an AsyncIterable of StreamEvent objects. If streaming is requested, it yields an error event and ends.
   * @throws {ARTError} If `max_tokens` is missing in options (required by Anthropic).
   */
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const { threadId, traceId = `anthropic-trace-${Date.now()}`, sessionId, stream, callContext, model: modelOverride } = options;
    const modelToUse = modelOverride || this.model;

    // --- Placeholder for Streaming ---
    // TODO: Implement streaming for Anthropic
    if (stream) {
        Logger.warn(`AnthropicAdapter: Streaming requested but not implemented. Returning error stream.`, { threadId, traceId });
        const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
            const err = new ARTError("Streaming is not yet implemented for the AnthropicAdapter.", ErrorCode.LLM_PROVIDER_ERROR);
            yield { type: 'ERROR', data: err, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
            yield { type: 'END', data: null, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
        };
        return errorGenerator();
    }

    // --- Non-Streaming Logic ---

    // Anthropic requires max_tokens
    const maxTokens = options.max_tokens || options.maxOutputTokens || options.max_tokens_to_sample || this.defaultMaxTokens;
    if (!maxTokens) {
        const err = new ARTError("Anthropic API requires 'max_tokens' or equivalent ('maxOutputTokens', 'max_tokens_to_sample') in call options.", ErrorCode.INVALID_CONFIG);
        const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
            yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
            yield { type: 'END', data: null, threadId, traceId, sessionId };
        };
        return errorGenerator();
    }

    // --- Translate Prompt ---
    let systemPrompt: string | undefined;
    let anthropicMessages: AnthropicMessage[];
    try {
      const translationResult = this.translateToAnthropic(prompt);
      systemPrompt = translationResult.systemPrompt;
      anthropicMessages = translationResult.messages;
    } catch (error: any) {
      Logger.error(`Error translating ArtStandardPrompt to Anthropic format: ${error.message}`, { error, threadId, traceId });
      const generator = async function*(): AsyncIterable<StreamEvent> {
          const err = error instanceof ARTError ? error : new ARTError(`Prompt translation failed: ${error.message}`, ErrorCode.PROMPT_TRANSLATION_FAILED, error);
          yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
          yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
      return generator();
    }
    // --- End Translate Prompt ---

    const apiUrl = `${this.apiBaseUrl}/messages`;

    const payload: AnthropicMessagesPayload = {
      model: modelToUse,
      messages: anthropicMessages,
      system: systemPrompt, // Use translated system prompt
      max_tokens: maxTokens,
      temperature: options.temperature,
      top_p: options.top_p || options.topP,
      top_k: options.top_k || options.topK,
      stop_sequences: options.stop || options.stop_sequences || options.stopSequences,
      stream: false, // Explicitly false
      // TODO: Add 'tools' parameter if needed
    };

    // Remove undefined keys, except for max_tokens which is required
    Object.keys(payload).forEach(key => {
         const K = key as keyof AnthropicMessagesPayload;
         if (K !== 'max_tokens' && payload[K] === undefined) {
             delete payload[K];
         }
     });
   
     Logger.debug(`Calling Anthropic API (non-streaming): ${apiUrl} with model ${this.model}`, { threadId, traceId });
     // Capture required instance properties to avoid aliasing `this`
     const apiKey = this.apiKey;
     const apiVersion = this.apiVersion;

     // Use an async generator function without aliasing `this`
     const generator = async function*(): AsyncIterable<StreamEvent> {
         try {
             const response = await fetch(apiUrl, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'x-api-key': apiKey,
                     'anthropic-version': apiVersion,
                 },
                 body: JSON.stringify(payload),
             });
   
             if (!response.ok) {
                 const errorBody = await response.text();
                 let errorMessage = errorBody;
                 try {
                     const parsedError = JSON.parse(errorBody);
                     if (parsedError?.error?.message) errorMessage = parsedError.error.message;
                 } catch (e) { /* Ignore */ }
                 const err = new ARTError(
                    `Anthropic API request failed: ${response.status} ${response.statusText} - ${errorMessage}`,
                    ErrorCode.LLM_PROVIDER_ERROR,
                    new Error(errorBody)
                 );
                 yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
                 yield { type: 'END', data: null, threadId, traceId, sessionId };
                 return; // Stop generator
             }

             const data = await response.json() as AnthropicMessagesResponse;
             // Extract text content, handling potential lack of text blocks
             const textContentBlocks = data.content?.filter(c => c.type === 'text') as { type: 'text', text: string }[] | undefined;
             const responseText = textContentBlocks?.map(c => c.text).join('\n') ?? ''; // Join multiple text blocks if present

             // Check for tool use requests in the response
             const toolUseBlocks = data.content?.filter(c => c.type === 'tool_use') as { type: 'tool_use', id: string, name: string, input: object }[] | undefined;
             if (toolUseBlocks && toolUseBlocks.length > 0) {
                 Logger.debug("Anthropic response included tool use requests", { toolUseBlocks, threadId, traceId });
                 // The agent (e.g., PESAgent) needs to handle these based on the raw response or structured output.
                 // The adapter primarily yields the text content.
             }

             // Check if response is valid (might have only tool_use, which is valid)
             if (data.stop_reason !== 'tool_use' && responseText === '' && (!toolUseBlocks || toolUseBlocks.length === 0)) {
                 // Only error if stop reason isn't tool_use and there's no text content
                 const err = new ARTError('Invalid response structure from Anthropic API: No text content found and stop reason is not tool_use.', ErrorCode.LLM_PROVIDER_ERROR, new Error(JSON.stringify(data)));
                 yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
                 yield { type: 'END', data: null, threadId, traceId, sessionId };
                 return; // Stop generator
             }

             Logger.debug(`Anthropic API call successful. Stop Reason: ${data.stop_reason}`, { threadId, traceId });

             // Yield TOKEN
             const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
             yield { type: 'TOKEN', data: responseText.trim(), threadId, traceId, sessionId, tokenType };

             // Yield METADATA
             const metadata: LLMMetadata = {
                 inputTokens: data.usage?.input_tokens,
                 outputTokens: data.usage?.output_tokens,
                 stopReason: data.stop_reason ?? undefined, // Convert null to undefined
                 providerRawUsage: { usage: data.usage, stop_reason: data.stop_reason, stop_sequence: data.stop_sequence },
                 traceId: traceId,
             };
             yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };

             // Yield END
             yield { type: 'END', data: null, threadId, traceId, sessionId };

         } catch (error: any) {
             Logger.error(`Error during Anthropic API call: ${error.message}`, { error, threadId, traceId });
             const artError = error instanceof ARTError ? error : new ARTError(error.message, ErrorCode.LLM_PROVIDER_ERROR, error);
             yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
             yield { type: 'END', data: null, threadId, traceId, sessionId }; // Ensure END is yielded on error
         }
     };

     return generator();
   }


  /**
   * Translates the provider-agnostic `ArtStandardPrompt` into the Anthropic Messages API format.
   *
   * @private
   * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
   * @returns {{ systemPrompt?: string; messages: AnthropicMessage[] }} The system prompt string and the `AnthropicMessage[]` array.
   * @throws {ARTError} If translation encounters an issue (ErrorCode.PROMPT_TRANSLATION_FAILED).
   */
  private translateToAnthropic(artPrompt: ArtStandardPrompt): { systemPrompt?: string; messages: AnthropicMessage[] } {
    let systemPrompt: string | undefined;
    const messages: AnthropicMessage[] = [];
    let currentRole: 'user' | 'assistant' | null = null;

    for (let i = 0; i < artPrompt.length; i++) {
      const message = artPrompt[i];

      // Extract system prompt (only the first one is used by Anthropic)
      if (message.role === 'system' && !systemPrompt) {
        if (typeof message.content !== 'string') {
          Logger.warn(`AnthropicAdapter: System message content is not a string. Stringifying.`, { content: message.content });
          systemPrompt = String(message.content);
        } else {
          systemPrompt = message.content;
        }
        continue; // Skip adding system message to the main messages array
      }
      if (message.role === 'system' && systemPrompt) {
          Logger.warn(`AnthropicAdapter: Multiple system messages found. Only the first one is used by Anthropic. Skipping subsequent ones.`);
          continue;
      }


      // --- Handle User Messages ---
      if (message.role === 'user') {
        if (currentRole === 'user') {
          // Merge consecutive user messages (Anthropic requires alternating roles)
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'user') {
             const existingContent = typeof lastMessage.content === 'string' ? [{ type: 'text', text: lastMessage.content }] : lastMessage.content as AnthropicContentBlock[];
             const newContent = typeof message.content === 'string' ? [{ type: 'text', text: message.content }] : this.mapArtContentToAnthropicBlocks(message.content, message.role);
             // Explicitly cast the merged array
             lastMessage.content = [...existingContent, ...newContent] as AnthropicContentBlock[];
             Logger.debug("AnthropicAdapter: Merged consecutive user messages.");
             continue;
          }
        }
        messages.push({
          role: 'user',
          content: typeof message.content === 'string' ? message.content : this.mapArtContentToAnthropicBlocks(message.content, message.role)
        });
        currentRole = 'user';
      }
      // --- Handle Assistant Messages ---
      else if (message.role === 'assistant') {
         if (currentRole === 'assistant') {
             // Merge consecutive assistant messages
             const lastMessage = messages[messages.length - 1];
             if (lastMessage && lastMessage.role === 'assistant') {
                 const existingContent = typeof lastMessage.content === 'string' ? [{ type: 'text', text: lastMessage.content }] : lastMessage.content as AnthropicContentBlock[];
                 const newContent = typeof message.content === 'string' ? [{ type: 'text', text: message.content }] : this.mapArtContentToAnthropicBlocks(message.content, message.role, message.tool_calls);
                 // Explicitly cast the merged array
                 lastMessage.content = [...existingContent, ...newContent] as AnthropicContentBlock[];
                 Logger.debug("AnthropicAdapter: Merged consecutive assistant messages.");
                 continue;
             }
         }
        messages.push({
          role: 'assistant',
          content: typeof message.content === 'string' ? message.content : this.mapArtContentToAnthropicBlocks(message.content, message.role, message.tool_calls)
        });
        currentRole = 'assistant';
      }
      // --- Handle Tool Result Messages (map to user role with tool_result content) ---
      else if (message.role === 'tool_result') {
          if (!message.tool_call_id) {
              throw new ARTError(`AnthropicAdapter: 'tool_result' message missing required 'tool_call_id'.`, ErrorCode.PROMPT_TRANSLATION_FAILED);
          }
          const toolResultBlock: AnthropicContentBlock = {
              type: 'tool_result',
              tool_use_id: message.tool_call_id,
              content: String(message.content), // Ensure content is string for basic case
              // TODO: Handle potential 'is_error' flag if added to ArtStandardMessage
          };

          // Tool results must follow an assistant message and be wrapped in a user message
          if (currentRole === 'user') {
              // If the last message was user, append tool result to it
              const lastMessage = messages[messages.length - 1];
              if (lastMessage && lastMessage.role === 'user') {
                  const existingContent = typeof lastMessage.content === 'string' ? [{ type: 'text', text: lastMessage.content }] : lastMessage.content as AnthropicContentBlock[];
                  // Explicitly cast the merged array
                  lastMessage.content = [...existingContent, toolResultBlock] as AnthropicContentBlock[];
              } else {
                   // Should not happen if logic is correct, but handle defensively
                   messages.push({ role: 'user', content: [toolResultBlock] });
                   currentRole = 'user';
              }
          } else {
              // If last message was assistant or null, start a new user message
              messages.push({ role: 'user', content: [toolResultBlock] });
              currentRole = 'user';
          }
      }
      // --- Handle Tool Request (Should not happen, throw error) ---
      else if (message.role === 'tool_request') {
           throw new ARTError(
              `AnthropicAdapter: Unexpected 'tool_request' role encountered during translation. These should be part of an 'assistant' message's tool_calls.`,
              ErrorCode.PROMPT_TRANSLATION_FAILED
            );
      }
       // --- Handle Unknown Role (Should not happen) ---
       else {
            throw new ARTError(
               `AnthropicAdapter: Unknown message role '${(message as any).role}' encountered during translation.`,
               ErrorCode.PROMPT_TRANSLATION_FAILED
             );
       }
    }

    // Final validation: Must end with a user message if the last standard message was assistant requesting tools
    const lastStandardMessage = artPrompt[artPrompt.length - 1];
    const lastTranslatedMessage = messages[messages.length - 1];
    if (lastStandardMessage?.role === 'assistant' && lastStandardMessage.tool_calls && lastTranslatedMessage?.role !== 'user') {
        // This indicates tool results were expected but not provided or translated correctly.
        // However, the API call might still be valid if the LLM is expected to respond without results yet.
        // Let's just log a debug message for now.
        Logger.debug("AnthropicAdapter: Prompt ends with assistant tool calls, but last translated message is not 'user'. This might be expected if waiting for tool execution.");
    }
     // Anthropic requires the first message to be 'user' if no system prompt is present
     if (!systemPrompt && messages.length > 0 && messages[0].role !== 'user') {
         throw new ARTError(
             `AnthropicAdapter: First message must be 'user' if no system prompt is provided.`,
             ErrorCode.PROMPT_TRANSLATION_FAILED
         );
     }


    return { systemPrompt, messages };
  }

  /**
   * Helper to map ArtStandardMessage content/tool_calls to Anthropic Content Blocks.
   * @private
   */
  private mapArtContentToAnthropicBlocks(
      content: string | object | null,
      role: 'user' | 'assistant',
      tool_calls?: ArtStandardMessage['tool_calls']
  ): AnthropicContentBlock[] {
      const blocks: AnthropicContentBlock[] = [];

      // Add text content if present
      if (typeof content === 'string' && content.trim() !== '') {
          blocks.push({ type: 'text', text: content });
      } else if (content !== null && typeof content !== 'string') {
          // If content is an object, stringify it as text for now
          // TODO: Handle complex content types like images if needed later
          Logger.warn(`AnthropicAdapter: Non-string, non-null content found for ${role} message. Stringifying.`, { content });
          blocks.push({ type: 'text', text: JSON.stringify(content) });
      }

      // Add tool calls for assistant messages
      if (role === 'assistant' && tool_calls && tool_calls.length > 0) {
          tool_calls.forEach(tc => {
              if (tc.type !== 'function') {
                  Logger.warn(`AnthropicAdapter: Skipping non-function tool call type: ${tc.type}`);
                  return;
              }
              try {
                  blocks.push({
                      type: 'tool_use',
                      id: tc.id,
                      name: tc.function.name,
                      input: JSON.parse(tc.function.arguments || '{}'), // Arguments must be parsed back to object for Anthropic
                  });
              } catch (e) {
                   throw new ARTError(
                      `AnthropicAdapter: Failed to parse tool call arguments for tool ${tc.function.name} (ID: ${tc.id}). Arguments must be valid JSON. Error: ${(e as Error).message}`,
                      ErrorCode.PROMPT_TRANSLATION_FAILED,
                      e as Error
                  );
              }
          });
      }

      // If no blocks were added (e.g., assistant message with null content and no tool calls),
      // Anthropic might still require a content array, potentially empty or with an empty text block.
      // Let's return an empty array for now, assuming the API handles it. If not, adjust here.
      // if (blocks.length === 0 && role === 'assistant') {
      //     blocks.push({ type: 'text', text: '' }); // Or return [] ? Test API behavior.
      // }

      return blocks;
  }

}