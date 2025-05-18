# Deep Dive: `ReasoningEngine`

The `ReasoningEngine` is the primary interface within ART's Reasoning System for interacting with Large Language Models (LLMs). It abstracts the complexities of different LLM provider APIs, allowing the agent core (like `PESAgent`) to make LLM calls in a standardized way. In ART `v0.2.7+`, the `ReasoningEngineImpl` achieves this by delegating calls to the `ProviderManager`.

*   **Source:** `src/systems/reasoning/ReasoningEngine.ts` (for `ReasoningEngineImpl`)
*   **Implements:** `ReasoningEngine` interface from `src/core/interfaces.ts`
*   **Dependencies:** `IProviderManager`.

## Constructor (`ReasoningEngineImpl`)

```typescript
constructor(providerManager: IProviderManager)
```

*   `providerManager`: An instance implementing `IProviderManager` (typically `ProviderManagerImpl`). The `ReasoningEngine` uses this manager to dynamically obtain `ProviderAdapter` instances at runtime.

## Core Method: `call`

*   **`async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>`**
    *   **Purpose:** To execute an LLM call using the provider and model specified in `options.providerConfig`.
    *   **Parameters:**
        *   `prompt: FormattedPrompt` (which is an alias for `ArtStandardPrompt`): The standardized prompt object (an array of `ArtStandardMessage`s) constructed by the agent logic.
        *   `options: CallOptions`: An object containing crucial information for the call:
            *   `threadId: string` (Required): The ID of the current conversation thread.
            *   `traceId?: string`: Optional trace ID for logging and correlation.
            *   `userId?: string`: Optional user ID.
            *   `sessionId?: string`: Optional UI session ID.
            *   `stream?: boolean`: If `true`, requests a streaming response from the LLM.
            *   `callContext?: 'AGENT_THOUGHT' | 'FINAL_SYNTHESIS' | string`: Indicates the purpose of the LLM call (e.g., for planning or for generating the final user-facing response). This helps adapters and stream consumers determine the `tokenType` for `TOKEN` `StreamEvent`s.
            *   **`providerConfig: RuntimeProviderConfig` (Required):** This is vital. It specifies:
                *   `providerName`: The name of the provider to use (must match an entry in `ProviderManagerConfig.availableProviders`).
                *   `modelId`: The specific model ID for the call.
                *   `adapterOptions`: Options to be passed to the adapter's constructor (e.g., API key, base URL).
            *   Other provider-specific parameters (e.g., `temperature`, `max_tokens`) can also be included in `options` and will be passed to the adapter.

    *   **Process:**
        1.  **Adapter Acquisition:**
            *   Extracts the `providerConfig` from `options`.
            *   Calls `await this.providerManager.getAdapter(providerConfig)` to obtain a `ManagedAdapterAccessor`. This accessor contains the ready-to-use `ProviderAdapter` instance and a `release()` function. The `ProviderManager` handles instance creation, caching, pooling, and local provider constraints.
        2.  **Delegation to Adapter:**
            *   Calls `await accessor.adapter.call(prompt, options)`, passing the `ArtStandardPrompt` and the full `CallOptions` to the selected adapter.
            *   The adapter translates the `ArtStandardPrompt` to its native format, makes the API call, and returns an `AsyncIterable<StreamEvent>`.
        3.  **Stream Wrapping & Release:**
            *   The `ReasoningEngine` wraps the `AsyncIterable<StreamEvent>` returned by the adapter in another async generator.
            *   This wrapper ensures that `accessor.release()` is called in a `finally` block. This is **critical** because it signals to the `ProviderManager` that the adapter instance is no longer in active use for this specific call, allowing it to be reused, managed by an idle timer, or for the `ProviderManager` to process queued requests. The release happens whether the stream is fully consumed, exited early (e.g., via `break`), or an error occurs during consumption.
        4.  **Return Value:** Returns the wrapped `AsyncIterable<StreamEvent>` to the caller (e.g., `PESAgent`).

    *   **Error Handling:**
        *   If `providerManager.getAdapter()` fails (e.g., unknown provider, local provider conflict, adapter instantiation error), the error is re-thrown by the `ReasoningEngine`.
        *   If `accessor.adapter.call()` itself throws an error (e.g., an immediate issue before streaming begins), the adapter is released, and the error is re-thrown.
        *   Errors occurring *during* the consumption of the stream (yielded as `ERROR` `StreamEvent`s by the adapter, or errors in the stream processing itself) are handled by the consuming async generator's `finally` block ensuring release, and the error propagates up to the caller of `ReasoningEngine.call()`.

## How it Fits into the ART Ecosystem

1.  **Agent Logic (e.g., `PESAgent`):**
    *   Constructs an `ArtStandardPrompt`.
    *   Defines `CallOptions`, including the crucial `providerConfig` to select the desired LLM and its settings for the current task (planning or synthesis).
    *   Calls `await reasoningEngine.call(prompt, options)`.
    *   Iterates over the returned `AsyncIterable<StreamEvent>` to process tokens, metadata, etc.

2.  **`ReasoningEngine`:**
    *   Receives the request.
    *   Uses `ProviderManager` to get the correct, configured `ProviderAdapter`.
    *   Delegates the actual LLM interaction to this adapter.
    *   Ensures the adapter is released after use.

3.  **`ProviderManager`:**
    *   Manages the pool of available adapter instances.
    *   Provides an instance based on `RuntimeProviderConfig`.

4.  **`ProviderAdapter` (e.g., `OpenAIAdapter`, `AnthropicAdapter`):**
    *   Translates `ArtStandardPrompt` to its specific API format.
    *   Calls the LLM provider's API.
    *   Translates the provider's response/stream into `AsyncIterable<StreamEvent>`.

The `ReasoningEngine` provides a clean and consistent interface for making LLM calls, while the underlying `ProviderManager` and `ProviderAdapter` system handles the complexities of interacting with diverse LLM providers. This design is key to ART's flexibility and provider-agnostic nature.