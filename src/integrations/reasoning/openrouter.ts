// src/adapters/reasoning/openrouter.ts
import { ProviderAdapter } from '@/core/interfaces';
import {
  ArtStandardPrompt, // Use the new standard type
  ArtStandardMessage, // Keep for translation function type hint
  CallOptions,
  StreamEvent,
  LLMMetadata,
} from '@/types';
import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors'; // Import ARTError and ErrorCode

// TODO: Implement streaming support for OpenRouter.
// TODO: Implement support for 'tools' and 'tool_choice'.

/**
 * Configuration options required for the `OpenRouterAdapter`.
 */
export interface OpenRouterAdapterOptions {
  /** Your OpenRouter API key. Handle securely. */
  apiKey: string;
  /** The required OpenRouter model identifier string (e.g., 'google/gemini-pro', 'anthropic/claude-3-haiku', 'openai/gpt-4o'). This specifies which underlying model OpenRouter should use. */
  model: string;
  /** Optional: Override the base URL for the OpenRouter API. Defaults to 'https://openrouter.ai/api/v1'. */
  apiBaseUrl?: string;
  /** Optional: Your application's site URL, sent as the 'HTTP-Referer' header (recommended by OpenRouter). */
  siteUrl?: string;
  /** Optional: Your application's name, sent as the 'X-Title' header (recommended by OpenRouter). */
  appName?: string;
}

// Use OpenAI-compatible structures, assuming OpenRouter adheres closely
// Based on https://openrouter.ai/docs#api-reference-chat-completions
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // Stringified JSON
  };
}

interface OpenAIChatCompletionPayload {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean; // OpenRouter supports streaming
  // TODO: Add support for 'tools' and 'tool_choice' if needed later
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string; // The specific model used by OpenRouter
  choices: {
    index: number;
    message: OpenAIMessage; // Use the defined OpenAIMessage type
    finish_reason: string; // e.g., 'stop', 'length', 'tool_calls'
  }[];
  usage?: { // Usage might be optional or structured differently
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    // OpenRouter might add cost info here
  };
}

/**
 * Implements the `ProviderAdapter` interface for interacting with the OpenRouter API,
 * which provides access to various LLMs through an OpenAI-compatible interface.
 *
 * Handles formatting requests and parsing responses for OpenRouter's chat completions endpoint.
 * Handles formatting requests and parsing responses for OpenRouter's chat completions endpoint.
 * Note: Streaming is **not yet implemented** for this adapter. Calls requesting streaming will yield an error and end.
 *
 * @implements {ProviderAdapter}
 */
export class OpenRouterAdapter implements ProviderAdapter {
  readonly providerName = 'openrouter';
  private apiKey: string;
  private model: string;
  private apiBaseUrl: string;
  private siteUrl?: string;
  private appName?: string;

  /**
   * Creates an instance of the OpenRouterAdapter.
   * @param {OpenRouterAdapterOptions} options - Configuration options including the API key, the specific OpenRouter model identifier, and optional headers/baseURL.
   * @throws {Error} If the API key or model identifier is missing.
   * @see https://openrouter.ai/docs
   */
  constructor(options: OpenRouterAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('OpenRouterAdapter requires an apiKey in options.');
    }
    if (!options.model) {
      throw new Error('OpenRouterAdapter requires a model identifier in options (e.g., \'google/gemini-pro\').');
    }
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.apiBaseUrl = options.apiBaseUrl || 'https://openrouter.ai/api/v1';
    this.siteUrl = options.siteUrl;
    this.appName = options.appName;
    Logger.debug(`OpenRouterAdapter initialized for model: ${this.model}`);
  }

  /**
   * Sends a request to the OpenRouter Chat Completions API endpoint.
   * Translates `ArtStandardPrompt` to the OpenAI-compatible format.
   *
   * **Note:** Streaming is **not yet implemented**.
   *
   * @param {ArtStandardPrompt} prompt - The standardized prompt messages.
   * @param {CallOptions} options - Call options, including `threadId`, `traceId`, `stream`, and any OpenAI-compatible generation parameters.
   * @returns {Promise<AsyncIterable<StreamEvent>>} A promise resolving to an AsyncIterable of StreamEvent objects. If streaming is requested, it yields an error event and ends.
   * @see https://openrouter.ai/docs#api-reference-chat-completions
   */
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const { threadId, traceId = `openrouter-trace-${Date.now()}`, sessionId, stream, callContext, model: modelOverride } = options;
    const modelToUse = modelOverride || this.model; // Allow overriding model per call

    // --- Placeholder for Streaming ---
    // TODO: Implement streaming for OpenRouter
    if (stream) {
        Logger.warn(`OpenRouterAdapter: Streaming requested but not implemented. Returning error stream.`, { threadId, traceId });
        const errorGenerator = async function*(): AsyncIterable<StreamEvent> {
            const err = new ARTError("Streaming is not yet implemented for the OpenRouterAdapter.", ErrorCode.LLM_PROVIDER_ERROR); // Use LLM_PROVIDER_ERROR
            yield { type: 'ERROR', data: err, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
            yield { type: 'END', data: null, threadId: threadId ?? '', traceId: traceId ?? '', sessionId };
        };
        return errorGenerator();
    }

    // --- Non-Streaming Logic ---

    // --- Translate Prompt ---
    let openAiMessages: OpenAIMessage[];
    try {
      // Reuse the same translation logic as OpenAI adapter
      openAiMessages = this.translateToOpenAI(prompt);
    } catch (error: any) {
      Logger.error(`Error translating ArtStandardPrompt to OpenRouter/OpenAI format: ${error.message}`, { error, threadId, traceId });
      const generator = async function*(): AsyncIterable<StreamEvent> {
          const err = error instanceof ARTError ? error : new ARTError(`Prompt translation failed: ${error.message}`, ErrorCode.PROMPT_TRANSLATION_FAILED, error);
          yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
          yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
      return generator();
    }
    // --- End Translate Prompt ---

    const apiUrl = `${this.apiBaseUrl}/chat/completions`;
    const stopSequences = options.stop || options.stop_sequences || options.stopSequences;

    const payload: OpenAIChatCompletionPayload = {
      model: modelToUse,
      messages: openAiMessages,
      temperature: options.temperature,
      max_tokens: options.max_tokens || options.maxOutputTokens,
      top_p: options.top_p || options.topP,
      // top_k: options.top_k || options.topK, // Less common, include if needed
      stop: stopSequences,
      stream: false, // Explicitly false for non-streaming
      // TODO: Add tools/tool_choice if needed
    };

    Object.keys(payload).forEach(key => payload[key as keyof OpenAIChatCompletionPayload] === undefined && delete payload[key as keyof OpenAIChatCompletionPayload]);

    const headers: Record<string, string> = {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${this.apiKey}`,
     };
     if (this.siteUrl) headers['HTTP-Referer'] = this.siteUrl;
     if (this.appName) headers['X-Title'] = this.appName;
   
     Logger.debug(`Calling OpenRouter API (non-streaming): ${apiUrl} with model ${this.model}`, { threadId, traceId });
   
     // Use an async generator for non-streaming case too
     // const adapter = this; // Removed unused alias
     const generator = async function*(): AsyncIterable<StreamEvent> {
         try {
             const response = await fetch(apiUrl, {
                 method: 'POST',
                 headers: headers,
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
                    `OpenRouter API request failed: ${response.status} ${response.statusText} - ${errorMessage}`,
                    ErrorCode.LLM_PROVIDER_ERROR,
                    new Error(errorBody) // Pass underlying error context
                 );
                 yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
                 yield { type: 'END', data: null, threadId, traceId, sessionId };
                 return; // Stop the generator on error
             }

             const data = await response.json() as OpenAIChatCompletionResponse;
             const firstChoice = data.choices?.[0];

             if (!firstChoice?.message) {
                 const err = new ARTError('Invalid response structure from OpenRouter API: No message found.', ErrorCode.LLM_PROVIDER_ERROR, new Error(JSON.stringify(data)));
                 yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
                 yield { type: 'END', data: null, threadId, traceId, sessionId };
                 return; // Stop the generator
             }

             const responseMessage = firstChoice.message;
             // TODO: Handle tool_calls in non-streaming response if needed by agent logic
             if (responseMessage.tool_calls) {
                 Logger.debug("OpenRouter response included tool calls (non-streaming)", { toolCalls: responseMessage.tool_calls, threadId, traceId });
             }
             Logger.debug(`OpenRouter API call successful. Finish reason: ${firstChoice.finish_reason}`, { threadId, traceId });

             // Yield TOKEN
             const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
             const responseContent = responseMessage.content ?? '';
             yield { type: 'TOKEN', data: responseContent.trim(), threadId, traceId, sessionId, tokenType };

             // Yield METADATA
             const metadata: LLMMetadata = {
                 inputTokens: data.usage?.prompt_tokens,
                 outputTokens: data.usage?.completion_tokens,
                 stopReason: firstChoice.finish_reason,
                 providerRawUsage: { usage: data.usage, finish_reason: firstChoice.finish_reason },
                 traceId: traceId,
             };
             yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };

             // Yield END
             yield { type: 'END', data: null, threadId, traceId, sessionId };

         } catch (error: any) {
             Logger.error(`Error during OpenRouter API call: ${error.message}`, { error, threadId, traceId });
             const artError = error instanceof ARTError ? error : new ARTError(error.message, ErrorCode.LLM_PROVIDER_ERROR, error);
             yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
             yield { type: 'END', data: null, threadId, traceId, sessionId };
         }
     }; // No need for .bind(this) with arrow functions or if 'this' isn't used inside

     return generator();
   }

   /**
    * Translates the provider-agnostic `ArtStandardPrompt` into the OpenAI API's `OpenAIMessage[]` format.
    * (Copied from OpenAIAdapter - assumes OpenRouter compatibility)
    *
    * @private
    * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
    * @returns {OpenAIMessage[]} The `OpenAIMessage[]` array formatted for the OpenAI API.
    * @throws {ARTError} If translation encounters an issue (ErrorCode.PROMPT_TRANSLATION_FAILED).
    */
   private translateToOpenAI(artPrompt: ArtStandardPrompt): OpenAIMessage[] {
     // Identical implementation to OpenAIAdapter's translateToOpenAI
     return artPrompt.map((message: ArtStandardMessage): OpenAIMessage => {
       switch (message.role) {
         case 'system': {
           if (typeof message.content !== 'string') {
             Logger.warn(`OpenRouterAdapter: System message content is not a string. Stringifying.`, { content: message.content });
             return { role: 'system', content: String(message.content) };
           }
           return { role: 'system', content: message.content };
         }
         case 'user': {
           if (typeof message.content !== 'string') {
             Logger.warn(`OpenRouterAdapter: User message content is not a string. Stringifying.`, { content: message.content });
             return { role: 'user', content: String(message.content) };
           }
           return { role: 'user', content: message.content };
         }
         case 'assistant': {
           const assistantMsg: OpenAIMessage = {
             role: 'assistant',
             content: typeof message.content === 'string' ? message.content : null,
           };
           if (message.tool_calls && message.tool_calls.length > 0) {
             assistantMsg.tool_calls = message.tool_calls.map(tc => {
                 if (tc.type !== 'function' || !tc.function?.name || typeof tc.function?.arguments !== 'string') {
                      throw new ARTError(
                         `OpenRouterAdapter: Invalid tool_call structure in assistant message. ID: ${tc.id}`,
                         ErrorCode.PROMPT_TRANSLATION_FAILED
                     );
                 }
                 return {
                     id: tc.id,
                     type: tc.type,
                     function: {
                         name: tc.function.name,
                         arguments: tc.function.arguments,
                     }
                 };
             });
           }
           if (assistantMsg.content === '' && !assistantMsg.tool_calls) {
               assistantMsg.content = null;
           }
           if (assistantMsg.content === '' && assistantMsg.tool_calls) {
               assistantMsg.content = null;
           }
           if (typeof assistantMsg.content !== 'string' && assistantMsg.content !== null) {
               assistantMsg.content = null;
           }
           return assistantMsg;
         }
         case 'tool_result': {
           if (!message.tool_call_id) {
             throw new ARTError(
               `OpenRouterAdapter: 'tool_result' message missing required 'tool_call_id'.`,
               ErrorCode.PROMPT_TRANSLATION_FAILED
             );
           }
           if (typeof message.content !== 'string') {
              Logger.warn(`OpenRouterAdapter: Tool result content is not a string. Stringifying.`, { content: message.content });
           }
           return {
             role: 'tool',
             tool_call_id: message.tool_call_id,
             content: String(message.content),
           };
         }
         case 'tool_request': {
            throw new ARTError(
               `OpenRouterAdapter: Unexpected 'tool_request' role encountered during translation.`,
               ErrorCode.PROMPT_TRANSLATION_FAILED
             );
         }
         default: {
            throw new ARTError(
               `OpenRouterAdapter: Unknown message role '${message.role}' encountered during translation.`,
               ErrorCode.PROMPT_TRANSLATION_FAILED
             );
         }
       }
     });
   }
 }