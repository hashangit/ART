# OpenAI Adapter (`OpenAIAdapter`)

The `OpenAIAdapter` facilitates communication between the ART Framework and OpenAI's suite of models (like GPT-3.5, GPT-4, GPT-4o) via their Chat Completions API. It handles prompt translation, streaming, and tool/function calling.

*   **Source:** `src/adapters/reasoning/openai.ts`
*   **Implements:** `ProviderAdapter`

## Constructor Options

When configuring the `OpenAIAdapter` (e.g., in `RuntimeProviderConfig.adapterOptions`), the following `OpenAIAdapterOptions` are available:

```typescript
export interface OpenAIAdapterOptions {
  apiKey: string; // Required
  model?: string; // Optional: Default OpenAI model ID
  apiBaseUrl?: string; // Optional: Override API base URL
}
```

*   **`apiKey: string` (Required):** Your OpenAI API key.
*   **`model?: string` (Optional):** The default OpenAI model ID to use (e.g., `'gpt-4o'`, `'gpt-4-turbo'`, `'gpt-3.5-turbo'`). If not provided, it defaults to `'gpt-3.5-turbo'`. This can be overridden by `RuntimeProviderConfig.modelId`.
*   **`apiBaseUrl?: string` (Optional):** Allows overriding the default OpenAI API base URL (`https://api.openai.com/v1`). Useful for Azure OpenAI Service or custom proxies.

**Example Configuration (`RuntimeProviderConfig.adapterOptions`):**

```typescript
// In CallOptions.providerConfig.adapterOptions
const openaiAdapterOpts = {
    apiKey: process.env.OPENAI_API_KEY, // Required
    model: 'gpt-4o-mini'                  // Optional override
    // apiBaseUrl: 'https://YOUR_AZURE_OPENAI_RESOURCE.openai.azure.com/' // For Azure
};
```

## Prompt Translation (`ArtStandardPrompt` to OpenAI Messages)

The `OpenAIAdapter.translateToOpenAI()` method converts an `ArtStandardPrompt` into the `messages` array format expected by the OpenAI Chat Completions API:

*   **Roles:**
    *   `system` (ART) -> `system` (OpenAI)
    *   `user` (ART) -> `user` (OpenAI)
    *   `assistant` (ART) -> `assistant` (OpenAI)
    *   `tool_result` (ART) -> `tool` (OpenAI), including `tool_call_id` and `content`.
*   **Content:**
    *   String content is passed directly.
    *   Non-string content for `user` or `system` roles is stringified with a warning.
    *   For `assistant` messages, `content` can be `null` if `tool_calls` are present (as per OpenAI API requirements).
*   **Tool Use (Function Calling):**
    *   **Tool Definition (`ToolSchema` to OpenAI `tools`):**
        *   While the `OpenAIAdapter`'s `translateToOpenAI` method itself doesn't directly process `ToolSchema` (as this schema is usually passed in `CallOptions.tools` to the `call` method which then forms the main API payload), if `CallOptions.tools` are provided to the `OpenAIAdapter.call` method, they would be formatted into the `tools` parameter of the OpenAI API request. Each `ToolSchema` becomes an object with `type: 'function'` and a `function` definition (name, description, parameters from `inputSchema`).
    *   **Assistant Tool Calls (`ArtStandardMessage.tool_calls`):**
        *   If an `assistant` message in `ArtStandardPrompt` contains `tool_calls`, these are translated directly into the `tool_calls` array in the OpenAI message format. The `arguments` (stringified JSON in `ArtStandardMessage`) are passed as is.
    *   **Tool Results (`ArtStandardMessage` with `role: 'tool_result'`):**
        *   An `ArtStandardMessage` with `role: 'tool_result'` (containing `tool_call_id` and `content` as the stringified tool output/error) is translated into an OpenAI message with `role: 'tool'`, `tool_call_id`, and `content`.

## Streaming and `StreamEvent` Generation

When `CallOptions.stream` is `true`:

1.  The adapter makes an HTTP POST request to the OpenAI API with `stream: true` in the payload.
2.  It processes the Server-Sent Events (SSE) stream from the API response body.
3.  **`TOKEN` Events:**
    *   Each data chunk from the stream typically contains a `delta` object (e.g., `chunk.choices[0].delta.content` or `chunk.choices[0].delta.tool_calls`).
    *   If `delta.content` exists and is non-empty, a `TOKEN` `StreamEvent` is yielded with this content.
    *   `tokenType` is set based on `CallOptions.callContext`.
    *   **Tool Call Streaming:** OpenAI streams tool calls incrementally. The `delta.tool_calls` array will contain partial information for each tool call (e.g., just the `id` and `type` first, then `function.name`, then chunks of `function.arguments`). The adapter's `processStream` method attempts to aggregate these partial tool call deltas.
        *   *Note: The current `OpenAIAdapter.processStream` in `v0.2.7` has basic aggregation for `tool_calls`. A more robust implementation might be needed for complex, concurrent tool call streaming. The primary focus for streaming `TOKEN` events is usually on text content.*
4.  **`METADATA` Event:**
    *   Information like `finish_reason` comes in a later chunk. Token usage (`prompt_tokens`, `completion_tokens`) is **not** typically provided by OpenAI in streaming responses.
    *   A `METADATA` `StreamEvent` is yielded at the end, containing the `stopReason` (if available) and estimated `outputTokens` (based on content chunks). `timeToFirstTokenMs` and `totalGenerationTimeMs` are also calculated.
5.  **`ERROR` Events:** Errors during stream reading or JSON parsing of chunks are caught and yielded as `ERROR` `StreamEvent`s.
6.  **`END` Event:** Yielded when the `data: [DONE]` signal is received from OpenAI or if an error terminates the stream.

## Non-Streaming Behavior

When `CallOptions.stream` is `false`:

1.  The adapter makes a non-streaming HTTP POST request.
2.  It parses the full JSON response from OpenAI (`OpenAIChatCompletionResponse`).
3.  **Response Handling:**
    *   Extracts text content from `response.choices[0].message.content`.
    *   Collects `tool_calls` from `response.choices[0].message.tool_calls`.
4.  **`StreamEvent` Yielding (Simulated Stream):**
    *   A single `TOKEN` `StreamEvent`:
        *   `data`: The trimmed text content. *Note: If `tool_calls` are present, the OpenAI API usually sets `content` to `null` or an empty string. The `TOKEN` event will reflect this. The agent logic needs to inspect `finish_reason` and the full `message` object for tool calls.*
        *   `tokenType`: Determined by `CallOptions.callContext`.
    *   A `METADATA` `StreamEvent` with `inputTokens`, `outputTokens` (from `response.usage`), and `stopReason`.
    *   An `END` `StreamEvent`.

## Error Handling

*   **API Errors:** If the OpenAI API returns a non-200 status, the adapter attempts to parse an error message from the JSON response body (`error.message`). This is wrapped in an `ARTError` (ErrorCode: `LLM_PROVIDER_ERROR`) and handled.
*   **Invalid Response Structure:** If the API response is 200 OK but malformed (e.g., `choices[0].message` missing), an `ARTError` is generated.
*   **Network Errors:** Fetch-related network errors are caught and wrapped.
*   **Prompt Translation Errors:** Errors during `ArtStandardPrompt` to OpenAI message translation result in an `ERROR` stream.

## Unique Features and Limitations

*   **Raw Fetch:** The current `OpenAIAdapter` in `v0.2.7` uses raw `fetch` calls. Future versions may migrate to the official `openai` SDK for potentially better type safety, error handling, and helper utilities.
*   **Tool Call Streaming Aggregation:** Basic aggregation of streamed tool call deltas is attempted, but complex scenarios might require more sophisticated handling by the consuming agent logic if it needs fully formed tool calls *during* the stream. Typically, full tool call objects are reliably available in the final message object when the stream ends or in non-streaming responses.
*   **No Streaming Usage Data:** OpenAI's streaming API does not provide token usage details in the stream itself. The `METADATA` event will have estimated `outputTokens` for streams. Full usage is only available in non-streaming responses.