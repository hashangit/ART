# Key Interfaces in ART

The ART Framework is built upon a set of core interfaces that define the contracts between its various components. Understanding these interfaces is crucial for comprehending the framework's architecture and for extending its capabilities.

This page highlights some of the most important public interfaces. For a complete list and detailed TSDoc, refer to the source files, primarily `src/core/interfaces.ts` and `src/types/providers.ts`.

## 1. `IAgentCore`

*   **Source:** `src/core/interfaces.ts`
*   **Purpose:** Defines the central orchestration logic of an agent.
*   **Key Method:**
    *   `process(props: AgentProps): Promise<AgentFinalResponse>`: The main entry point to run the agent's reasoning cycle for a given user query.
*   **Implementations:** `PESAgent` is the default implementation. Developers can create custom agents by implementing this interface.

## 2. `ProviderAdapter` (extends `ReasoningEngine`)

*   **Source:** `src/core/interfaces.ts`
*   **Purpose:** Acts as a bridge between the ART framework and a specific Large Language Model (LLM) provider's API.
*   **Key Properties/Methods:**
    *   `providerName: string` (readonly): A unique identifier for the provider (e.g., "openai", "anthropic").
    *   `call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>`:
        *   Takes a standardized `ArtStandardPrompt`.
        *   Translates it into the provider-specific API format.
        *   Makes the API call to the LLM.
        *   Translates the provider's response (streaming or non-streaming) into an `AsyncIterable<StreamEvent>`.
    *   `shutdown?(): Promise<void>` (optional): For graceful cleanup of resources if needed.
*   **Implementations:** `OpenAIAdapter`, `AnthropicAdapter`, `GeminiAdapter`, `OllamaAdapter`, `OpenRouterAdapter`, `DeepSeekAdapter`.

## 3. `IToolExecutor`

*   **Source:** `src/core/interfaces.ts`
*   **Purpose:** Defines the contract for an executable tool that an agent can use.
*   **Key Properties/Methods:**
    *   `schema: ToolSchema` (readonly): Describes the tool's name, description, input parameters (using JSON Schema), output schema (optional), and examples. This schema is used by the LLM to decide when and how to use the tool, and by the `ToolSystem` for input validation.
    *   `execute(input: any, context: ExecutionContext): Promise<ToolResult>`: Contains the actual logic of the tool. Takes validated input and execution context, returns a `ToolResult`.
*   **Implementations:** `CalculatorTool` is a built-in example. Developers create custom tools by implementing this interface.

## 4. `StorageAdapter`

*   **Source:** `src/core/interfaces.ts`
*   **Purpose:** Provides a generic interface for persisting and retrieving data, abstracting the underlying storage mechanism.
*   **Key Methods:**
    *   `init?(config?: any): Promise<void>` (optional): For any setup the adapter needs (e.g., opening a database connection).
    *   `get<T>(collection: string, id: string): Promise<T | null>`: Retrieves an item.
    *   `set<T>(collection: string, id: string, data: T): Promise<void>`: Saves (creates or updates) an item.
    *   `delete(collection: string, id: string): Promise<void>`: Deletes an item.
    *   `query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>`: Queries items.
    *   `clearCollection?(collection: string): Promise<void>` (optional).
    *   `clearAll?(): Promise<void>` (optional).
*   **Implementations:** `InMemoryStorageAdapter`, `IndexedDBStorageAdapter`.

## 5. `ArtInstance`

*   **Source:** `src/core/interfaces.ts`
*   **Purpose:** Represents the fully initialized and configured ART Framework client instance. This is the main object returned by `createArtInstance` and is the primary way applications interact with the framework.
*   **Key Properties (readonly):**
    *   `process: IAgentCore['process']`: The main method to process a user query using the configured agent.
    *   `uiSystem: UISystem`: Accessor for the UI System, used to get sockets for subscriptions.
    *   `stateManager: StateManager`: Accessor for managing thread configuration and state.
    *   `conversationManager: ConversationManager`: Accessor for managing message history.
    *   `toolRegistry: ToolRegistry`: Accessor for managing available tools.
    *   `observationManager: ObservationManager`: Accessor for recording and retrieving observations.

## 6. `IProviderManager`

*   **Source:** `src/types/providers.ts`
*   **Purpose:** Manages the lifecycle and access to multiple `ProviderAdapter` implementations, enabling flexible LLM provider selection.
*   **Key Methods:**
    *   `getAvailableProviders(): string[]`: Returns a list of names for all configured (available) providers.
    *   `getAdapter(config: RuntimeProviderConfig): Promise<ManagedAdapterAccessor>`: The core method used by the `ReasoningEngine`. It takes a `RuntimeProviderConfig` (specifying which provider to use and its runtime options like API key and model ID) and returns a `ManagedAdapterAccessor`.
        *   `ManagedAdapterAccessor`: An object containing the `adapter` instance and a `release()` function that must be called when the adapter is no longer needed for the current operation.
*   **Implementations:** `ProviderManagerImpl`.

These interfaces form the backbone of the ART Framework, enabling its modular and extensible design. Developers working with ART will frequently interact with objects that implement these interfaces, either by using them directly or by providing their own custom implementations.