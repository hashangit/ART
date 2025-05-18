# OpenRouter Adapter (`OpenRouterAdapter`)

The `OpenRouterAdapter` enables the ART Framework to connect to a wide variety of LLMs available through the [OpenRouter.ai](https://openrouter.ai/) service. OpenRouter provides an OpenAI-compatible API, so this adapter functions similarly to the `OpenAIAdapter`.

*   **Source:** `src/adapters/reasoning/openrouter.ts`
*   **Implements:** `ProviderAdapter`

## Constructor Options

When configuring the `OpenRouterAdapter` (e.g., in `RuntimeProviderConfig.adapterOptions`), the following `OpenRouterAdapterOptions` are available:

```typescript
export interface OpenRouterAdapterOptions {
  apiKey: string;      // Required: Your OpenRouter API key
  model: string;       // Required: The OpenRouter model identifier string
  apiBaseUrl?: string;  // Optional: Override OpenRouter API base URL
  siteUrl?: string;     // Optional: Your app's site URL (HTTP-Referer header)
  appName?: string;     // Optional: Your app's name (X-Title header)
}
```

*   **`apiKey: string` (Required):** Your OpenRouter API key.
*   **`model: string` (Required):** The specific OpenRouter model identifier string. This tells OpenRouter which underlying model to use.
    *   Examples: `'google/gemini-flash-1.5'`, `'anthropic/claude-3-haiku'`, `'openai/gpt-4o'`, `'mistralai/mistral-7b-instruct'`.
    *   You can find a list of available models on the OpenRouter website.
    *   This `model` field in `OpenRouterAdapterOptions` acts as the **default model for this adapter configuration**. It can be overridden by `RuntimeProviderConfig.modelId` if you want to use a different OpenRouter model for a specific call, as long as the `providerName` in `RuntimeProviderConfig` still points to this OpenRouter adapter setup.
*   **`apiBaseUrl?: string` (Optional):** Allows overriding the default OpenRouter API base URL (`https://openrouter.ai/api/v1`).
*   **`siteUrl?: string` (Optional):** Your application's site URL. If provided, it will be sent as the `HTTP-Referer` header in API requests, which is recommended by OpenRouter for analytics and identifying your application.
*   **`appName?: string` (Optional):** Your application's name. If provided, it will be sent as the `X-Title` header, also recommended by OpenRouter.

**Example Configuration (`RuntimeProviderConfig.adapterOptions`):**

```typescript
// In CallOptions.providerConfig.adapterOptions
const openRouterAdapterOpts = {
    apiKey: process.env.OPENROUTER_API_KEY, // Required
    model: 'anthropic/claude-3-sonnet',     // Required: The specific model on OpenRouter
    siteUrl: 'https://my-art-app.com',
    appName: 'My ART Application'
};
```

## Prompt Translation (`ArtStandardPrompt` to OpenAI Format)

Since OpenRouter uses an OpenAI-compatible API, the `OpenRouterAdapter` translates `ArtStandardPrompt` to the OpenAI Chat Completions message format, similar to the `OpenAIAdapter`.

*   **Roles:**
    *   `system` (ART) -> `system` (OpenAI)
    *   `user` (ART) -> `user` (OpenAI)
    *   `assistant` (ART) -> `assistant` (OpenAI)
    *   `tool_result` (ART) -> `tool` (OpenAI), including `tool_call_id` and `content`.
*   **Content:**
    *   String content is passed directly.
    *   Non-string content for `user` or `system` is stringified with a warning.
    *   For `assistant` messages, `content` can be `null` if `tool_calls` are present.
*   **Tool Use:**
    *   **Tool Definition (`ToolSchema`):** Like the `DeepSeekAdapter` and `OpenAIAdapter` (raw fetch version), the current `OpenRouterAdapter` does **not** explicitly translate `ToolSchema` from `CallOptions.tools` into the `tools` parameter for the API call. Tool definitions, if required by the specific model being used via OpenRouter, would need to be part of the system prompt or user instructions.
    *   **Assistant Tool Calls (`ArtStandardMessage.tool_calls`):** Translated directly to the `tool_calls` array in the OpenAI message format.
    *   **Tool Results (`ArtStandardMessage` with `role: 'tool_result'`):** Translated to OpenAI messages with `role: 'tool'`, `tool_call_id`, and stringified `content`.

## Streaming and `StreamEvent` Generation

**Important: As of ART `v0.2.7`, streaming is NOT YET IMPLEMENTED for the `OpenRouterAdapter`.**

*   If `CallOptions.stream` is set to `true`, the adapter will:
    1.  Log a warning: `"OpenRouterAdapter: Streaming requested but not implemented. Returning error stream."`
    2.  Yield an `ERROR` `StreamEvent` with an `ARTError` indicating that streaming is not implemented.
    3.  Yield an `END` `StreamEvent`.
*   The call will effectively fail from a streaming perspective.

## Non-Streaming Behavior

When `CallOptions.stream` is `false` (or omitted):

1.  The adapter constructs the OpenAI-compatible payload, including the `model` specified in its options (or overridden by `RuntimeProviderConfig.modelId`).
2.  It makes a non-streaming HTTP POST request to the OpenRouter API endpoint (`${apiBaseUrl}/chat/completions`), including `HTTP-Referer` and `X-Title` headers if `siteUrl` and `appName` were provided in options.
3.  **Response Handling:**
    *   Parses the JSON response from OpenRouter.
    *   Extracts content from `response.choices[0].message.content`.
    *   Tool calls in the response (`response.choices[0].message.tool_calls`) are logged but not explicitly processed into the `TOKEN` data.
4.  **`StreamEvent` Yielding (Simulated Stream):**
    *   A single `TOKEN` `StreamEvent` with the trimmed text content. `tokenType` is based on `CallOptions.callContext`.
    *   A `METADATA` `StreamEvent` with `inputTokens`, `outputTokens` (from `response.usage`), and `stopReason`. OpenRouter responses often include detailed usage and sometimes cost information, which would be part of `providerRawUsage`.
    *   An `END` `StreamEvent`.

## Error Handling

*   **API Errors:** Non-200 status codes from the OpenRouter API are handled by attempting to parse an error message from the JSON response body (`error.message`). This is wrapped in an `ARTError` (ErrorCode: `LLM_PROVIDER_ERROR`).
*   **Invalid Response Structure:** Malformed 200 OK responses trigger an `ARTError`.
*   **Network Errors:** Fetch-related errors are caught and wrapped.
*   **Prompt Translation Errors:** Errors during prompt translation lead to an `ERROR` stream.
*   **Missing API Key/Model:** Constructor throws an error if `apiKey` or `model` is missing.

## Unique Features and Limitations

*   **Access to Many Models:** The primary advantage is leveraging OpenRouter's extensive catalog of LLMs through a single, consistent API interface.
*   **OpenAI Compatibility:** Relies on OpenRouter's OpenAI-compatible API.
*   **Recommended Headers:** Supports sending `HTTP-Referer` (`siteUrl`) and `X-Title` (`appName`) headers as recommended by OpenRouter.
*   **No Streaming (Current Limitation):** Streaming is not yet implemented.
*   **Basic Tool Call Handling:** Similar to `DeepSeekAdapter`, it translates outgoing `tool_calls` and `tool_result` messages but doesn't explicitly send `ToolSchema` definitions or process incoming tool calls into structured `TOKEN` data for non-streaming.