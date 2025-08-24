# Glossary of ART Framework Terms

This glossary defines key terms and concepts used within the ART (Agent-Reasoning-Tooling) Framework documentation and codebase.

---

**A**

*   **Adapter (`ProviderAdapter`, `StorageAdapter`)**
    *   A component that bridges the ART Framework's standard interfaces with the specific APIs or mechanisms of an external service (e.g., an LLM provider, a database).
    *   _See also: [ProviderAdapter](#provideradapter), [StorageAdapter](#storageadapter)_

*   **Agent Core (`IAgentCore`)**
    *   The central orchestrator of an agent's decision-making and action cycle. Responsible for processing user input, interacting with various ART systems, and producing a final response.
    *   _Example: `PESAgent`_

*   **`AgentFactory`**
    *   An internal class responsible for instantiating and wiring together all core ART components based on `ArtInstanceConfig`. Used by `createArtInstance`.

*   **`AgentFinalResponse`**
    *   The structured output from an `IAgentCore.process()` call, containing the final `ConversationMessage` from the AI and `ExecutionMetadata`.

*   **`AgentProps`**
    *   The input object for `IAgentCore.process()`, containing the user's `query`, `threadId`, and other optional parameters like `options` (which includes `RuntimeProviderConfig`).

*   **`AgentState`**
    *   Persistent, application-defined data associated with an agent's operation within a specific `ThreadContext`. Managed by `StateManager`.

*   **`ArtInstance`**
    *   The main object returned by `createArtInstance`, providing the primary interface for interacting with the initialized ART framework (e.g., `art.process()`, `art.uiSystem`).

*   **`ArtInstanceConfig`**
    *   The primary configuration object passed to `createArtInstance`. It defines storage, LLM providers (via `ProviderManagerConfig`), initial tools, agent core implementation, state saving strategy, and logger settings.

*   **`ArtStandardMessage`**
    *   A standardized object structure representing a single message within a prompt (e.g., with `role`, `content`, `tool_calls`). Used to build an `ArtStandardPrompt`.

*   **`ArtStandardPrompt`**
    *   An array of `ArtStandardMessage` objects. This is ART's universal, provider-agnostic format for representing the full sequence of messages to be sent to an LLM. Adapters translate this into provider-specific formats.

*   **`AvailableProviderEntry`**
    *   An entry within `ProviderManagerConfig` defining a specific LLM provider adapter that can be used, including its `name`, `adapter` class, and `isLocal` flag.

**C**

*   **`CalculatorTool`**
    *   A built-in tool for evaluating mathematical expressions.

*   **`CallOptions`**
    *   An object passed to `ReasoningEngine.call()` and `ProviderAdapter.call()`, containing `threadId`, `stream` preference, `callContext`, and the crucial `RuntimeProviderConfig` for selecting and configuring the LLM for that specific call.

*   **Context System**
    *   A conceptual grouping of ART components responsible for managing conversation history (`ConversationManager`, `ConversationRepository`), thread configuration and state (`StateManager`, `StateRepository`), and potentially dynamic context retrieval (`ContextProvider`).

*   **`ConversationManager`**
    *   Manages the retrieval and addition of `ConversationMessage`s for threads, interacting with `ConversationRepository` and notifying `ConversationSocket`.

*   **`ConversationMessage`**
    *   An object representing a single message in a conversation thread, with properties like `messageId`, `threadId`, `role`, `content`, `timestamp`.

*   **`ConversationRepository`**
    *   Persists and retrieves `ConversationMessage`s using a `StorageAdapter`.

*   **`ConversationSocket`**
    *   A `TypedSocket` for broadcasting new `ConversationMessage`s to UI subscribers.

*   **`createArtInstance`**
    *   The main factory function used to initialize and configure a complete ART framework instance.

**E**

*   **`ErrorCode`**
    *   An enum defining standardized error codes for issues within the ART framework (e.g., `INVALID_CONFIG`, `LLM_PROVIDER_ERROR`).

*   **`ExecutionMetadata`**
    *   Data summarizing an agent's execution cycle, including `status`, `duration`, `llmCalls`, `toolCalls`, and `error` messages. Part of `AgentFinalResponse`.

*   **`ExecutionContext`**
    *   Contextual information (like `threadId`, `traceId`) passed to an `IToolExecutor.execute()` method.

**F**

*   **`FilterOptions`**
    *   Generic options for querying data from a `StorageAdapter`, including `filter`, `sort`, `limit`, and `skip`.

*   **`FormattedPrompt`**
    *   Deprecated name for `ArtStandardPrompt`. Prefer `ArtStandardPrompt` in all code and docs. Existing references should be read as `ArtStandardPrompt`.

**I**

*   **`IAgentCore`**
    *   The interface defining the main contract for an agent's orchestration logic.

*   **`IndexedDBStorageAdapter`**
    *   A `StorageAdapter` implementation that uses the browser's IndexedDB for persistent client-side storage.

*   **`InMemoryStorageAdapter`**
    *   A `StorageAdapter` implementation that stores data in memory; data is lost when the session ends.

*   **`IToolExecutor`**
    *   The interface that all tools must implement, defining a `schema` and an `execute` method.

*   **`IProviderManager`**
    *   The interface for the `ProviderManager`, responsible for managing and providing access to `ProviderAdapter` instances.

**J**

*   **`JsonSchema`**
    *   A type representing a JSON Schema object, used primarily for defining `ToolSchema.inputSchema` and `ToolSchema.outputSchema`.

**L**

*   **`LLMMetadata`**
    *   Metadata about an LLM call, such as token counts and stop reason, often part of a `METADATA` `StreamEvent`.

*   **`LLMStreamSocket`**
    *   A `TypedSocket` for broadcasting `StreamEvent`s (tokens, metadata, errors) from LLM calls to UI subscribers.

*   **`Logger`**
    *   A static utility class for console logging at different levels (`DEBUG`, `INFO`, `WARN`, `ERROR`).

*   **`LogLevel`**
    *   An enum defining the severity levels for the `Logger`.

**M**

*   **`ManagedAdapterAccessor`**
    *   An object returned by `ProviderManager.getAdapter()`, containing a `ProviderAdapter` instance and a `release()` function.

*   **`MessageRole`**
    *   An enum defining the role of a sender in a `ConversationMessage` (`USER`, `AI`, `SYSTEM`, `TOOL`).

**O**

*   **Observation**
    *   A record of a significant event occurring during an agent's execution, with a `type`, `title`, `content`, etc.

*   **`ObservationManager`**
    *   Manages the recording and retrieval of `Observation`s, interacting with `ObservationRepository` and notifying `ObservationSocket`.

*   **`ObservationRepository`**
    *   Persists and retrieves `Observation`s using a `StorageAdapter`.

*   **`ObservationSocket`**
    *   A `TypedSocket` for broadcasting new `Observation`s to UI subscribers.

*   **`ObservationType`**
    *   An enum categorizing the type of an `Observation` (e.g., `INTENT`, `PLAN`, `TOOL_EXECUTION`, `ERROR`).

*   **`OutputParser`**
    *   A component in the Reasoning System responsible for parsing raw LLM string outputs into structured data (e.g., extracting intent, plan, tool calls, and `<think>` tag content).

**P**

*   **`ParsedToolCall`**
    *   A structured representation of an LLM's request to call a tool, as parsed by `OutputParser`. Contains `callId`, `toolName`, and `arguments`.

*   **`PESAgent` (Plan-Execute-Synthesize Agent)**
    *   The default `IAgentCore` implementation in ART, following a three-stage process.

*   **`PromptManager`**
    *   A component in the Reasoning System that provides access to named prompt fragments (`getFragment`) and validates `ArtStandardPrompt` objects (`validatePrompt`).

*   **`ProviderAdapter`**
    *   An adapter that implements `ReasoningEngine` to connect ART to a specific LLM provider's API (e.g., `OpenAIAdapter`, `AnthropicAdapter`).

*   **`ProviderManager` (`IProviderManager`, `ProviderManagerImpl`)**
    *   Manages the lifecycle and access to multiple `ProviderAdapter`s, enabling dynamic LLM selection.

*   **`ProviderManagerConfig`**
    *   Configuration for the `ProviderManager`, defining all `availableProviders` and global settings like concurrency limits. Passed in `ArtInstanceConfig`.

**R**

*   **Reasoning System**
    *   A conceptual grouping of ART components responsible for LLM interactions (`ReasoningEngine`, `ProviderManager`, `ProviderAdapter`, `PromptManager`, `OutputParser`).

*   **`ReasoningEngine`**
    *   The interface (and its implementation `ReasoningEngineImpl`) used by agents to make calls to LLMs. It delegates to the `ProviderManager` to get an appropriate `ProviderAdapter`.

*   **`RuntimeProviderConfig`**
    *   Configuration passed in `CallOptions` for a *specific* LLM call, specifying the `providerName`, `modelId`, and `adapterOptions` (like API key).

**S**

*   **`StateSavingStrategy`**
    *   A configuration option ('explicit' or 'implicit') in `ArtInstanceConfig` that determines how `AgentState` is persisted by the `StateManager`.

*   **`StateManager`**
    *   Manages `ThreadConfig` and `AgentState` for conversation threads, interacting with `StateRepository` and respecting the `StateSavingStrategy`.

*   **`StateRepository`**
    *   Persists and retrieves `ThreadContext` (which includes `ThreadConfig` and `AgentState`) using a `StorageAdapter`.

*   **Storage System**
    *   A conceptual grouping for data persistence, primarily the `StorageAdapter` interface and its implementations.

*   **`StorageAdapter`**
    *   An interface for abstracting data storage operations (get, set, delete, query). Implemented by `InMemoryStorageAdapter`, `IndexedDBStorageAdapter`.

*   **`StreamEvent`**
    *   A standardized object (`type`, `data`, `tokenType?`, `threadId`, etc.) representing a chunk of data from an LLM's streaming response.

**T**

*   **`<think>` Tags**
    *   XML-like tags (`<think>...</think>`) that can be used in LLM prompts to encourage the model to output its reasoning steps. `OutputParser` extracts content from these tags.

*   **`ThreadConfig`**
    *   Configuration specific to a conversation thread, including default `providerConfig`, `enabledTools`, and `historyLimit`.

*   **`ThreadContext`**
    *   An object bundling the `ThreadConfig` and `AgentState` for a specific thread.

*   **Tool**
    *   An external capability or action an agent can use, implemented via `IToolExecutor`.

*   **Tool System**
    *   A conceptual grouping of ART components for tool management and execution (`ToolRegistry`, `ToolSystem`, `IToolExecutor`).

*   **`ToolRegistry`**
    *   Manages the registration and retrieval of `IToolExecutor` instances.

*   **`ToolResult`**
    *   The standardized output from an `IToolExecutor.execute()` call, indicating `status` (success/error), `output` data, or an `error` message.

*   **`ToolSchema`**
    *   Metadata describing a tool, including its `name`, `description`, and `inputSchema` (JSON Schema).

*   **`ToolSystem`**
    *   Orchestrates the execution of `ParsedToolCall`s, including verification, validation, and calling the tool executor.

*   **`TypedSocket`**
    *   A generic base class for creating publish/subscribe channels with filtering, used by `LLMStreamSocket`, `ObservationSocket`, and `ConversationSocket`.

**U**

*   **UI System**
    *   A conceptual grouping providing access to UI communication sockets (`UISystem`, `LLMStreamSocket`, `ObservationSocket`, `ConversationSocket`).

*   **`UISystem`**
    *   A service that instantiates and provides access to the specialized UI sockets.

**V**

*   **`validateJsonSchema`**
    *   A utility function (`src/utils/validation.ts`) that uses Ajv to validate data against a JSON Schema.

**X**

*   **`XmlMatcher`**
    *   A utility class (`src/utils/xml-matcher.ts`) for finding and extracting content within a specific XML-like tag from text, used by `OutputParser` for `<think>` tags.