# Anthropic Adapter (`AnthropicAdapter`)

The `AnthropicAdapter` enables the ART Framework to interact with Anthropic's Claude models via their Messages API. It handles the translation of ART's standard prompt format (`ArtStandardPrompt`) into Anthropic's specific message structure and processes responses, including streaming and tool use.

*   **Source:** `src/adapters/reasoning/anthropic.ts`
*   **Implements:** `ProviderAdapter`

## Constructor Options

When configuring the `AnthropicAdapter` within the `ProviderManagerConfig` (as part of `ArtInstanceConfig`) or providing `adapterOptions` in `RuntimeProviderConfig`, the following options are recognized by its constructor (`AnthropicAdapterOptions`):

```typescript
export interface AnthropicAdapterOptions {
  apiKey: string; // Required
  model?: string; // Optional: Default model ID (e.g., 'claude-3-opus-20240229')
  apiBaseUrl?: string; // Optional: Override Anthropic API base URL
  defaultMaxTokens?: number; // Optional: Default max_tokens for responses
  defaultTemperature?: number; // Optional: Default temperature
}
```

*   **`apiKey: string` (Required):** Your Anthropic API key.
*   **`model?: string` (Optional):** The default Anthropic model ID to use if not specified in `CallOptions` or `RuntimeProviderConfig.modelId`. Defaults to `'claude-3-haiku-20240307'` if not provided at all.
    *   Examples: `'claude-3-opus-20240229'`, `'claude-3-sonnet-20240229'`, `'claude-3-5-sonnet-20240620'`, `'claude-3-haiku-20240307'`.
*   **`apiBaseUrl?: string` (Optional):** Allows overriding the default Anthropic API base URL (`https://api.anthropic.com/v1`). Useful for proxies or testing environments. The Anthropic SDK handles the final URL construction.
*   **`defaultMaxTokens?: number` (Optional):** A default value for `max_tokens` to be sent to the Anthropic API if not overridden by `CallOptions.max_tokens` or `CallOptions.maxOutputTokens`. Defaults to `4096` (Anthropic's default for Claude 3 models if not specified by user).
*   **`defaultTemperature?: number` (Optional):** A default temperature value if not overridden by `CallOptions.temperature`.

**Example Configuration (`RuntimeProviderConfig.adapterOptions`):**

```typescript
// In CallOptions.providerConfig.adapterOptions
const anthropicAdapterOpts = {
    apiKey: process.env.ANTHROPIC_API_KEY, // Required
    model: 'claude-3-sonnet-20240229',     // Optional default for this specific config
    defaultMaxTokens: 2000                 // Optional
};
```

## Prompt Translation (`ArtStandardPrompt` to Anthropic Messages API)

The `AnthropicAdapter` translates the `ArtStandardPrompt` (an array of `ArtStandardMessage` objects) into the format expected by Anthropic's Messages API. Key translation behaviors include:

*   **Roles:**
    *   `system` messages in `ArtStandardPrompt` are combined and sent as the `system` parameter in the Anthropic API request.
    *   `user` messages map to Anthropic's `user` role.
    *   `assistant` messages map to Anthropic's `assistant` role.
    *   `tool_result` messages (from ART) map to an Anthropic `user` message containing a `tool_result` content block.
*   **Message Merging:** Anthropic's API requires that messages strictly alternate between `user` and `assistant` roles. The adapter handles merging consecutive messages of the same translated role. For example, two back-to-back `user` messages in `ArtStandardPrompt` will be merged into a single `user` message with concatenated content for the Anthropic API.
*   **Content:**
    *   Text content is passed directly.
    *   The adapter handles non-string content by attempting to stringify it, with warnings logged.
*   **Tool Use:**
    *   **Tool Definition (`ToolSchema` to Anthropic `tools`):**
        *   When `CallOptions.tools` (an array of `ToolSchema`) is provided, the adapter translates these into Anthropic's `tools` format. The `input_schema` in Anthropic's tool definition directly uses the `inputSchema` (JSON Schema) from ART's `ToolSchema`.
    *   **Assistant Tool Calls (`ArtStandardMessage.tool_calls` to Anthropic `tool_use` content block):**
        *   If an `assistant` message in `ArtStandardPrompt` contains `tool_calls`, these are translated into `tool_use` content blocks in the Anthropic request. The `arguments` (which are stringified JSON in `ArtStandardMessage`) are parsed into a JSON object for Anthropic's `input` field.
    *   **Tool Results (`ArtStandardMessage` with `role: 'tool_result'` to Anthropic `tool_result` content block):**
        *   An `ArtStandardMessage` with `role: 'tool_result'` (containing `tool_call_id` and `content` as the stringified tool output/error) is translated into an Anthropic `user` message. This `user` message will contain a `tool_result` content block with the `tool_use_id` and the `content` (or `error` if applicable, though the adapter primarily passes content).

## Streaming and `StreamEvent` Generation

When `CallOptions.stream` is `true`, the `AnthropicAdapter` uses the Anthropic SDK's streaming capabilities. It processes the events from the Anthropic stream and translates them into ART `StreamEvent`s:

*   **`message_start` (Anthropic) -> `METADATA` (ART):**
    *   The initial `message_start` event from Anthropic, which includes `input_tokens` and initial `output_tokens` (often 0), is used to yield an initial `METADATA` `StreamEvent`.
*   **`content_block_delta` (Anthropic) with `type: 'text_delta'` -> `TOKEN` (ART):**
    *   Each `text_delta` containing a piece of the response text results in a `TOKEN` `StreamEvent`.
    *   The `tokenType` is set based on `CallOptions.callContext` (e.g., `AGENT_THOUGHT_LLM_RESPONSE` or `FINAL_SYNTHESIS_LLM_RESPONSE`). Anthropic doesn't natively emit distinct "thinking" deltas that are easily distinguishable from response deltas without specific prompt engineering (like using `<search_quality_reflection>` tags, which this adapter doesn't automatically inject or parse for `tokenType` differentiation beyond `callContext`).
*   **`content_block_delta` (Anthropic) with `type: 'input_json_delta'`:**
    *   These deltas contribute to the arguments of a `tool_use` block. The adapter accumulates these, and the full `tool_use` block (including the completely streamed arguments) is typically processed at `message_stop` or derived from the final message content.
*   **`message_delta` (Anthropic) -> `METADATA` (ART):**
    *   This event provides cumulative `output_tokens` and the `stop_reason`. The adapter uses this to yield updated `METADATA` `StreamEvent`s.
*   **`message_stop` (Anthropic) -> final `TOKEN` (if tool use) and `METADATA` (ART):**
    *   When the stream stops:
        *   If the `stop_reason` was `'tool_use'`, the adapter constructs a final `TOKEN` event. The `data` of this event will be an array of objects, each representing a tool call (`type: 'tool_use'`, `id`, `name`, `input`). If there was also preceding text from the assistant before the tool call, that text is included as a `{type: 'text', text: '...'}` object in the array.
        *   A final `METADATA` `StreamEvent` is yielded, containing the final token counts and stop reason.
*   **Error Handling:** Errors from the Anthropic SDK or API during streaming are caught and yielded as an `ERROR` `StreamEvent`.

## Non-Streaming Behavior

If `CallOptions.stream` is `false`:

1.  The adapter makes a non-streaming call to the Anthropic Messages API.
2.  It processes the `content` array in the response:
    *   Text blocks are concatenated.
    *   `tool_use` blocks are collected.
3.  It yields a sequence of `StreamEvent`s:
    *   A single `TOKEN` event:
        *   If tool calls were made (`stop_reason: 'tool_use'`), the `data` will be an array structured similarly to the streaming `tool_use` case (text part + tool call objects).
        *   Otherwise, `data` is the trimmed concatenated text response.
    *   A `METADATA` event with usage details and stop reason from the API response.
    *   An `END` event.

## Error Handling

*   API errors from Anthropic (e.g., authentication failure, invalid request) are caught and transformed into `ARTError` objects with `ErrorCode.LLM_PROVIDER_ERROR`. These are then yielded as `ERROR` `StreamEvent`s or thrown if not streaming.
*   Invalid response structures (e.g., missing expected text content when not a tool call) will also result in an `ARTError` with `ErrorCode.LLM_PROVIDER_ERROR`.

## Unique Features and Limitations

*   **SDK Usage:** The `AnthropicAdapter` leverages the official `@anthropic-ai/sdk`, which handles many low-level API details, including versioning.
*   **Message Alternation:** The adapter internally manages the strict user/assistant message alternation required by Anthropic by merging consecutive messages of the same role before sending the request.
*   **System Prompt:** Supports Anthropic's top-level `system` prompt parameter.
*   **Tool Schema:** Directly uses JSON Schema for `input_schema` in tool definitions, aligning well with ART's `ToolSchema.inputSchema`.
*   **No Explicit "Thinking" Detection for `tokenType`:** While Anthropic models do "think," the adapter doesn't currently parse specific XML tags (like `<search_quality_reflection>`) that might indicate internal thought processes to set a more granular `tokenType` beyond what `callContext` provides. All `TOKEN` events from a planning call will be `AGENT_THOUGHT_LLM_RESPONSE`, and from synthesis will be `FINAL_SYNTHESIS_LLM_RESPONSE`.