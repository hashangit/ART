# Provider Management in ART

The ART Framework is designed to be LLM provider-agnostic, allowing developers to easily switch between or even use multiple Large Language Models (e.g., OpenAI, Anthropic, Gemini, local models via Ollama) within the same application. This flexibility is primarily achieved through the **`ProviderManager`** and the **`ProviderAdapter`** pattern.

## Introduction to `ProviderManager`

The `ProviderManager` (implementing the `IProviderManager` interface from `src/types/providers.ts`) is a crucial component in ART's reasoning system. Its main responsibilities are:

1.  **Centralized Adapter Access:** It acts as a single point of contact for the `ReasoningEngine` to obtain instances of `ProviderAdapter`s.
2.  **Lifecycle Management:** It manages the creation, caching/pooling, and potential eviction of `ProviderAdapter` instances.
3.  **Configuration Handling:** It uses two levels of configuration:
    *   `ProviderManagerConfig`: Provided once when initializing the ART instance via `createArtInstance`. This defines all *available* providers and their base settings.
    *   `RuntimeProviderConfig`: Passed in `CallOptions` for each specific LLM call. This tells the `ProviderManager` *which* provider to use for that call and provides any necessary runtime options (like API keys or model overrides).
4.  **Constraint Enforcement:** It handles specific constraints, especially for local providers (e.g., ensuring only one local provider is active at a time).

The primary implementation is `ProviderManagerImpl` found in `src/providers/ProviderManagerImpl.ts`.

## Configuration

### 1. `ProviderManagerConfig`

This configuration is part of the main `ArtInstanceConfig` and is provided when you call `createArtInstance`. It tells the `ProviderManager` about all the LLM providers your application *might* use.

**Key Fields:**

*   `availableProviders`: An array of `AvailableProviderEntry` objects. Each entry defines:
    *   `name`: A unique string identifier for this provider setup (e.g., "openai-main", "anthropic-claude3", "ollama-llama3"). This name is used in `RuntimeProviderConfig` to select it.
    *   `adapter`: The constructor of the `ProviderAdapter` class (e.g., `OpenAIAdapter`, `AnthropicAdapter`).
    *   `isLocal` (Optional, default: `false`): A boolean indicating if the provider is running locally (e.g., Ollama, LMStudio). Local providers typically have singleton behavior (only one active instance across all local provider types).
    *   `baseOptions` (Optional): Rarely used. Base options that might be passed to the adapter constructor if not overridden by `RuntimeProviderConfig.adapterOptions`.
*   `maxParallelApiInstancesPerProvider` (Optional, default: `5`): The maximum number of *active* adapter instances allowed concurrently for a single non-local (API-based) provider `name`. If this limit is reached, subsequent requests for that provider may be queued.
*   `apiInstanceIdleTimeoutSeconds` (Optional, default: `300`): The time (in seconds) an adapter instance for an API-based provider can remain idle in the cache before it's eligible for eviction (and its `shutdown()` method is called, if available).

**Example `ProviderManagerConfig`:**

```typescript
// Part of ArtInstanceConfig
// import { OpenAIAdapter, AnthropicAdapter, OllamaAdapter } from 'art-framework';

const providerManagerConfig = {
    availableProviders: [
        {
            name: 'openai-gpt4o',
            adapter: OpenAIAdapter, // from 'art-framework'
            isLocal: false,
        },
        {
            name: 'anthropic-haiku',
            adapter: AnthropicAdapter, // from 'art-framework'
            isLocal: false,
        },
        {
            name: 'ollama-local-llama3',
            adapter: OllamaAdapter, // from 'art-framework'
            isLocal: true, // Mark as a local provider
        }
    ],
    maxParallelApiInstancesPerProvider: 3,
    apiInstanceIdleTimeoutSeconds: 180,
};
```

### 2. `RuntimeProviderConfig`

This configuration is provided dynamically within the `CallOptions` object passed to `ReasoningEngine.call()` (and subsequently to `ProviderManager.getAdapter()`). It specifies exactly which provider to use for *that specific LLM call* and provides the necessary options for the adapter.

**Key Fields:**

*   `providerName`: A string that **must match** one of the `name`s defined in `ProviderManagerConfig.availableProviders`.
*   `modelId`: The specific model identifier to be used for this call (e.g., "gpt-4o-mini", "claude-3-haiku-20240307", "llama3:latest").
*   `adapterOptions`: An object containing options required by the selected adapter's constructor. This typically includes the `apiKey`, and can also include other settings like `temperature` (though these can also be passed directly in `CallOptions`), `baseURL` overrides, etc.

**Example `RuntimeProviderConfig` (within `CallOptions`):**

```typescript
// Passed to reasoningEngine.call(prompt, callOptions)
const callOptions = {
    threadId: "thread-123",
    stream: true,
    providerConfig: { // This is the RuntimeProviderConfig
        providerName: 'openai-gpt4o', // Selects the 'openai-gpt4o' entry from availableProviders
        modelId: 'gpt-4o-mini',
        adapterOptions: {
            apiKey: process.env.OPENAI_API_KEY, // API key provided at runtime
            // temperature: 0.7 // Can also be set here or directly in CallOptions
        }
    },
    // temperature: 0.7 // Can also be set here
};
```

## Key Features of `ProviderManagerImpl`

1.  **Adapter Instantiation and Caching:**
    *   When `getAdapter(runtimeConfig)` is called, the `ProviderManagerImpl` first generates a unique `configSignature` based on the `runtimeConfig` (providerName, modelId, sorted adapterOptions).
    *   It checks if an **idle** instance with the same signature already exists in its cache. If so, it reuses that instance.
    *   If no suitable idle instance is found, it creates a new one using the `adapter` constructor from `AvailableProviderEntry` and the `adapterOptions` from `RuntimeProviderConfig`.
    *   The new instance is marked as **active** and stored.

2.  **Managed Adapter Accessor (`ManagedAdapterAccessor`):**
    *   `getAdapter()` returns a `Promise<ManagedAdapterAccessor>`.
    *   The `ManagedAdapterAccessor` object contains:
        *   `adapter`: The ready-to-use `ProviderAdapter` instance.
        *   `release()`: A function that **must be called** by the consumer (e.g., `ReasoningEngine`) once it's finished using the adapter for that specific call. Releasing an adapter marks it as 'idle' and makes it available for reuse or eviction.

3.  **Idle Instance Eviction (for API providers):**
    *   When an API-based adapter is released, an idle timer starts (based on `apiInstanceIdleTimeoutSeconds`).
    *   If the instance remains idle and the timeout expires, it's evicted from the cache, and its `shutdown()` method (if defined on the adapter) is called. This helps manage resources.

4.  **Local Provider Constraints:**
    *   **Singleton Behavior:** If an adapter is marked with `isLocal: true` in `AvailableProviderEntry`, the `ProviderManagerImpl` enforces that only *one* local provider instance can be active across *all* local provider types at any given time.
        *   If you request a local provider (`ollama-local-llama3`) while another local provider (`lmstudio-mistral`) is already active, it will throw a `LocalProviderConflictError`.
        *   If you request the *same* local provider instance while it's already active (i.e., not yet released from a previous call), it will throw a `LocalInstanceBusyError`.
    *   **Eviction on Switch:** If an idle local provider instance exists (e.g., `ollama-local-llama3` was used and released) and you request a *different* local provider (e.g., `lmstudio-mistral`), the `ProviderManagerImpl` will first evict (shutdown and remove) the idle `ollama-local-llama3` instance before creating the new `lmstudio-mistral` instance.

5.  **Concurrency Limiting & Queuing (for API providers):**
    *   The `maxParallelApiInstancesPerProvider` setting limits how many active instances can exist simultaneously for a given API provider *name* (e.g., if "openai-gpt4o" and "openai-gpt3.5" are two entries under the conceptual "openai" provider, this limit applies *per entry name*).
    *   If this limit is reached for an API provider, new requests for that provider are queued.
    *   When an active instance for that provider is released, the `ProviderManagerImpl` attempts to process the next request from its queue.
    *   *(Note: The plan mentions an `ApiQueueTimeoutError`, but its implementation detail for timeout handling in the queue itself might vary or be a future enhancement.)*

6.  **Error Handling:**
    *   `UnknownProviderError`: Thrown if `RuntimeProviderConfig.providerName` doesn't match any `name` in `availableProviders`.
    *   `AdapterInstantiationError`: Thrown if creating a new adapter instance fails (e.g., constructor throws an error).
    *   `LocalProviderConflictError`, `LocalInstanceBusyError`: As described above for local providers.

## How `ReasoningEngine` Uses `ProviderManager`

The `ReasoningEngine` is the primary consumer of the `ProviderManager`.

```typescript
// Simplified flow in ReasoningEngine.call()

async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const providerConfig = options.providerConfig; // Must be present
    if (!providerConfig) {
        throw new Error("CallOptions must include 'providerConfig'.");
    }

    let accessor: ManagedAdapterAccessor;
    try {
        accessor = await this.providerManager.getAdapter(providerConfig);
    } catch (error) {
        throw error;
    }

    try {
        const streamResult = await accessor.adapter.call(prompt, options);

        // Wrap the stream to ensure release is called
        return (async function*() {
            try {
                for await (const event of streamResult) {
                    yield event;
                }
            } finally {
                accessor.release(); // CRITICAL: Release the adapter
            }
        })();
    } catch (error) {
        accessor.release();
        throw error;
    }
}
```

By using the `ProviderManager`, ART allows developers to define a suite of potential LLM backends and dynamically choose the appropriate one at runtime for each agent interaction, promoting flexibility and efficient resource management.