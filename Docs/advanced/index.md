# Advanced Topics

This section delves into more advanced concepts and customization options within the ART Framework, intended for developers looking to extend the framework or understand its deeper mechanics.

## Topics:

1.  **[Extending the Framework](./extending-the-framework.md)**
    *   Guidance on implementing custom `IAgentCore`, `ProviderAdapter`, `StorageAdapter`, and `IToolExecutor`.
    *   Best practices for creating new systems or managers.

2.  **[Performance Tuning (Conceptual)](./performance-tuning.md)**
    *   Considerations for optimizing agent performance.
    *   Impact of `StorageAdapter` choice (e.g., `InMemoryStorageAdapter` vs. `IndexedDBStorageAdapter` vs. custom remote DB adapter).
    *   LLM call optimization (prompt engineering, model selection via `ProviderManager`).
    *   Caching strategies (e.g., `ProviderManager`'s adapter caching, potential for application-level caching).
    *   Efficient querying with custom `StorageAdapter`s.

3.  **[Security Considerations](./security-considerations.md)**
    *   Managing API keys and sensitive configuration.
    *   Input validation for tool arguments (handled by `ToolSystem` using JSON Schema).
    *   Risks associated with tools that execute arbitrary code or interact with external systems.
    *   Data privacy considerations for persisted conversation history and agent state.
    *   Securing UI socket communication channels if exposed externally.

4.  **[Debugging ART Applications](./debugging-art-applications.md)**
    *   Leveraging the `Logger` and `LogLevels`.
    *   Using the `ObservationSystem` (`ObservationManager`, `ObservationSocket`) to trace agent execution.
    *   Inspecting data in `StorageAdapter` (e.g., using browser developer tools for IndexedDB).
    *   Tips for debugging LLM prompts and responses.

5.  **[Understanding ProviderManager Internals](./understanding-provider-manager.md)**
    *   A deeper look into `ProviderManagerImpl`'s logic for:
        *   Configuration signature generation.
        *   Adapter instance caching and pooling.
        *   Idle instance eviction.
        *   Local provider constraints (singleton, busy checks, eviction on switch).
        *   API provider concurrency limits and request queuing.
    *   Relevant for developers troubleshooting multi-provider setups or needing to understand resource management nuances.

These advanced topics provide further insight into how to make the most of the ART Framework's capabilities and tailor it to specific, complex requirements.
```

```markdown
docs/advanced/extending-the-framework.md
```
```markdown
# Advanced: Extending the Framework

The ART Framework is designed with extensibility in mind. Its modular architecture and reliance on interfaces allow developers to replace or augment core components with custom implementations to suit specific needs.

Here are the primary ways you can extend the ART Framework:

## 1. Implementing a Custom Agent Core (`IAgentCore`)

While `PESAgent` provides a robust Plan-Execute-Synthesize flow, you might require a different reasoning pattern (e.g., ReAct, or a highly specialized task-specific flow).

*   **Steps:**
    1.  Create a class that implements the `IAgentCore` interface (`src/core/interfaces.ts`).
    2.  Implement the `async process(props: AgentProps): Promise<AgentFinalResponse>` method. This method will contain your custom agent's orchestration logic.
    3.  Your agent's constructor should accept an object of dependencies it needs (e.g., `StateManager`, `ConversationManager`, `ReasoningEngine`, `ToolRegistry`, `ToolSystem`, `ObservationManager`, `UISystem`). These will be injected by the `AgentFactory`.
    4.  In `ArtInstanceConfig`, set the `agentCore` property to your custom agent class constructor:
        ```typescript
        // import { MyCustomAgent } from './my-custom-agent';
        const artConfig: ArtInstanceConfig = {
            // ...
            agentCore: MyCustomAgent,
            // ...
        };
        ```
*   **Considerations:**
    *   Ensure your custom agent correctly interacts with the standard ART systems for context, history, tools, LLM calls, observations, and UI notifications to maintain framework compatibility.
    *   Properly handle `AgentProps` and return a valid `AgentFinalResponse`.
    *   Manage state persistence according to the configured `StateSavingStrategy` or by explicitly calling `StateManager.setAgentState()`.
    *   See [How-To: Create a Custom Agent](../how-to/create-custom-agent.md).

## 2. Implementing a Custom LLM Provider Adapter (`ProviderAdapter`)

If you need to connect to an LLM provider not yet supported by ART's built-in adapters:

*   **Steps:**
    1.  Create a class that implements the `ProviderAdapter` interface (`src/core/interfaces.ts`).
    2.  Set the `readonly providerName: string` property to a unique identifier.
    3.  Implement the `async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>` method:
        *   Translate the input `ArtStandardPrompt` to the provider's native API request format.
        *   Make the API call to the LLM provider (handle authentication, streaming if supported).
        *   Translate the provider's response/stream back into an `AsyncIterable<StreamEvent>`.
        *   Correctly set `StreamEvent.tokenType` based on `CallOptions.callContext` and any provider-specific cues.
    4.  Optionally implement `async shutdown(): Promise<void>` for resource cleanup.
    5.  Add an entry for your custom adapter in `ArtInstanceConfig.providers.availableProviders`:
        ```typescript
        // import { MyCustomLlmAdapter } from './my-custom-llm-adapter';
        const artConfig: ArtInstanceConfig = {
            // ...
            providers: {
                availableProviders: [
                    { name: 'my-llm', adapter: MyCustomLlmAdapter, isLocal: false /* or true */ },
                    // ... other providers
                ],
                // ...
            },
            // ...
        };
        ```
*   **Considerations:**
    *   Thoroughly test prompt translation, especially for roles and tool/function calling constructs.
    *   Robustly handle API errors and map them to `ERROR` `StreamEvent`s with appropriate `ARTError` codes.
    *   Implement streaming correctly if the provider supports it.
    *   See [How-To: Add an LLM Provider Adapter](../how-to/add-llm-adapter.md).

## 3. Implementing a Custom Storage Adapter (`StorageAdapter`)

If you need to store ART data (conversations, observations, state) in a backend not supported by `InMemoryStorageAdapter` or `IndexedDBStorageAdapter` (e.g., a remote database, local files):

*   **Steps:**
    1.  Create a class that implements the `StorageAdapter` interface (`src/core/interfaces.ts`).
    2.  Implement all required methods: `get`, `set`, `delete`, `query`, and optionally `init`, `clearCollection`, `clearAll`.
    3.  Your adapter's constructor should accept any necessary configuration (e.g., connection strings, API keys).
    4.  In `ArtInstanceConfig.storage`, provide an instance of your custom adapter:
        ```typescript
        // import { MyCustomStorage } from './my-custom-storage';
        // const myDbConfig = { connection: '...' };
        // const customStorageAdapter = new MyCustomStorage(myDbConfig);
        // await customStorageAdapter.init(); // Initialize if needed

        const artConfig: ArtInstanceConfig = {
            // ...
            storage: customStorageAdapter, // Pass the instance
            // ...
        };
        ```
*   **Considerations:**
    *   The `query` method can be complex to implement efficiently. Translate `FilterOptions` into native queries for your backend.
    *   Ensure data is handled securely if connecting to remote databases.
    *   Repositories expect an `id` property on stored objects to be used as the key.
    *   See [How-To: Create a Custom Storage Adapter](../../components/adapters/custom-storage-adapter.md).

## 4. Implementing Custom Tools (`IToolExecutor`)

This is one of the most common ways to extend an agent's capabilities.

*   **Steps:**
    1.  Create a class that implements the `IToolExecutor` interface (`src/core/interfaces.ts`).
    2.  Define the `readonly schema: ToolSchema`, including `name`, `description`, and `inputSchema` (JSON Schema).
    3.  Implement the `async execute(input: any, context: ExecutionContext): Promise<ToolResult>` method with your tool's logic.
    4.  Instantiate your tool and add it to the `tools: IToolExecutor[]` array in `ArtInstanceConfig`.
*   **Considerations:**
    *   Input validation against `inputSchema` is handled by the `ToolSystem` before `execute` is called.
    *   Return a `ToolResult` indicating success or failure.
    *   Tools should be self-contained or manage their dependencies carefully.
    *   See [How-To: Define and Use Tools](../how-to/define-tools.md).

## 5. Creating New Systems or Managers (Advanced)

For more significant architectural changes or additions, you might consider creating entirely new systems or managers that adhere to ART's design principles (e.g., a new system for long-term memory that's more sophisticated than simple `AgentState`).

*   **Steps:**
    1.  Define clear interfaces for your new components.
    2.  Implement the components.
    3.  Modify `AgentFactory` (if you're customizing the core framework setup) or your application's setup logic to instantiate and inject these new components into your custom `IAgentCore` or other relevant parts of the system.
*   **Considerations:**
    *   This is a more advanced undertaking and requires a good understanding of ART's overall architecture.
    *   Aim for loose coupling and clear responsibilities.
    *   Consider how your new system will interact with existing ones like `ObservationManager` or `StateManager`.

By leveraging these extension points, you can adapt the ART Framework to a wide range of specific requirements and build highly customized AI agent solutions.