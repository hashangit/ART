# Advanced: Performance Tuning (Conceptual)

Optimizing the performance of an ART Framework application involves considering various factors, from the choice of underlying services (LLMs, storage) to the efficiency of your custom components and agent logic. This page offers conceptual guidance on areas to focus on for performance tuning.

## 1. LLM Interaction

LLM calls are often the most significant performance bottleneck.

*   **Model Selection (`RuntimeProviderConfig.modelId`):**
    *   **Latency vs. Capability:** Larger, more capable models (e.g., GPT-4o, Claude 3 Opus) generally have higher latency than smaller, faster models (e.g., GPT-3.5-Turbo, Claude 3 Haiku, Gemini Flash, local models like Llama 3 8B).
    *   **Task-Specific Models:** Choose the smallest, fastest model that can reliably perform the specific task (planning, synthesis, tool argument generation). You can use different models for different phases within `PESAgent` by providing different `RuntimeProviderConfig`s.
    *   **Fine-tuned Models:** For specific, repetitive tasks, fine-tuned models can sometimes offer better performance and accuracy than larger general-purpose models.
*   **Streaming (`CallOptions.stream: true`):**
    *   **Always enable streaming for user-facing LLM responses.** This dramatically improves *perceived* performance by showing tokens as they are generated.
    *   Streaming can also be beneficial for internal agent "thought" processes if you want to log or observe them in real-time.
*   **Prompt Engineering:**
    *   **Conciseness:** Shorter prompts (fewer input tokens) generally lead to faster responses and lower costs.
    *   **Clarity:** Well-structured prompts that clearly define the task and desired output format can reduce the need for the LLM to generate excessive "thinking" tokens or make multiple attempts.
    *   **Few-Shot Examples:** For complex tasks or tool usage, providing a few high-quality examples in the prompt can guide the LLM more effectively than lengthy instructions.
*   **`max_tokens` / `maxOutputTokens`:**
    *   Set a reasonable `max_tokens` limit for LLM responses to prevent unexpectedly long (and slow) generations, especially for planning or intermediate steps.
*   **Provider Latency:**
    *   Network latency to the LLM provider's API and the provider's own inference speed are factors. Choose providers or regions that offer lower latency if critical.
*   **`ProviderManager` Configuration:**
    *   `maxParallelApiInstancesPerProvider`: If your application makes many concurrent LLM calls to the same API provider, ensure this is set appropriately. Too low might cause queueing; too high might hit rate limits or increase costs unnecessarily.
    *   `apiInstanceIdleTimeoutSeconds`: A shorter timeout will evict idle adapter instances sooner, potentially freeing up resources but might lead to more cold starts (re-instantiation) if calls are infrequent but bursty.

## 2. Storage Adapter (`StorageAdapter`)

The choice and implementation of your `StorageAdapter` can impact performance, especially for agents with long conversation histories or frequent state updates.

*   **`InMemoryStorageAdapter`:** Fastest for reads and writes as it's all in memory. Suitable for testing or ephemeral agents. Not for production persistence.
*   **`IndexedDBStorageAdapter`:**
    *   Performance is generally good for typical browser use cases.
    *   **Querying:** The current `query()` method fetches all items for a collection (filtered by `threadId`) and then performs further filtering/sorting client-side. For very large histories or observation logs per thread, this could become slow.
        *   **Optimization:** For high-performance querying in IndexedDB, a custom adapter or an enhanced `IndexedDBStorageAdapter` would need to leverage IndexedDB indexes and cursors to perform filtering and sorting at the database level.
*   **Custom Remote Database Adapter:**
    *   Network latency to your database will be a factor.
    *   Database indexing is crucial for efficient `query()` operations. Ensure your adapter translates `FilterOptions` into optimized database queries.
    *   Connection pooling and management within your adapter can affect performance.

## 3. Agent Logic (`IAgentCore` - e.g., `PESAgent`)

*   **Minimize LLM Calls:** The `PESAgent` makes at least two LLM calls (plan, synthesize). If tools are used, it doesn't inherently add more LLM calls unless the *tools themselves* make LLM calls. Design agent flows to achieve goals with the fewest necessary LLM interactions.
*   **Efficient Context Gathering:**
    *   `historyLimit` in `ThreadConfig`: Keep this reasonable. Sending excessively long histories to the LLM increases token count and latency.
    *   Optimize how `availableTools` are described in prompts. Very long tool descriptions can bloat prompts.
*   **Tool Execution:**
    *   Tools that make network calls should be asynchronous and efficient.
    *   Avoid tools that perform very long-running computations synchronously, as this will block the agent's `process` method.
*   **State Management (`StateSavingStrategy`):**
    *   `'implicit'` strategy involves JSON stringification for snapshotting and comparison. For very large or complex `AgentState` objects that change frequently, this could add minor overhead. `'explicit'` gives more control if state saving is a bottleneck.

## 4. Asynchronous Operations

ART heavily uses `async/await`. Ensure your custom components (tools, adapters, agent cores) correctly use asynchronous patterns to avoid blocking the event loop, especially for I/O-bound operations.

## 5. Caching (Application Level)

Beyond the `ProviderManager`'s adapter caching:

*   **Tool Results:** If a tool is likely to be called with the same input and produce the same output, consider implementing caching within the tool executor itself or via a caching decorator.
*   **Frequently Accessed Configuration/Data:** If your agent frequently accesses static or slowly changing data, cache it at the application level rather than repeatedly fetching it.

## 6. Observability and Profiling

*   Use `LogLevel.DEBUG` and the `ObservationSystem` during development to understand where time is being spent.
*   Use browser or Node.js profiling tools to identify bottlenecks in your custom code or within framework components under load.

## 7. Client-Side UI Performance (for Streaming)

*   Efficiently render incoming `TOKEN` `StreamEvent`s. Avoid excessive DOM manipulations for each token. Virtual rendering or batching updates can help for very fast streams.
*   Debounce or throttle UI updates for frequent `Observation` events if they cause rendering jank.

Performance tuning is an iterative process. Start by identifying the most critical paths and potential bottlenecks in your specific application, then measure, optimize, and measure again.