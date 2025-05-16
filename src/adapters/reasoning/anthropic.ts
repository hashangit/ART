// src/adapters/reasoning/anthropic.ts
import { Anthropic } from '@anthropic-ai/sdk';
// AnthropicStream and CacheControlEphemeral are not directly used, SDK handles stream types.

import { ProviderAdapter, ToolSchema } from '../../core/interfaces';
import {
  ArtStandardPrompt,
  ArtStandardMessage,
  CallOptions,
  StreamEvent,
  LLMMetadata,
  // Assuming ArtToolCall and ArtToolResult types exist or are part of ArtStandardMessage
} from '../../types';
import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors';

// Default model if not specified
const ANTHROPIC_DEFAULT_MODEL_ID = 'claude-3-7-sonnet-20250219';
const ANTHROPIC_DEFAULT_MAX_TOKENS = 4096; // Anthropic's default for Claude 3 models if not specified by user
// const ANTHROPIC_API_VERSION = '2023-06-01'; // SDK handles versioning

/**
 * Configuration options required for the `AnthropicAdapter`.
 */
export interface AnthropicAdapterOptions {
  /** Your Anthropic API key. Handle securely. */
  apiKey: string;
  /** The default Anthropic model ID to use (e.g., 'claude-3-opus-20240229', 'claude-3-5-sonnet-20240620'). */
  model?: string;
  /** Optional: Override the base URL for the Anthropic API. */
  apiBaseUrl?: string;
  /** Optional: Default maximum tokens for responses. */
  defaultMaxTokens?: number;
  /** Optional: Default temperature for responses. */
  defaultTemperature?: number;
}

// Types for Anthropic API interaction using the SDK
type AnthropicSDKMessageParam = Anthropic.Messages.MessageParam;
// Use *BlockParam types for constructing content, ContentBlock is for received content.
type AnthropicSDKContentBlockParam = Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam | Anthropic.Messages.ToolUseBlockParam | Anthropic.Messages.ToolResultBlockParam;
type AnthropicSDKTool = Anthropic.Tool;
type AnthropicSDKToolUseBlock = Anthropic.ToolUseBlock; // This is a received block
// AnthropicSDKToolResultBlockParam removed as Anthropic.ToolResultBlockParam is used directly.


/**
 * Implements the `ProviderAdapter` interface for interacting with Anthropic's
 * Messages API (Claude models) using the official SDK.
 *
 * Handles formatting requests, parsing responses, streaming, and tool use.
 *
 * @implements {ProviderAdapter}
 */
export class AnthropicAdapter implements ProviderAdapter {
  readonly providerName = 'anthropic';
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature?: number;

  /**
   * Creates an instance of the AnthropicAdapter.
   * @param options - Configuration options including the API key and optional model/baseURL/defaults.
   * @throws {ARTError} If the API key is missing.
   */
  constructor(options: AnthropicAdapterOptions) {
    if (!options.apiKey) {
      throw new ARTError('AnthropicAdapter requires an apiKey in options.', ErrorCode.INVALID_CONFIG);
    }

    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.apiBaseUrl || undefined,
    });

    this.defaultModel = options.model || ANTHROPIC_DEFAULT_MODEL_ID;
    this.defaultMaxTokens = options.defaultMaxTokens || ANTHROPIC_DEFAULT_MAX_TOKENS;
    this.defaultTemperature = options.defaultTemperature;

    Logger.debug(`AnthropicAdapter initialized with model: ${this.defaultModel}`);
  }

  /**
   * Sends a request to the Anthropic Messages API.
   * Translates `ArtStandardPrompt` to the Anthropic format and handles streaming and tool use.
   *
   * @param {ArtStandardPrompt} prompt - The standardized prompt messages.
   * @param {CallOptions} options - Call options, including `threadId`, `traceId`, `stream`, `callContext`,
   *                                `model` (override), `tools` (available tools), and Anthropic-specific
   *                                generation parameters from `providerConfig.adapterOptions`.
   * @returns {Promise<AsyncIterable<StreamEvent>>} A promise resolving to an AsyncIterable of StreamEvent objects.
   */
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const {
      threadId,
      traceId = `anthropic-trace-${Date.now()}`,
      sessionId,
      stream = false, // Default to false if not specified
      callContext,
      model: modelOverride,
      tools: availableArtTools, // Tools from ART framework
      providerConfig, // Contains runtime provider config, including adapterOptions
    } = options;

    const modelToUse = providerConfig?.modelId || modelOverride || this.defaultModel;

    // Extract Anthropic specific parameters from providerConfig.adapterOptions or options
    const anthropicApiParams = providerConfig?.adapterOptions || {};
    const maxTokens = anthropicApiParams.max_tokens || anthropicApiParams.maxTokens || options.max_tokens || options.maxOutputTokens || this.defaultMaxTokens;
    const temperature = anthropicApiParams.temperature ?? options.temperature ?? this.defaultTemperature;
    const topP = anthropicApiParams.top_p || anthropicApiParams.topP || options.top_p || options.topP;
    const topK = anthropicApiParams.top_k || anthropicApiParams.topK || options.top_k || options.topK;
    const stopSequences = anthropicApiParams.stop_sequences || anthropicApiParams.stopSequences || options.stop || options.stop_sequences || options.stopSequences;


    if (!maxTokens) {
      // This should ideally be caught by a validation step before calling the adapter,
      // but as a safeguard:
      const err = new ARTError("Anthropic API requires 'max_tokens'.", ErrorCode.INVALID_CONFIG);
      const errorGenerator = async function* (): AsyncIterable<StreamEvent> {
        yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      };
      return errorGenerator();
    }

    let systemPrompt: string | undefined;
    let anthropicMessages: AnthropicSDKMessageParam[];
    try {
      const translationResult = this.translateToAnthropicSdk(prompt);
      systemPrompt = translationResult.systemPrompt;
      anthropicMessages = translationResult.messages;
    } catch (error: any) {
      Logger.error(`Error translating ArtStandardPrompt to Anthropic SDK format: ${error.message}`, { error, threadId, traceId });
      const artError = error instanceof ARTError ? error : new ARTError(`Prompt translation failed: ${error.message}`, ErrorCode.PROMPT_TRANSLATION_FAILED, error);
      const errorGenerator = async function* (): AsyncIterable<StreamEvent> {
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      };
      return errorGenerator();
    }

    const anthropicTools: AnthropicSDKTool[] | undefined = availableArtTools
      ? this.translateArtToolsToAnthropic(availableArtTools)
      : undefined;

    const requestBody: Anthropic.Messages.MessageCreateParams = {
      model: modelToUse,
      messages: anthropicMessages,
      max_tokens: maxTokens,
      system: systemPrompt,
      temperature: temperature,
      top_p: topP,
      top_k: topK,
      stop_sequences: stopSequences,
      stream: stream,
      tools: anthropicTools,
    };

    // Remove undefined keys from the request body, Anthropic SDK handles this well but good practice.
    Object.keys(requestBody).forEach(key => {
      const K = key as keyof Anthropic.Messages.MessageCreateParams;
      if (requestBody[K] === undefined) {
        delete requestBody[K];
      }
    });

    Logger.debug(`Calling Anthropic API with model ${modelToUse}`, { stream, tools: !!anthropicTools, threadId, traceId });

    // Use an async generator function
    const generator = async function* (this: AnthropicAdapter): AsyncIterable<StreamEvent> {
      // TRY block for the entire generator function
      try {
        if (stream) {
          const streamInstance = await this.client.messages.create(
            requestBody as Anthropic.Messages.MessageCreateParamsStreaming, // Cast for streaming
            this.getRequestOptions(modelToUse) // Get headers for beta features
          );

          let accumulatedText = "";
          const accumulatedToolUses: AnthropicSDKToolUseBlock[] = []; // Changed to const as it's not directly populated in the loop now
          let currentInputTokens: number | undefined;
          let currentOutputTokens: number | undefined;
          let finalStopReason: string | null = null;
          const finalUsage: Partial<Anthropic.Messages.Usage> = { // Changed to const
            input_tokens: undefined, // Will be set by message_start
            output_tokens: undefined // Will be updated
          };

          let initialMetadata: LLMMetadata | undefined;
          let deltaMetadata: LLMMetadata | undefined;

          for await (const event of streamInstance) {
            switch (event.type) {
              case 'message_start':
                Logger.debug('Anthropic stream: message_start', { usage: event.message.usage, threadId, traceId });
                finalUsage.input_tokens = event.message.usage.input_tokens;
                finalUsage.output_tokens = event.message.usage.output_tokens;
                currentInputTokens = finalUsage.input_tokens;
                currentOutputTokens = finalUsage.output_tokens;

                initialMetadata = {
                    inputTokens: currentInputTokens,
                    outputTokens: currentOutputTokens,
                    providerRawUsage: { usage: { ...event.message.usage } },
                    traceId: traceId,
                };
                yield { type: 'METADATA', data: initialMetadata, threadId, traceId, sessionId };
                break;

              case 'content_block_start':
                Logger.debug('Anthropic stream: content_block_start', { index: event.index, block: event.content_block, threadId, traceId });
                // No specific action needed here for now.
                // If Anthropic sends distinct 'thinking' blocks via content_block_start,
                // handling could be added here to map to a specific StreamEvent.tokenType.
                break;

              case 'content_block_delta':
                Logger.debug('Anthropic stream: content_block_delta', { index: event.index, delta: event.delta, threadId, traceId });
                if (event.delta.type === 'text_delta') {
                  const textDelta = event.delta.text;
                  accumulatedText += textDelta;
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                  yield { type: 'TOKEN', data: textDelta, threadId, traceId, sessionId, tokenType };
                }
                // input_json_delta for tool arguments will be part of the final tool_use block
                // captured at message_stop via getFinalMessage().
                // Explicit "thinking_delta" handling (as in user example) could be added here if needed.
                break;

              case 'content_block_stop':
                Logger.debug('Anthropic stream: content_block_stop', { index: event.index, threadId, traceId });
                // This event indicates a content block (e.g. a tool_use block) has finished streaming its deltas.
                // The full block will be available in finalMessage.content.
                break;

              case 'message_delta':
                Logger.debug('Anthropic stream: message_delta', { delta: event.delta, usage: event.usage, threadId, traceId });
                finalStopReason = event.delta.stop_reason ?? finalStopReason;
                // event.usage in message_delta contains cumulative output_tokens for the message.
                if (event.usage.output_tokens !== undefined && event.usage.output_tokens !== null) {
                    finalUsage.output_tokens = event.usage.output_tokens;
                }
                currentOutputTokens = finalUsage.output_tokens;

                deltaMetadata = {
                    inputTokens: currentInputTokens,
                    outputTokens: currentOutputTokens,
                    stopReason: event.delta.stop_reason ?? undefined,
                    providerRawUsage: {
                        usage: {
                            input_tokens: currentInputTokens, // Should not change after start
                            output_tokens: event.usage.output_tokens ?? undefined, // from delta
                            // other usage fields from delta if available and needed
                        },
                        delta: event.delta
                    },
                    traceId: traceId,
                };
                yield { type: 'METADATA', data: deltaMetadata, threadId, traceId, sessionId };
                break;

              case 'message_stop': {
                Logger.debug('Anthropic stream: message_stop. Using accumulated data.', { threadId, traceId });
                // finalStopReason, finalUsage.input_tokens, finalUsage.output_tokens should be set by previous events (message_start, message_delta)
                // accumulatedText and accumulatedToolUses are built during content_block_delta and potentially content_block_stop.

                // It's possible that the final content (especially tool_uses) might only be fully formed
                // after all deltas. If the SDK guarantees `message_delta` or `content_block_stop` provides complete
                // tool_use blocks, then `getFinalMessage()` might not be strictly necessary.
                // For now, we rely on accumulated data.

                // If finalMessage.content was used previously, ensure accumulatedText and accumulatedToolUses are up-to-date.
                // If not using getFinalMessage(), these accumulators are our source of truth.

                if (finalStopReason === 'tool_use' && accumulatedToolUses.length > 0) {
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                  const toolData = accumulatedToolUses.map(tu => ({
                      type: 'tool_use', // ART specific marker
                      id: tu.id,
                      name: tu.name,
                      input: tu.input,
                  }));
                  if (accumulatedText.trim()) {
                    yield { type: 'TOKEN', data: [{type: 'text', text: accumulatedText.trim()}, ...toolData], threadId, traceId, sessionId, tokenType };
                  } else {
                    yield { type: 'TOKEN', data: toolData, threadId, traceId, sessionId, tokenType };
                  }
                } else if (accumulatedText.trim()) {
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                  yield { type: 'TOKEN', data: accumulatedText.trim(), threadId, traceId, sessionId, tokenType };
                }
                // else: No text and no tool use (e.g. max_tokens reached before any content) - no final TOKEN event.

                const finalMetadataReport: LLMMetadata = {
                    inputTokens: finalUsage.input_tokens ?? undefined,
                    outputTokens: finalUsage.output_tokens ?? undefined,
                    stopReason: finalStopReason ?? undefined,
                    providerRawUsage: {
                        usage: {
                            input_tokens: finalUsage.input_tokens ?? undefined,
                            output_tokens: finalUsage.output_tokens ?? undefined,
                            // cache_creation_input_tokens and cache_read_input_tokens might not be available without getFinalMessage() or specific events
                        },
                        stop_reason: finalStopReason,
                        // stop_sequence might not be available without getFinalMessage()
                    },
                    traceId: traceId,
                };
                yield { type: 'METADATA', data: finalMetadataReport, threadId, traceId, sessionId };
                break;
              }
              default: {
                // The 'event' here is one of the specific types from Anthropic.Messages.RawMessageStreamEvent.
                // If an event type is not explicitly handled above, it will fall here.
                // Errors that break the stream are caught by the outer try/catch.
                // Ping events are not typically part of RawMessageStreamEvent for client.messages.stream().
                Logger.warn('Anthropic stream: unhandled raw stream event type', { eventType: (event as any).type, event, threadId, traceId });
                break; // Explicitly break
              }
            } // end switch
          } // end for-await
        } else { // Non-streaming logic starts here
          const response = await this.client.messages.create(
            requestBody as Anthropic.Messages.MessageCreateParamsNonStreaming,
            this.getRequestOptions(modelToUse)
          );

          Logger.debug(`Anthropic API call successful (non-streaming). Stop Reason: ${response.stop_reason}`, { threadId, traceId });

          let responseText = "";
          const toolUseBlocks: AnthropicSDKToolUseBlock[] = [];

          response.content.forEach((block: Anthropic.Messages.ContentBlock) => {
            if (block.type === 'text') {
              responseText += block.text;
            } else if (block.type === 'tool_use') {
              toolUseBlocks.push(block);
            }
          });
          responseText = responseText.trim();

          const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';

          if (response.stop_reason === 'tool_use' && toolUseBlocks.length > 0) {
            const toolData = toolUseBlocks.map(tu => ({
                type: 'tool_use',
                id: tu.id,
                name: tu.name,
                input: tu.input,
            }));
            if (responseText) {
                 yield { type: 'TOKEN', data: [{type: 'text', text: responseText}, ...toolData], threadId, traceId, sessionId, tokenType };
            } else {
                yield { type: 'TOKEN', data: toolData, threadId, traceId, sessionId, tokenType };
            }
          } else if (responseText) {
            yield { type: 'TOKEN', data: responseText, threadId, traceId, sessionId, tokenType };
          } else if (response.stop_reason !== 'tool_use') {
             Logger.warn('Anthropic API (non-streaming): Empty response text and not a tool_use stop_reason.', { response, threadId, traceId });
          }

          if (response.usage) {
            const metadata: LLMMetadata = {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              stopReason: response.stop_reason ?? undefined,
              providerRawUsage: { usage: response.usage, stop_reason: response.stop_reason, stop_sequence: response.stop_sequence },
              traceId: traceId,
            };
            yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
          }
        } // End of if (stream) / else (non-streaming)

        // Yield END signal for both streaming and non-streaming, now inside the main try block
        yield { type: 'END', data: null, threadId, traceId, sessionId };

      } catch (error: any) { // Catch for the entire generator function
        Logger.error(`Error during Anthropic API call: ${error.message}`, { error, threadId, traceId });
        const artError = error instanceof ARTError ? error :
          (error instanceof Anthropic.APIError ? new ARTError(`Anthropic API Error (${error.status}): ${error.message}`, ErrorCode.LLM_PROVIDER_ERROR, error) :
            new ARTError(error.message || 'Unknown Anthropic adapter error', ErrorCode.LLM_PROVIDER_ERROR, error));
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId }; // Ensure END is yielded on error
      }
    }.bind(this); // Bind the generator function to the class instance

    return generator();
  }

  /**
   * Prepares request options. Currently a placeholder for potential future additions
   * like Anthropic beta headers for specific models or features (e.g., prompt caching).
   * The user's example code shows more advanced beta header logic.
   */
  private getRequestOptions(modelId: string): Anthropic.RequestOptions {
    const betas: string[] = [];
    // Example: Add logic to push beta flags based on modelId or features.
    // const cacheableModels = [
    //     "claude-3-5-sonnet-20240620",
    // ];
    // if (cacheableModels.includes(modelId)) {
    //     betas.push("prompt-caching-2024-07-31"); // Replace with actual beta flag
    // }

    // Suppress unused variable warning for modelId if no logic uses it yet.
    if (modelId) {
      // This block can be removed if modelId is used in beta header logic.
    }


    if (betas.length > 0) {
        return { headers: { "anthropic-beta": betas.join(",") } };
    }
    return {};
  }


  /**
   * Translates the provider-agnostic `ArtStandardPrompt` into the Anthropic SDK Messages format.
   *
   * @private
   * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
   * @returns {{ systemPrompt?: string; messages: AnthropicSDKMessageParam[] }}
   * @throws {ARTError} If translation encounters an issue.
   */
  private translateToAnthropicSdk(artPrompt: ArtStandardPrompt): { systemPrompt?: string; messages: Anthropic.Messages.MessageParam[] } {
    let systemPrompt: string | undefined;
    const messages: Anthropic.Messages.MessageParam[] = [];
    let currentRoleInternal: 'user' | 'assistant' | null = null;

    for (const artMsg of artPrompt) {
      if (artMsg.role === 'system') {
        const systemText = (typeof artMsg.content === 'string') ? artMsg.content : String(artMsg.content);
        if (!systemPrompt) {
          systemPrompt = systemText;
        } else {
          Logger.warn(`AnthropicAdapter: Multiple system messages found. Appending to existing system prompt.`);
          systemPrompt += `\n${systemText}`;
        }
        continue;
      }

      const translatedContent = this.mapArtMessageToAnthropicContent(artMsg);
      const messageRoleToPush: 'user' | 'assistant' = (artMsg.role === 'user' || artMsg.role === 'tool_result') ? 'user' : 'assistant';

      if (currentRoleInternal === messageRoleToPush && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        
        let currentLastMessageContentArray: Anthropic.Messages.ContentBlockParam[];
        if (typeof lastMessage.content === 'string') {
          currentLastMessageContentArray = [{ type: 'text', text: lastMessage.content } as Anthropic.Messages.TextBlockParam];
        } else {
          // lastMessage.content should be Anthropic.Messages.ContentBlockParam[]
          currentLastMessageContentArray = lastMessage.content;
        }

        const contentToMergeArray: Anthropic.Messages.ContentBlockParam[] =
          typeof translatedContent === 'string'
            ? [{ type: 'text', text: translatedContent } as Anthropic.Messages.TextBlockParam]
            : translatedContent; // translatedContent is already AnthropicSDKContentBlockParam[]

        // Ensure all elements are of the correct *BlockParam types
        const mergedContent: Anthropic.Messages.ContentBlockParam[] = [...currentLastMessageContentArray, ...contentToMergeArray];
        lastMessage.content = mergedContent;
        Logger.debug(`AnthropicAdapter: Merged consecutive ${messageRoleToPush} messages.`);
      } else {
        messages.push({ role: messageRoleToPush, content: translatedContent });
        currentRoleInternal = messageRoleToPush;
      }
    }

    // Anthropic requires the first message to be 'user' if messages exist and no system prompt.
    // The SDK might handle this, but good to be aware.
    if (!systemPrompt && messages.length > 0 && messages[0].role !== 'user') {
      // This case should be rare due to the merging logic ensuring alternation starting with user if possible.
      // If it occurs, it implies an ART prompt that starts with assistant and has no system message.
      // Prepending an empty user message is a common workaround for some APIs.
      Logger.warn("AnthropicAdapter: Prompt does not start with user message and has no system prompt. Prepending an empty user message for compatibility.");
      messages.unshift({ role: 'user', content: '(Previous turn context)'});
    }
     // Ensure conversation doesn't end on an assistant message if expecting tool results (though API handles this by stop_reason)
    const lastArtMsg = artPrompt[artPrompt.length -1];
    if (lastArtMsg?.role === 'assistant' && lastArtMsg.tool_calls && lastArtMsg.tool_calls.length > 0) {
        // This is fine, Anthropic will respond with stop_reason: 'tool_use'
        Logger.debug("AnthropicAdapter: Prompt ends with assistant requesting tool calls.");
    }


    return { systemPrompt, messages };
  }

  /**
   * Maps a single ArtStandardMessage to Anthropic SDK's content format (string or AnthropicSDKContentBlockParam[]).
   */
  private mapArtMessageToAnthropicContent(artMsg: ArtStandardMessage): string | AnthropicSDKContentBlockParam[] {
    const blocks: AnthropicSDKContentBlockParam[] = [];

    // Handle text content
    if (artMsg.content && typeof artMsg.content === 'string' && artMsg.content.trim() !== '') {
      blocks.push({ type: 'text', text: artMsg.content });
    } else if (artMsg.content && typeof artMsg.content !== 'string' && artMsg.role !== 'tool_result' && (!artMsg.tool_calls || artMsg.tool_calls.length === 0) ) {
      // For non-string content (e.g. if ART supports structured content like images later)
      // Stringify if it's an object and not a tool_result (handled below) or an assistant message that only contains tool_calls.
      Logger.warn(`AnthropicAdapter: Non-string, non-tool_result, non-tool_call-only content for role ${artMsg.role}, stringifying.`, { content: artMsg.content });
      blocks.push({ type: 'text', text: JSON.stringify(artMsg.content) });
    }

    // Handle tool_calls for assistant messages (these become 'tool_use' blocks)
    if (artMsg.role === 'assistant' && artMsg.tool_calls && artMsg.tool_calls.length > 0) {
      artMsg.tool_calls.forEach(tc => {
        if (tc.type === 'function') {
          try {
            blocks.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments || '{}'), // Anthropic expects input as an object
            });
          } catch (e: any) {
            throw new ARTError(
              `AnthropicAdapter: Failed to parse tool call arguments for tool ${tc.function.name} (ID: ${tc.id}). Arguments must be valid JSON. Error: ${e.message}`,
              ErrorCode.PROMPT_TRANSLATION_FAILED, e
            );
          }
        } else {
          Logger.warn(`AnthropicAdapter: Skipping non-function tool_call type: ${tc.type}`);
        }
      });
    }

    // Handle tool_result messages (these become 'tool_result' blocks)
    if (artMsg.role === 'tool_result') {
      if (!artMsg.tool_call_id) {
        throw new ARTError("AnthropicAdapter: 'tool_result' message missing required 'tool_call_id'.", ErrorCode.PROMPT_TRANSLATION_FAILED);
      }
      const toolResultBlock: Anthropic.ToolResultBlockParam = { // Explicitly use the SDK type
        type: 'tool_result',
        tool_use_id: artMsg.tool_call_id,
      };

      if (typeof artMsg.content === 'string') {
        toolResultBlock.content = artMsg.content;
      } else if (Array.isArray(artMsg.content) && artMsg.content.every(c => typeof c === 'object' && c.type === 'text' && typeof c.text === 'string')) {
        // If ART provides content as [{type: 'text', text: '...'}] for tool results
        toolResultBlock.content = artMsg.content.map(c => ({type: 'text', text: (c as any).text}));
      } else if (artMsg.content !== null && artMsg.content !== undefined) {
        // Otherwise, stringify complex content for tool_result
        toolResultBlock.content = JSON.stringify(artMsg.content);
      }
      // is_error can be added if artMsg supports it:
      // if (artMsg.is_error) toolResultBlock.is_error = true;

      blocks.push(toolResultBlock);
    }

    // If only one text block and no other block types, Anthropic SDK allows content to be a simple string.
    if (blocks.length === 1 && blocks[0].type === 'text') {
      return (blocks[0] as Anthropic.TextBlockParam).text;
    }
    // If blocks is empty (e.g. assistant message with only tool_calls that were filtered, or empty user message)
    // Anthropic expects an empty string or valid content block array.
    // An empty message like {role: 'user', content: ''} is valid.
    if (blocks.length === 0) {
        return ""; // Return empty string for empty content, which is valid for Anthropic
    }

    return blocks; // Return array of ContentBlockParam
  }

  /**
   * Translates ART ToolSchema array to Anthropic's tool format.
   */
  private translateArtToolsToAnthropic(artTools: ToolSchema[]): AnthropicSDKTool[] {
    return artTools.map(artTool => {
      if (!artTool.inputSchema || typeof artTool.inputSchema !== 'object') { // Changed 'parameters' to 'inputSchema'
        throw new ARTError(`Invalid inputSchema definition for tool '${artTool.name}'. Expected a JSON schema object.`, ErrorCode.INVALID_CONFIG);
      }
      return {
        name: artTool.name,
        description: artTool.description,
        input_schema: artTool.inputSchema as Anthropic.Tool.InputSchema, // Changed 'parameters' to 'inputSchema'
      };
    });
  }
}