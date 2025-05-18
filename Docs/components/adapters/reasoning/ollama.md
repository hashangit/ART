# Ollama Adapter (`OllamaAdapter`)

The `OllamaAdapter` allows the ART Framework to connect to various Large Language Models (LLMs) hosted locally via an [Ollama](https://ollama.com/) server. Ollama exposes an OpenAI-compatible API endpoint, so this adapter leverages the official `openai` Node.js SDK to communicate with it.

*   **Source:** `src/adapters/reasoning/ollama.ts`
*   **Implements:** `ProviderAdapter`

## Constructor Options

When configuring the `OllamaAdapter` (e.g., in `RuntimeProviderConfig.adapterOptions`), the following `OllamaAdapterOptions` are available:

```typescript
export interface OllamaAdapterOptions {
  ollamaBaseUrl?: string; // Optional: Base URL for Ollama (e.g., 'http://localhost:11434')
  defaultModel?: string;  // Optional: Default Ollama model ID (e.g., 'llama3', 'mistral')
  apiKey?: string;        // Optional: API key if Ollama is secured (defaults to "ollama")
}
```

*   **`ollamaBaseUrl?: string` (Optional):** The base URL of your Ollama server.
    *   Defaults to `'http://localhost:11434'`.
    *   The adapter automatically appends `/v1` to this URL to target Ollama's OpenAI-compatible API endpoint (e.g., `http://localhost:11434/v1`).
*   **`defaultModel?: string` (Optional):** The default Ollama model ID to use (e.g., `'llama3'`, `'mistral'`, `'codellama:13b'`). This is required if no model is specified in `RuntimeProviderConfig.modelId` or `CallOptions.model`. It's highly recommended to set either this default or provide a model at runtime.
*   **`apiKey?: string` (Optional):** The API key to use if your Ollama instance is secured.
    *   Defaults to `"ollama"`, which is a common placeholder for unsecured local Ollama instances.

**Example Configuration (`RuntimeProviderConfig.adapterOptions`):**

```typescript
// In CallOptions.providerConfig.adapterOptions
const ollamaAdapterOpts = {
    // ollamaBaseUrl: 'http://my-ollama-server:11434', // Optional if not localhost
    defaultModel: 'qwen3:14b-q4_K_M', // Recommended to set a default
    // apiKey: 'my-secure-ollama-key' // If your Ollama instance uses an API key
};
```

**Important:** A model ID **must** be available for each call, either from `OllamaAdapterOptions.defaultModel`, `RuntimeProviderConfig.modelId` (in `CallOptions.providerConfig`), or `CallOptions.model`. If no model is resolved, the call will fail.

## Prompt Translation (`ArtStandardPrompt` to OpenAI Format)

Since Ollama's API is OpenAI-compatible, the `OllamaAdapter` translates `ArtStandardPrompt` to the OpenAI Chat Completions message format.

*   **Roles:**
    *   `system` (ART) -> `system` (OpenAI)
    *   `user` (ART) -> `user` (OpenAI)
    *   `assistant` (ART) -> `assistant` (OpenAI)
    *   `tool_result` (ART) -> `tool` (OpenAI), including `tool_call_id` and `content`.
*   **R1-Style Merging (for specific models like `deepseek-r1`):**
    *   If the `modelIdToUse` (resolved model ID for the call) contains "deepseek-r1" (case-insensitive), the adapter will merge consecutive `user` messages into a single `user` message, and consecutive `assistant` messages (including their `tool_calls`) into a single `assistant` message. This is to accommodate models that do not support alternating messages of the same role.
    *   For other models, messages are translated directly without this specific merging logic.
*   **Content:**
    *   String content is passed directly.
    *   Non-string content for `user` or `system` roles is stringified with a warning.
    *   For `assistant` messages, `content` can be `null` if `tool_calls` are present.
*   **Tool Use:**
    *   **Tool Definition (`ToolSchema` to OpenAI `tools`):**
        *   If `CallOptions.tools` (an array of `ToolSchema`) is provided, the adapter translates these into the `tools` parameter format expected by the OpenAI API (each tool becoming an object with `type: 'function'` and a `function` definition containing `name`, `description`, and `parameters` based on `ToolSchema.inputSchema`).
    *   **Assistant Tool Calls (`ArtStandardMessage.tool_calls`):**
        *   Translated directly into the `tool_calls` array in the OpenAI message format.
    *   **Tool Results (`ArtStandardMessage` with `role: 'tool_result'`):**
        *   Translated into OpenAI messages with `role: 'tool'`, including `tool_call_id` and the stringified `content`.

## Streaming and `StreamEvent` Generation

When `CallOptions.stream` is `true`:

1.  The adapter makes a streaming call to `this.client.chat.completions.create()` from the `openai` SDK, with `stream: true`.
2.  It iterates over the chunks from the SDK's stream:
    *   **`TOKEN` Events:**
        *   Content from `chunk.choices[0].delta.content` is yielded as a `TOKEN` `StreamEvent`.
        *   `tokenType` is set based on `CallOptions.callContext`.
    *   **Tool Call Aggregation:** Deltas for `tool_calls` (`chunk.choices[0].delta.tool_calls`) are aggregated. Each tool call delta provides parts like `index`, `id`, `function.name`, and `function.arguments` (which itself can be streamed in parts). The adapter reconstructs the full tool call(s).
    *   **Final `TOKEN` for Tool Calls:** If the `finish_reason` for the stream is `'tool_calls'`, after all chunks are processed, a final `TOKEN` `StreamEvent` is yielded. Its `data` will be an array of objects, each representing an aggregated tool call (`type: 'tool_use'`, `id`, `name`, `input` (parsed from arguments string)).
    *   **`METADATA` Event:**
        *   Ollama's OpenAI-compatible stream *may* include a `usage` object in the final chunk (or sometimes per chunk, though less common for usage). The adapter captures this if present.
        *   A single `METADATA` `StreamEvent` is yielded at the end, containing the `stopReason` (from `chunk.choices[0].finish_reason`), estimated `outputTokens` (approximated by counting content chunks for streaming), `inputTokens` (if available from `finalApiResponseUsage`), `timeToFirstTokenMs`, and `totalGenerationTimeMs`.
    *   **`ERROR` Events:** Errors from the `openai` SDK or during stream processing are caught and yielded as an `ERROR` `StreamEvent`.
    *   **`END` Event:** Yielded after the stream is fully consumed or an error terminates it.

## Non-Streaming Behavior

When `CallOptions.stream` is `false`:

1.  The adapter makes a non-streaming call to `this.client.chat.completions.create()`.
2.  It processes the response:
    *   Extracts text content from `response.choices[0].message.content`.
    *   Collects `tool_calls` from `response.choices[0].message.tool_calls`.
3.  **`StreamEvent` Yielding (Simulated Stream):**
    *   A single `TOKEN` `StreamEvent`:
        *   If `tool_calls` are present: `data` is an array. If text content also exists, the first element is `{type: 'text', text: '...'}` followed by objects for each tool call (`type: 'tool_use'`, `id`, `name`, `input`). If only tool calls, it's just the array of tool call objects.
        *   If only text content: `data` is the trimmed text.
        *   `tokenType` is set based on `CallOptions.callContext`.
    *   A `METADATA` `StreamEvent` with `inputTokens`, `outputTokens` (from `response.usage`), `stopReason`.
    *   An `END` `StreamEvent`.

## Error Handling

*   **API Errors:** Errors from the `openai` SDK (which wraps HTTP errors from Ollama) like `APIError` are caught. The status and message are extracted and wrapped in an `ARTError` (ErrorCode: `LLM_PROVIDER_ERROR`), then yielded as an `ERROR` `StreamEvent` or thrown.
*   **Invalid Response Structure:** If the API response is 200 OK but malformed, an `ARTError` is generated.
*   **Prompt Translation Errors:** Errors during `ArtStandardPrompt` translation result in an `ERROR` stream before any API call.
*   **Missing Model ID:** If no model ID can be resolved for the call, an `ARTError` (ErrorCode: `INVALID_CONFIG`) is generated.

## Unique Features and Limitations

*   **Uses `openai` SDK:** Leverages the official OpenAI Node.js SDK for robust interaction with Ollama's compatible endpoint.
*   **Local Model Focus:** Primarily designed for local LLM inference via Ollama.
*   **R1-Style Message Merging:** Includes specific logic to merge consecutive user or assistant messages for models like `deepseek-r1` that require strict role alternation.
*   **Full Tool Support:** Implements translation for `ToolSchema` (to OpenAI `tools` format), outgoing `tool_calls`, and incoming `tool_result` messages, making it capable of function calling with compatible Ollama models.