# Deep Dive: `ProviderManager`

The `ProviderManager` (implemented by `ProviderManagerImpl` in `src/providers/ProviderManagerImpl.ts`) is a cornerstone of the ART Framework's ability to support multiple Large Language Model (LLM) providers. It centralizes the management and access to different `ProviderAdapter` instances, enabling dynamic selection of LLMs at runtime.

## Purpose and Role

The `ProviderManager` serves several key functions:

1.  **Adapter Abstraction:** It decouples the `ReasoningEngine` from concrete `ProviderAdapter` implementations. The `ReasoningEngine` doesn't need to know how to instantiate or manage specific adapters; it simply requests one from the `ProviderManager`.
2.  **Lifecycle Management:** It handles the creation, caching, and eviction of `ProviderAdapter` instances to optimize resource usage and manage connections.
3.  **Configuration Hub:** It's configured at application startup with all *available* providers and their base settings, and then uses *runtime* configuration to select and prepare an adapter for a specific LLM call.
4.  **Constraint Enforcement:** It manages rules like concurrency limits for API-based providers and singleton behavior for local providers.

## Configuration

The `ProviderManager` relies on two types of configuration:

1.  **`ProviderManagerConfig` (`src/types/providers.ts`):**
    *   Provided once when the ART instance is created via `createArtInstance(artConfig)`.
    *   **`availableProviders: AvailableProviderEntry[]`**: An array defining each LLM provider the application *can* use.
        *   `name: string`: A unique identifier for this provider setup (e.g., "openai-gpt4o", "ollama-llama3"). This name is crucial for runtime selection.
        *   `adapter: new (options: any) => ProviderAdapter`: The constructor of the adapter class (e.g., `OpenAIAdapter`, `OllamaAdapter`).
        *   `isLocal?: boolean` (default: `false`): If `true`, the provider is treated as a local singleton (only one local provider type active at a time).
        *   `baseOptions?: any`: Rarely used; default options for the adapter if not overridden at runtime.
    *   **`maxParallelApiInstancesPerProvider?: number`** (default: `5`): Limits concurrent *active* instances for each non-local (API-based) provider `name`.
    *   **`apiInstanceIdleTimeoutSeconds?: number`** (default: `300`): How long an API-based adapter instance can be idle before being eligible for eviction.

2.  **`RuntimeProviderConfig` (`src/types/providers.ts`):**
    *   Provided dynamically within the `CallOptions` for each call to `ReasoningEngine.call()`.
    *   **`providerName: string`**: Must match one of the `name`s in `ProviderManagerConfig.availableProviders`. This selects which provider setup to use.
    *   **`modelId: string`**: The specific model ID for that provider (e.g., "gpt-4o-mini", "claude-3-opus-20240229").
    *   **`adapterOptions: any`**: Options passed directly to the selected adapter's constructor. This is where API keys, specific model parameters (if not set in `CallOptions`), or `baseURL` overrides are typically provided.

## Key Method: `getAdapter(config: RuntimeProviderConfig)`

This is the primary method used by the `ReasoningEngine`. It returns a `Promise<ManagedAdapterAccessor>`.

*   **`ManagedAdapterAccessor`**: An object containing:
    *   `adapter: ProviderAdapter`: The ready-to-use adapter instance.
    *   `release: () => void`: A function that **must** be called by the consumer (e.g., `ReasoningEngine`) once it's finished with the adapter for that particular LLM call. Releasing the adapter allows the `ProviderManager` to manage its state (e.g., mark as idle, make available for reuse, or queue processing).

**Internal Logic of `getAdapter()`:**

1.  **Signature Generation:** Creates a unique string signature based on `RuntimeProviderConfig` (providerName, modelId, sorted adapterOptions) for caching purposes.
2.  **Cache Check (Reuse Idle):**
    *   If an **idle** instance with the same signature exists in the cache, it's marked as **active**, its idle timer is cleared, and it's returned.
3.  **Local Provider Constraints:**
    *   If the requested provider is `isLocal: true`:
        *   **Conflict Check:** If another *different* local provider is currently **active**, throws `LocalProviderConflictError`.
        *   **Busy Check:** If the *same* local provider instance (same signature) is already **active** (i.e., obtained but not yet released), throws `LocalInstanceBusyError`.
        *   **Evict Other Idle Local:** If a *different* local provider is **idle**, that idle provider is evicted (shut down and removed) before proceeding to create the newly requested one. This ensures only one local provider instance (regardless of type) is managed at a time.
4.  **API Provider Concurrency Limits:**
    *   If the requested provider is *not* local:
        *   Counts the number of **active** instances for the *same provider name*.
        *   If this count reaches `maxParallelApiInstancesPerProvider`, the request is **queued**. The promise returned by `getAdapter` will resolve when an instance becomes available and this queued request is processed.
        *   *(Note: The `ProviderManagerImpl` does not currently implement a timeout for waiting in the queue itself; this would be an `ApiQueueTimeoutError` if implemented.)*
5.  **Instance Creation:**
    *   If no suitable idle instance is found and no constraints prevent it, a new `ProviderAdapter` instance is created using the constructor from `AvailableProviderEntry` and the `adapterOptions` from `RuntimeProviderConfig`.
    *   Throws `AdapterInstantiationError` if the adapter constructor fails.
6.  **Store and Return:**
    *   The new instance is marked as **active** and stored in the `managedInstances` map.
    *   A `ManagedAdapterAccessor` (containing the adapter and its `release` function) is returned.

## Releasing Adapters and Idle Eviction

*   **`release()` function:** When the `ReasoningEngine` finishes using an adapter (i.e., the LLM stream is fully consumed or an error occurs), it **must** call the `release()` function associated with that adapter instance.
*   **State Transition:** `release()` transitions the adapter's state in the `ProviderManager` from 'active' to 'idle'.
*   **Idle Timer (API Providers):** For non-local (API) providers, releasing an adapter starts an idle timer (`apiInstanceIdleTimeoutSeconds`). If the instance remains idle and the timer expires, the `_evictInstance` method is called.
*   **Eviction (`_evictInstance`):**
    *   Checks if the instance is still 'idle'.
    *   Calls the adapter's `shutdown()` method, if it exists, for graceful cleanup.
    *   Removes the instance from the `managedInstances` map.
*   **Queue Processing:** After an adapter is released, `_releaseAdapter` checks the `requestQueue`. If there are pending requests, it attempts to fulfill the oldest one by calling `getAdapter` again.

## Error Handling

The `ProviderManagerImpl` can throw several specific errors (extending `ARTError`):

*   `UnknownProviderError`: If `RuntimeProviderConfig.providerName` is not found in `availableProviders`.
*   `LocalProviderConflictError`: If attempting to activate a local provider while another is already active.
*   `LocalInstanceBusyError`: If attempting to get an already active local provider instance.
*   `AdapterInstantiationError`: If the adapter's constructor throws an error.

The `ProviderManager` is a sophisticated component that enables ART's powerful multi-LLM capabilities, balancing flexibility with resource management and operational constraints.