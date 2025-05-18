# Gemini Adapter (`GeminiAdapter`)

The `GeminiAdapter` integrates Google's Gemini models into the ART Framework using the `@google/genai` SDK. It handles translation between ART's `ArtStandardPrompt` and the Gemini API's content format, supports streaming, and maps tool functionalities.

*   **Source:** `src/adapters/reasoning/gemini.ts`
*   **Implements:** `ProviderAdapter`

## Constructor Options

When configuring the `GeminiAdapter` (e.g., in `RuntimeProviderConfig.adapterOptions`), the following `GeminiAdapterOptions` are available:

```typescript
export interface GeminiAdapterOptions {
  apiKey: string; // Required
  model?: string; // Optional: Default Gemini model ID
  // apiBaseUrl and apiVersion are not directly used by the basic SDK setup
}
```

*   **`apiKey: string` (Required):** Your Google AI API key (e.g., from Google AI Studio).
*   **`model?: string` (Optional):** The default Gemini model ID to use (e.g., `'gemini-1.5-flash-latest'`, `'gemini-pro'`). If not provided, it defaults to `'gemini-1.5-flash-latest'`. This can be overridden by `RuntimeProviderConfig.modelId`.
*   **`apiBaseUrl?: string` / `apiVersion?: string` (Not directly used by basic SDK setup):** The `@google/genai` SDK typically handles endpoint resolution. These are included for structural consistency but may not have an effect with standard SDK usage.

**Example Configuration (`RuntimeProviderConfig.adapterOptions`):**

```typescript
// In CallOptions.providerConfig.adapterOptions
const geminiAdapterOpts = {
    apiKey: process.env.GEMINI_API_KEY, // Required
    model: 'gemini-2.5-pro-preview-05-06'      // Optional override
};
```

## Prompt Translation (`ArtStandardPrompt` to Gemini `Content[]`)

The `GeminiAdapter.translateToGemini()` method converts an `ArtStandardPrompt` into an array of `Content` objects suitable for the Gemini API:

*   **Roles:**
    *   `system` (ART): System prompt content is **prepended** to the content of the *first* `user` message in the sequence. Gemini doesn't have a separate top-level system prompt parameter in the same way as OpenAI or Anthropic for its `generateContent` history.
    *   `user` (ART) -> `user` (Gemini `Content.role`).
    *   `assistant` (ART) -> `model` (Gemini `Content.role`).
    *   `tool_result` (ART) -> `user` (Gemini `Content.role`). The content of this `user` message will be a `Part` object of type `functionResponse`.
*   **Content Structure:** Each message in `ArtStandardPrompt` is translated into a Gemini `Content` object, which has a `role` and an array of `Part`s.
    *   Text content from `ArtStandardMessage.content` becomes a `Part` with a `text` field.
    *   Non-string user content is stringified.
*   **Tool Use:**
    *   **Tool Definition (`ToolSchema` to Gemini `Tool`):** When `CallOptions.tools` (an array of `ToolSchema`) is provided, the adapter translates these into Gemini's `tools` format for function declaration. The `inputSchema` from ART's `ToolSchema` is used for Gemini's `parameters` schema.
    *   **Assistant Tool Calls (`ArtStandardMessage.tool_calls` to Gemini `functionCall` Part):**
        *   If an `assistant` message in `ArtStandardPrompt` contains `tool_calls`, these are translated into a `Part` object with a `functionCall` field within the corresponding `model` role `Content` object. Gemini expects `functionCall.args` to be an object, so the stringified JSON `arguments` from ART are parsed.
    *   **Tool Results (`ArtStandardMessage` with `role: 'tool_result'` to Gemini `functionResponse` Part):**
        *   An `ArtStandardMessage` with `role: 'tool_result'` (containing `tool_call_id`, `name` for the tool, and `content` as the stringified tool output) is translated into a `user` role `Content` object. This `Content` object will contain a single `Part` with a `functionResponse` field. The `functionResponse` includes the `name` of the tool and a `response` object, where `response.content` holds the tool's output from `ArtStandardMessage.content`.
*   **Message Order Validation:** The adapter ensures the conversation history sent to Gemini does not start with a `model` role, prepending a dummy `user` turn if necessary.

## Streaming and `StreamEvent` Generation

When `CallOptions.stream` is `true`, the `GeminiAdapter` uses the `genAI.models.generateContentStream()` method from the `@google/genai` SDK.

*   **Stream Consumption:** The adapter iterates over the stream returned by the SDK. Each chunk from the Gemini stream is a `GenerateContentResponse` object.
*   **`TOKEN` Events:**
    *   The `text()` method of each chunk is called to get the text delta. If text is present, a `TOKEN` `StreamEvent` is yielded.
    *   `tokenType` is set based on `CallOptions.callContext` (e.g., `AGENT_THOUGHT_LLM_RESPONSE`, `FINAL_SYNTHESIS_LLM_RESPONSE`). Gemini SDK does not provide a direct way to distinguish "thinking" tokens within a single stream response for more granular `tokenType`s.
*   **`METADATA` Events:**
    *   The Gemini SDK's streaming response might include `usageMetadata` (like `promptTokenCount`, `candidatesTokenCount`) and `finishReason` (from `chunk.candidates[0].finishReason`) in later chunks, particularly the last one.
    *   The adapter attempts to extract this information from the **last chunk** received from the stream to construct and yield a final `METADATA` `StreamEvent`. `timeToFirstTokenMs` and `totalGenerationTimeMs` are also calculated.
*   **`ERROR` Events:** Errors from the SDK during the stream or from processing chunks are caught and yielded as an `ERROR` `StreamEvent`.
*   **`END` Event:** Yielded after the stream is fully consumed or an error terminates it.

## Non-Streaming Behavior

If `CallOptions.stream` is `false`:

1.  The adapter calls `genAI.models.generateContent()` from the SDK.
2.  It processes the `GenerateContentResponse` object:
    *   Extracts text using `result.text()`.
    *   Gets `finishReason` from `result.candidates[0].finishReason`.
    *   Gets usage data from `result.usageMetadata`.
    *   Handles blocked content scenarios by checking `result.promptFeedback.blockReason`. If blocked, an `ERROR` event is yielded.
3.  **`StreamEvent` Yielding (Simulated Stream):**
    *   A single `TOKEN` `StreamEvent` with the full `responseText`.
    *   A `METADATA` `StreamEvent` with token counts, stop reason, and timing.
    *   An `END` `StreamEvent`.

## Error Handling

*   **SDK Errors:** Errors thrown by the `@google/genai` SDK (e.g., invalid API key, network issues) are caught and yielded as `ERROR` `StreamEvent`s (or thrown if occurring before stream generation).
*   **Blocked Content:** If the Gemini API blocks content due to safety settings (indicated by `response.promptFeedback.blockReason`), an `ERROR` `StreamEvent` is yielded with a message like "Gemini API call blocked: SAFETY".
*   **Invalid Response Structure:** If the SDK response is missing expected content (e.g., no text and not a tool call, or no candidates), an `ERROR` `StreamEvent` is yielded.
*   **Prompt Translation Errors:** Errors during `ArtStandardPrompt` to Gemini `Content[]` translation (e.g., a `tool_result` message missing `tool_call_id` or `name`) result in an `ERROR` stream before any API call.

## Unique Features and Limitations

*   **SDK Usage:** Relies entirely on the official `@google/genai` SDK for API interactions.
*   **System Prompt Handling:** System prompts are merged into the first user message.
*   **Tool Result Role:** `tool_result` messages are mapped to the `user` role with a `functionResponse` part, as per Gemini API requirements.
*   **No Distinct "Thinking" Tokens:** The adapter does not currently have a mechanism to identify and flag "thinking" tokens from Gemini streams beyond the `callContext` provided in `CallOptions`.