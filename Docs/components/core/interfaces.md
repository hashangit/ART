# Core Interfaces (`src/core/interfaces.ts`)

The `src/core/interfaces.ts` file defines the fundamental contracts for the major components within the ART Framework. Implementing these interfaces allows for custom components to be seamlessly integrated into the framework.

Below is a summary of the key public interfaces found in this file. For detailed TSDoc and specific method signatures, please refer directly to the source code.

*   **`IAgentCore`**:
    *   **Purpose:** The central orchestrator of an agent's reasoning and action cycle.
    *   **Key Method:** `process(props: AgentProps): Promise<AgentFinalResponse>`
    *   **Implementations:** `PESAgent`

*   **`ReasoningEngine`**:
    *   **Purpose:** Handles interaction with Large Language Models (LLMs). In ART `v0.2.7+`, this interface is primarily fulfilled by the `ReasoningEngineImpl` which uses `IProviderManager` to get specific provider adapters.
    *   **Key Method:** `call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>`
        *   Note: `FormattedPrompt` is an alias for `ArtStandardPrompt`.
    *   **Implementations:** `ReasoningEngineImpl` which delegates to `ProviderAdapter`s.

*   **`PromptManager`**:
    *   **Purpose:** Manages prompt fragments and validates constructed prompt objects.
    *   **Key Methods:**
        *   `getFragment(name: string, context?: Record<string, any>): string`
        *   `validatePrompt(prompt: ArtStandardPrompt): ArtStandardPrompt`
    *   **Implementations:** `PromptManagerImpl`

*   **`OutputParser`**:
    *   **Purpose:** Extracts structured information from raw LLM string outputs.
    *   **Key Methods:**
        *   `parsePlanningOutput(output: string): Promise<{ intent?: string; plan?: string; toolCalls?: ParsedToolCall[]; thoughts?: string; }>`
        *   `parseSynthesisOutput(output: string): Promise<string>`
    *   **Implementations:** `OutputParserImpl`

*   **`ProviderAdapter` (extends `ReasoningEngine`)**:
    *   **Purpose:** Adapts ART's standard prompt/event formats to a specific LLM provider's API.
    *   **Key Properties/Methods:**
        *   `providerName: string` (readonly)
        *   `call(...)`: Implements the actual LLM API interaction.
        *   `shutdown?(): Promise<void>` (optional)
    *   **Implementations:** `OpenAIAdapter`, `AnthropicAdapter`, `GeminiAdapter`, `OllamaAdapter`, etc.

*   **`IToolExecutor`**:
    *   **Purpose:** Defines the contract for an executable tool.
    *   **Key Properties/Methods:**
        *   `schema: ToolSchema` (readonly)
        *   `execute(input: any, context: ExecutionContext): Promise<ToolResult>`
    *   **Implementations:** `CalculatorTool`, custom user-defined tools.

*   **`ToolRegistry`**:
    *   **Purpose:** Manages the registration and retrieval of tool executors.
    *   **Key Methods:**
        *   `registerTool(executor: IToolExecutor): Promise<void>`
        *   `getToolExecutor(toolName: string): Promise<IToolExecutor | undefined>`
        *   `getAvailableTools(filter?: { enabledForThreadId?: string }): Promise<ToolSchema[]>`
    *   **Implementations:** `ToolRegistryImpl`

*   **`ToolSystem`**:
    *   **Purpose:** Orchestrates the execution of a sequence of tool calls.
    *   **Key Method:** `executeTools(toolCalls: ParsedToolCall[], threadId: string, traceId?: string): Promise<ToolResult[]>`
    *   **Implementations:** `ToolSystemImpl`

*   **`StateManager`**:
    *   **Purpose:** Manages thread-specific configuration (`ThreadConfig`) and state (`AgentState`).
    *   **Key Methods:**
        *   `loadThreadContext(threadId: string, userId?: string): Promise<ThreadContext>`
        *   `isToolEnabled(threadId: string, toolName: string): Promise<boolean>`
        *   `getThreadConfigValue<T>(threadId: string, key: string): Promise<T | undefined>`
        *   `saveStateIfModified(threadId: string): Promise<void>`
        *   `setThreadConfig(threadId: string, config: ThreadConfig): Promise<void>`
        *   `setAgentState(threadId: string, state: AgentState): Promise<void>`
    *   **Implementations:** `StateManagerImpl`

*   **`ConversationManager`**:
    *   **Purpose:** Manages conversation history (`ConversationMessage`).
    *   **Key Methods:**
        *   `addMessages(threadId: string, messages: ConversationMessage[]): Promise<void>`
        *   `getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]>`
    *   **Implementations:** `ConversationManagerImpl`

*   **`ObservationManager`**:
    *   **Purpose:** Manages the recording and retrieval of agent execution observations.
    *   **Key Methods:**
        *   `record(observationData: Omit<Observation, 'id' | 'timestamp' | 'title'>): Promise<void>`
        *   `getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]>`
    *   **Implementations:** `ObservationManagerImpl`

*   **`TypedSocket<DataType, FilterType = any>`**:
    *   **Purpose:** A generic publish/subscribe mechanism for UI or inter-component communication.
    *   **Key Methods:**
        *   `subscribe(callback: (data: DataType) => void, filter?: FilterType, options?: { threadId?: string }): UnsubscribeFunction`
        *   `notify(data: DataType, options?: { targetThreadId?: string; targetSessionId?: string }, filterCheck?: (data: DataType, filter?: FilterType) => boolean): void`
        *   `getHistory?(...)`: Optional method for historical data.
    *   **Implementations:** This is a base class. `ObservationSocket`, `ConversationSocket`, `LLMStreamSocket` extend it.

*   **`ObservationSocket` (extends `TypedSocket`)**:
    *   Specialized for `Observation` data.

*   **`ConversationSocket` (extends `TypedSocket`)**:
    *   Specialized for `ConversationMessage` data.

*   **`UISystem`**:
    *   **Purpose:** Provides access to the various UI communication sockets.
    *   **Key Methods:**
        *   `getObservationSocket(): ObservationSocket`
        *   `getConversationSocket(): ConversationSocket`
        *   `getLLMStreamSocket(): LLMStreamSocket`
    *   **Implementations:** `UISystemImpl`

*   **`StorageAdapter`**:
    *   **Purpose:** Generic interface for data persistence.
    *   **Key Methods:** `init?`, `get`, `set`, `delete`, `query`, `clearCollection?`, `clearAll?`
    *   **Implementations:** `InMemoryStorageAdapter`, `IndexedDBStorageAdapter`.

*   **`IConversationRepository`**:
    *   **Purpose:** Repository for `ConversationMessage` data, using a `StorageAdapter`.
    *   **Implementations:** `ConversationRepository`

*   **`IObservationRepository`**:
    *   **Purpose:** Repository for `Observation` data, using a `StorageAdapter`.
    *   **Implementations:** `ObservationRepository`

*   **`IStateRepository`**:
    *   **Purpose:** Repository for `ThreadContext` (config and state), using a `StorageAdapter`.
    *   **Implementations:** `StateRepository`

*   **`ArtInstance`**:
    *   **Purpose:** The main object returned by `createArtInstance`, providing top-level access to the framework's capabilities.
    *   **Key Properties (readonly):** `process`, `uiSystem`, `stateManager`, `conversationManager`, `toolRegistry`, `observationManager`.

These interfaces define the contracts that allow ART's components to interact in a decoupled and extensible manner.