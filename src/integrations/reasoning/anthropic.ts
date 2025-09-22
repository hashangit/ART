// src/adapters/reasoning/anthropic.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { ProviderAdapter, ToolSchema } from '@/core/interfaces';
import {
  ArtStandardPrompt,
  ArtStandardMessage,
  CallOptions,
  StreamEvent,
  LLMMetadata,
} from '@/types';
import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors';

// Default model if not specified
const ANTHROPIC_DEFAULT_MODEL_ID = 'claude-3-7-sonnet-20250219';
const ANTHROPIC_DEFAULT_MAX_TOKENS = 4096;

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
type AnthropicSDKContentBlockParam = Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam | Anthropic.Messages.ToolUseBlockParam | Anthropic.Messages.ToolResultBlockParam;
type AnthropicSDKTool = Anthropic.Tool;
type AnthropicSDKToolUseBlock = Anthropic.ToolUseBlock;

/**
 * Implements the `ProviderAdapter` interface for interacting with Anthropic's
 * Messages API (Claude models) using the official SDK.
 *
 * Handles formatting requests, parsing responses, streaming, and tool use.
 *
 * @see {@link ProviderAdapter} for the interface definition.
 * @see {@link AnthropicAdapterOptions} for configuration options.
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
      stream = false,
      callContext,
      model: modelOverride,
      tools: availableArtTools,
      providerConfig,
    } = options;

    const modelToUse = providerConfig?.modelId || modelOverride || this.defaultModel;

    // Extract Anthropic specific parameters from providerConfig.adapterOptions or options
    const anthropicApiParams = providerConfig?.adapterOptions || {};
    const maxTokens = anthropicApiParams.max_tokens || anthropicApiParams.maxTokens || options.max_tokens || options.maxOutputTokens || this.defaultMaxTokens;
    const temperature = anthropicApiParams.temperature ?? options.temperature ?? this.defaultTemperature;
    const topP = anthropicApiParams.top_p || anthropicApiParams.topP || options.top_p || options.topP;
    const topK = anthropicApiParams.top_k || anthropicApiParams.topK || options.top_k || options.topK;
    const stopSequences = anthropicApiParams.stop_sequences || anthropicApiParams.stopSequences || options.stop || options.stop_sequences || options.stopSequences;
    // Anthropic thinking config for Claude 3.7 Sonnet (reasoning): { type: 'enabled', budget_tokens?: number }
    const thinking = anthropicApiParams.thinking || options.thinking;

    if (!maxTokens) {
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
      // pass-through optional provider features
      thinking: thinking as any,
      stream: stream,
      tools: anthropicTools,
    };

    // Remove undefined keys from the request body
    Object.keys(requestBody).forEach(key => {
      const K = key as keyof Anthropic.Messages.MessageCreateParams;
      if (requestBody[K] === undefined) {
        delete requestBody[K];
      }
    });

    Logger.debug(`Calling Anthropic API with model ${modelToUse}`, { stream, tools: !!anthropicTools, threadId, traceId });

    // Use an async generator function
    const generator = async function* (this: AnthropicAdapter): AsyncIterable<StreamEvent> {
      try {
        const startTime = Date.now();
        let timeToFirstTokenMs: number | undefined;
        if (stream) {
          const streamInstance = await this.client.messages.create(
            requestBody as Anthropic.Messages.MessageCreateParamsStreaming,
            this.getRequestOptions(modelToUse)
          );

          let accumulatedText = "";
          const accumulatedToolUses: Array<{ id: string; name: string; input: any }> = [];
          const toolUseAcc = new Map<number, { id: string; name: string; chunks: string[] }>();
          const thinkingBlockIndexes = new Set<number>();
          let currentInputTokens: number | undefined;
          let currentOutputTokens: number | undefined;
          let finalStopReason: string | null = null;
          const finalUsage: Partial<Anthropic.Messages.Usage> = {
            input_tokens: undefined,
            output_tokens: undefined
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
                // Track thinking blocks for correct token typing
                if ((event as any).content_block?.type === 'thinking') {
                  thinkingBlockIndexes.add(event.index);
                  const thinkingText = (event.content_block as any).thinking || '';
                  if (thinkingText) {
                    if (timeToFirstTokenMs === undefined) timeToFirstTokenMs = Date.now() - startTime;
                    const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
                    yield { type: 'TOKEN', data: thinkingText, threadId, traceId, sessionId, tokenType };
                  }
                }
                // Initialize tool_use accumulation for this block index
                if ((event as any).content_block?.type === 'tool_use') {
                  const block = event.content_block as Anthropic.ToolUseBlock;
                  toolUseAcc.set(event.index, { id: block.id, name: block.name, chunks: [] });
                }
                break;

              case 'content_block_delta':
                Logger.debug('Anthropic stream: content_block_delta', { index: event.index, delta: event.delta, threadId, traceId });
                if (event.delta.type === 'text_delta') {
                  const textDelta = event.delta.text;
                  accumulatedText += textDelta;
                  if (timeToFirstTokenMs === undefined) timeToFirstTokenMs = Date.now() - startTime;
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                  yield { type: 'TOKEN', data: textDelta, threadId, traceId, sessionId, tokenType };
                } else if ((event.delta as any).type === 'thinking_delta') {
                  const thinkingDelta = (event.delta as any).thinking || '';
                  if (thinkingDelta) {
                    if (timeToFirstTokenMs === undefined) timeToFirstTokenMs = Date.now() - startTime;
                    const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
                    yield { type: 'TOKEN', data: thinkingDelta, threadId, traceId, sessionId, tokenType };
                  }
                } else if ((event.delta as any).type === 'input_json_delta') {
                  const entry = toolUseAcc.get(event.index);
                  if (entry) {
                    const partial = (event.delta as any).partial_json ?? '';
                    if (partial) entry.chunks.push(partial);
                  }
                }
                break;

              case 'content_block_stop':
                Logger.debug('Anthropic stream: content_block_stop', { index: event.index, threadId, traceId });
                // Finalize tool_use input assembly for this block index
                if (toolUseAcc.has(event.index)) {
                  const entry = toolUseAcc.get(event.index)!;
                  const joined = entry.chunks.join('');
                  let parsed: any = {};
                  try {
                    parsed = joined ? JSON.parse(joined) : {};
                  } catch {
                    // leave as empty object if parse fails
                  }
                  accumulatedToolUses.push({ id: entry.id, name: entry.name, input: parsed });
                  toolUseAcc.delete(event.index);
                }
                break;

              case 'message_delta':
                Logger.debug('Anthropic stream: message_delta', { delta: event.delta, usage: event.usage, threadId, traceId });
                finalStopReason = event.delta.stop_reason ?? finalStopReason;
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
                      input_tokens: currentInputTokens,
                      output_tokens: event.usage.output_tokens ?? undefined,
                    },
                    delta: event.delta
                  },
                  traceId: traceId,
                };
                yield { type: 'METADATA', data: deltaMetadata, threadId, traceId, sessionId };
                break;

              case 'message_stop': {
                Logger.debug('Anthropic stream: message_stop. Using accumulated data.', { threadId, traceId });
                // Flush any remaining tool_use blocks (defensive)
                for (const [idx, entry] of toolUseAcc.entries()) {
                  const joined = entry.chunks.join('');
                  let parsed: any = {};
                  try {
                    parsed = joined ? JSON.parse(joined) : {};
                  } catch (e) {
                    Logger.warn('AnthropicAdapter: Failed to parse tool_use input JSON in final flush.', { error: e, threadId, traceId });
                  }
                  accumulatedToolUses.push({ id: entry.id, name: entry.name, input: parsed });
                  toolUseAcc.delete(idx);
                }

                if (finalStopReason === 'tool_use' && accumulatedToolUses.length > 0) {
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                  const toolData = accumulatedToolUses.map(tu => ({
                    type: 'tool_use',
                    id: tu.id,
                    name: tu.name,
                    input: tu.input,
                  }));
                  if (accumulatedText.trim()) {
                    yield { type: 'TOKEN', data: [{ type: 'text', text: accumulatedText.trim() }, ...toolData], threadId, traceId, sessionId, tokenType };
                  } else {
                    yield { type: 'TOKEN', data: toolData, threadId, traceId, sessionId, tokenType };
                  }
                } else if (accumulatedText.trim()) {
                  const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                  yield { type: 'TOKEN', data: accumulatedText.trim(), threadId, traceId, sessionId, tokenType };
                }

                const totalGenerationTimeMs = Date.now() - startTime;
                const finalMetadataReport: LLMMetadata = {
                  inputTokens: finalUsage.input_tokens ?? undefined,
                  outputTokens: finalUsage.output_tokens ?? undefined,
                  stopReason: finalStopReason ?? undefined,
                  timeToFirstTokenMs,
                  totalGenerationTimeMs,
                  providerRawUsage: {
                    usage: {
                      input_tokens: finalUsage.input_tokens ?? undefined,
                      output_tokens: finalUsage.output_tokens ?? undefined,
                    },
                    stop_reason: finalStopReason,
                  },
                  traceId: traceId,
                };
                yield { type: 'METADATA', data: finalMetadataReport, threadId, traceId, sessionId };
                break;
              }
              default: {
                Logger.warn('Anthropic stream: unhandled raw stream event type', { eventType: (event as any).type, event, threadId, traceId });
                break;
              }
            }
          }
        } else {
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
              totalGenerationTimeMs: Date.now() - startTime,
              providerRawUsage: { usage: response.usage, stop_reason: response.stop_reason, stop_sequence: response.stop_sequence },
              traceId: traceId,
            };
            yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
          }
        }

        // Yield END signal for both streaming and non-streaming
        yield { type: 'END', data: null, threadId, traceId, sessionId };

      } catch (error: any) {
        Logger.error(`Error during Anthropic API call: ${error.message}`, { error, threadId, traceId });
        const artError = error instanceof ARTError ? error :
          (error instanceof Anthropic.APIError ? new ARTError(`Anthropic API Error (${error.status}): ${error.message}`, ErrorCode.LLM_PROVIDER_ERROR, error) :
            new ARTError(error.message || 'Unknown Anthropic adapter error', ErrorCode.LLM_PROVIDER_ERROR, error));
        yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
      }
    }.bind(this);

    return generator();
  }

  /**
   * Optional: Method for graceful shutdown
   */
  async shutdown(): Promise<void> {
    Logger.debug(`AnthropicAdapter shutdown called.`);
    // Clean up any resources if needed
  }

  /**
   * Prepares request options, adding Anthropic beta headers if applicable for features like prompt caching.
   * @private
   * @param {string} modelId - The model ID being used for the request, to determine which beta features may apply.
   * @returns {Anthropic.RequestOptions} The request options object, potentially with custom headers.
   */
  private getRequestOptions(modelId: string): Anthropic.RequestOptions {
    const betas: string[] = [];
    // Add beta features as needed
    if (modelId.startsWith("claude-3-5-sonnet") || modelId.startsWith("claude-3-opus")) {
      // Example: betas.push("prompt-caching-2024-07-31");
    }

    if (betas.length > 0) {
      return { headers: { "anthropic-beta": betas.join(",") } };
    }
    return {};
  }

  /**
   * Translates the provider-agnostic `ArtStandardPrompt` into the Anthropic SDK Messages format.
   * It handles system prompts, message merging for consecutive roles, and validates message structure.
   *
   * @private
   * @param {ArtStandardPrompt} artPrompt - The input `ArtStandardPrompt` array.
   * @returns {{ systemPrompt?: string; messages: Anthropic.Messages.MessageParam[] }} An object containing the extracted system prompt and the array of Anthropic-formatted messages.
   * @throws {ARTError} If translation encounters an issue, such as multiple system messages or invalid message roles.
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
          currentLastMessageContentArray = lastMessage.content;
        }

        const contentToMergeArray: Anthropic.Messages.ContentBlockParam[] =
          typeof translatedContent === 'string'
            ? [{ type: 'text', text: translatedContent } as Anthropic.Messages.TextBlockParam]
            : translatedContent;

        const mergedContent: Anthropic.Messages.ContentBlockParam[] = [...currentLastMessageContentArray, ...contentToMergeArray];
        lastMessage.content = mergedContent;
        Logger.debug(`AnthropicAdapter: Merged consecutive ${messageRoleToPush} messages.`);
      } else {
        messages.push({ role: messageRoleToPush, content: translatedContent });
        currentRoleInternal = messageRoleToPush;
      }
    }

    // Anthropic requires the first message to be 'user' if messages exist and no system prompt.
    if (!systemPrompt && messages.length > 0 && messages[0].role !== 'user') {
      Logger.warn("AnthropicAdapter: Prompt does not start with user message and has no system prompt. Prepending an empty user message for compatibility.");
      messages.unshift({ role: 'user', content: '(Previous turn context)'});
    }
    
    // Ensure conversation doesn't end on an assistant message if expecting tool results
    const lastArtMsg = artPrompt[artPrompt.length -1];
    if (lastArtMsg?.role === 'assistant' && lastArtMsg.tool_calls && lastArtMsg.tool_calls.length > 0) {
      Logger.debug("AnthropicAdapter: Prompt ends with assistant requesting tool calls.");
    }

    return { systemPrompt, messages };
  }

  /**
   * Maps a single `ArtStandardMessage` to Anthropic SDK's content format.
   * This can be a simple string or an array of `ContentBlockParam` for complex content
   * like tool calls and tool results.
   *
   * @private
   * @param {ArtStandardMessage} artMsg - The ART standard message to map.
   * @returns {string | AnthropicSDKContentBlockParam[]} The translated content for the Anthropic API.
   * @throws {ARTError} If tool call arguments are not valid JSON or if a tool result is missing its ID.
   */
  private mapArtMessageToAnthropicContent(artMsg: ArtStandardMessage): string | AnthropicSDKContentBlockParam[] {
    const blocks: AnthropicSDKContentBlockParam[] = [];

    // Handle text content
    if (artMsg.content && typeof artMsg.content === 'string' && artMsg.content.trim() !== '') {
      blocks.push({ type: 'text', text: artMsg.content });
    } else if (artMsg.content && typeof artMsg.content !== 'string' && artMsg.role !== 'tool_result' && (!artMsg.tool_calls || artMsg.tool_calls.length === 0) ) {
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
              input: JSON.parse(tc.function.arguments || '{}'),
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
      const toolResultBlock: Anthropic.ToolResultBlockParam = {
        type: 'tool_result',
        tool_use_id: artMsg.tool_call_id,
      };

      if (typeof artMsg.content === 'string') {
        toolResultBlock.content = artMsg.content;
      } else if (Array.isArray(artMsg.content) && artMsg.content.every(c => typeof c === 'object' && c.type === 'text' && typeof c.text === 'string')) {
        toolResultBlock.content = artMsg.content.map(c => ({type: 'text', text: (c as any).text}));
      } else if (artMsg.content !== null && artMsg.content !== undefined) {
        toolResultBlock.content = JSON.stringify(artMsg.content);
      }

      blocks.push(toolResultBlock);
    }

    // If only one text block and no other block types, Anthropic SDK allows content to be a simple string.
    if (blocks.length === 1 && blocks[0].type === 'text') {
      return (blocks[0] as Anthropic.TextBlockParam).text;
    }
    
    // If blocks is empty, return empty string
    if (blocks.length === 0) {
      return "";
    }

    return blocks;
  }

  /**
   * Translates an array of `ToolSchema` from the ART framework format to Anthropic's specific tool format.
   * @private
   * @param {ToolSchema[]} artTools - An array of ART tool schemas.
   * @returns {AnthropicSDKTool[]} An array of tools formatted for the Anthropic API.
   * @throws {ARTError} If a tool's `inputSchema` is invalid.
   */
  private translateArtToolsToAnthropic(artTools: ToolSchema[]): AnthropicSDKTool[] {
    return artTools.map(artTool => {
      if (!artTool.inputSchema || typeof artTool.inputSchema !== 'object') {
        throw new ARTError(`Invalid inputSchema definition for tool '${artTool.name}'. Expected a JSON schema object.`, ErrorCode.INVALID_CONFIG);
      }
      return {
        name: artTool.name,
        description: artTool.description,
        input_schema: artTool.inputSchema as Anthropic.Tool.InputSchema,
      };
    });
  }
}