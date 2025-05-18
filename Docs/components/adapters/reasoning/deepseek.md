# DeepSeek Adapter (`DeepSeekAdapter`)

The `DeepSeekAdapter` allows the ART Framework to connect to DeepSeek AI models, which offer an OpenAI-compatible API endpoint. This adapter primarily focuses on translating ART's standard prompt format to the OpenAI Chat Completions format expected by DeepSeek.

*   **Source:** `src/adapters/reasoning/deepseek.ts`
*   **Implements:** `ProviderAdapter`

## Constructor Options

When configuring the `DeepSeekAdapter` (e.g., in `RuntimeProviderConfig.adapterOptions`), the following options are available (`DeepSeekAdapterOptions`):

```typescript
export interface DeepSeekAdapterOptions {
  apiKey: string; // Required
  model?: string; // Optional: Default DeepSeek model ID
  apiBaseUrl?: string; // Optional: Override API base URL
}
```

*   **`apiKey: string` (Required):** Your DeepSeek API key.
*   **`model?: string` (Optional):** The default DeepSeek model ID to use (e.g., `'deepseek-chat'`, `'deepseek-coder'`). If not provided, it defaults to `'deepseek-chat'`. This can be overridden by `RuntimeProviderConfig.modelId`.
*   **`apiBaseUrl?: string` (Optional):** Allows overriding the default DeepSeek API base URL (`https://api.deepseek.com/v1`).

**Example Configuration (`RuntimeProviderConfig.adapterOptions`):**

```typescript
// In CallOptions.providerConfig.adapterOptions
const deepseekAdapterOpts = {
    apiKey: process.env.DEEPSEEK_API_KEY, // Required
    model: 'deepseek-coder' // Optional override for this specific config
};
```

## Prompt Translation (`ArtStandardPrompt` to OpenAI Format)

The `DeepSeekAdapter` uses a translation logic very similar to the `OpenAIAdapter` because DeepSeek's API is designed to be compatible with OpenAI's Chat Completions format.

*   **Roles:**
    *   `system` (ART) -> `system` (OpenAI)
    *   `user` (ART) -> `user` (OpenAI)
    *   `assistant` (ART) -> `assistant` (OpenAI)
    *   `tool_result` (ART) -> `tool` (OpenAI), including `tool_call_id` and `content`.
*   **Content:**
    *   String content is passed directly.
    *   Non-string content for `user` or `system` roles is stringified with a warning.
    *   For `assistant` messages, `content` can be `null` if `tool_calls` are present.
*   **Tool Use:**
    *   **Tool Definition (`ToolSchema`):** While DeepSeek's API documentation mentions tool/function calling similar to OpenAI, the current `DeepSeekAdapter` in ART `v0.2.7` does **not** explicitly translate `ToolSchema` from `CallOptions.tools` into the `tools` parameter for the DeepSeek API call. If tool definitions are required by the DeepSeek model being used, they would need to be part of the system prompt or user instructions.
    *   **Assistant Tool Calls (`ArtStandardMessage.tool_calls`):** If an `assistant` message in `ArtStandardPrompt` contains `tool_calls`, these are translated directly into the `tool_calls` array in the OpenAI message format.
    *   **Tool Results (`ArtStandardMessage` with `role: 'tool_result'`):** These are translated into OpenAI messages with `role: 'tool'`, including `tool_call_id` and the stringified `content`.

## Streaming and `StreamEvent` Generation

**Important: As of ART `v0.2.7`, streaming is NOT YET IMPLEMENTED for the `DeepSeekAdapter`.**

*   If `CallOptions.stream` is set to `true`, the adapter will:
    1.  Log a warning: `"DeepSeekAdapter: Streaming requested but not implemented. Returning error stream."`
    2.  Yield an `ERROR` `StreamEvent` with an `ARTError` indicating that streaming is not implemented.
    3.  Yield an `END` `StreamEvent`.
*   The call will effectively fail from a streaming perspective.

## Non-Streaming Behavior

When `CallOptions.stream` is `false` (or omitted):

1.  The adapter constructs the OpenAI-compatible payload.
2.  It makes a non-streaming HTTP POST request to the DeepSeek API endpoint (`${apiBaseUrl}/chat/completions`).
3.  **Response Handling:**
    *   It parses the JSON response from DeepSeek.
    *   It extracts the content from the first choice's message (`response.choices[0].message.content`).
    *   Tool calls in the response (`response.choices[0].message.tool_calls`) are logged but not explicitly processed further by this adapter for direct inclusion in the `TOKEN` data (unlike some other adapters that might combine text and tool calls in a structured `TOKEN` event). The agent logic would typically look for `finish_reason: 'tool_calls'` and then access the full message object.
4.  **`StreamEvent` Yielding (Simulated Stream for Consistency):**
    Even for non-streaming calls, ART adapters return an `AsyncIterable<StreamEvent>`. The `DeepSeekAdapter` will yield:
    *   A single `TOKEN` `StreamEvent`:
        *   `data`: The trimmed text content from `response.choices[0].message.content`.
        *   `tokenType`: Determined by `CallOptions.callContext` (e.g., `AGENT_THOUGHT_LLM_RESPONSE` or `FINAL_SYNTHESIS_LLM_RESPONSE`).
    *   A `METADATA` `StreamEvent`: Containing `inputTokens`, `outputTokens` (from `response.usage`), and `stopReason` (from `response.choices[0].finish_reason`).
    *   An `END` `StreamEvent`.

## Error Handling

*   **API Errors:** If the DeepSeek API returns a non-200 status, the adapter attempts to parse an error message from the JSON response body (looking for `error.message`). This is then wrapped in an `ARTError` (ErrorCode: `LLM_PROVIDER_ERROR`) and yielded as an `ERROR` `StreamEvent` (or thrown if an error occurs before stream generation can begin).
*   **Invalid Response Structure:** If the API response is 200 OK but doesn't contain the expected structure (e.g., `choices[0].message` is missing), an `ARTError` (ErrorCode: `LLM_PROVIDER_ERROR`) is generated and handled similarly.
*   **Network Errors:** Fetch-related network errors are caught, wrapped in an `ARTError`, and handled.
*   **Prompt Translation Errors:** Errors during the initial `ArtStandardPrompt` to OpenAI message translation (e.g., invalid `tool_call` structure in an assistant message) will result in an `ERROR` stream before any API call is made.

## Unique Features and Limitations

*   **OpenAI Compatibility:** Relies on DeepSeek's OpenAI-compatible API, simplifying the adapter's translation logic.
*   **No Streaming (Current Limitation):** Streaming is a significant missing feature that would improve responsiveness.
*   **Basic Tool Call Handling:** Translates outgoing `tool_calls` and `tool_result` messages. However, it doesn't actively process or structure incoming tool calls from the LLM response into the `TOKEN` event data for non-streaming calls (the agent would inspect the raw `finish_reason` and message object).
*   **No Explicit Tool Schema Transmission:** Does not send `ToolSchema` definitions as part of the `tools` parameter in the API request.