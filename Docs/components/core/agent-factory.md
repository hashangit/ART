# Deep Dive: `AgentFactory` and `createArtInstance`

While developers primarily interact with the ART Framework through the `ArtInstance` object returned by `createArtInstance`, understanding the role of `AgentFactory` provides insight into how the framework is initialized and its components are wired together.

## `createArtInstance(config: ArtInstanceConfig)`

*   **Source:** `src/core/agent-factory.ts` (exported via `src/index.ts`)
*   **Purpose:** This is the **recommended high-level factory function** for setting up and obtaining a ready-to-use ART framework instance.
*   **Process:**
    1.  It takes a single `ArtInstanceConfig` object as input.
    2.  Internally, it creates an instance of `AgentFactory` with this configuration.
    3.  It calls `await factory.initialize()` to set up all core components.
    4.  It then calls `factory.createAgent()` to get an instance of the configured `IAgentCore` (e.g., `PESAgent`).
    5.  Finally, it constructs and returns an `ArtInstance` object, which bundles:
        *   The `process` method from the created agent core.
        *   Accessors to key systems like `uiSystem`, `stateManager`, `conversationManager`, `toolRegistry`, and `observationManager`.

**Why use `createArtInstance`?**
It abstracts away the multi-step initialization process, providing a clean and simple entry point for developers.

## `AgentFactory` Class

*   **Source:** `src/core/agent-factory.ts`
*   **Purpose:** The `AgentFactory` is the internal workhorse responsible for instantiating and connecting all the different systems and managers within the ART framework based on the provided `ArtInstanceConfig`.

**Constructor:**

*   `constructor(config: ArtInstanceConfig)`: Takes the main configuration object. It performs basic validation to ensure required fields like `storage` and `providers` are present.

**Key Method: `async initialize(): Promise<void>`**

This asynchronous method orchestrates the setup of all framework components in a specific order:

1.  **Storage System:**
    *   Based on `config.storage` (either a pre-configured `StorageAdapter` instance or an object like `{ type: 'memory' }` or `{ type: 'indexedDB', ... }`), it instantiates the appropriate `StorageAdapter` (`InMemoryStorageAdapter` or `IndexedDBStorageAdapter`).
    *   Calls `await storageAdapter.init()` to perform any necessary setup for the adapter (e.g., opening an IndexedDB connection and creating object stores).

2.  **Repositories:**
    *   Instantiates `ConversationRepository`, `ObservationRepository`, and `StateRepository`, injecting the initialized `StorageAdapter` into each.

3.  **UI System:**
    *   Instantiates `UISystemImpl`, injecting the `ObservationRepository` and `ConversationRepository` (which the sockets might use for their `getHistory` methods).
    *   The `UISystem` internally creates instances of `ObservationSocket`, `ConversationSocket`, and `LLMStreamSocket`.

4.  **Managers (Context & Observation):**
    *   `ConversationManagerImpl`: Initialized with the `ConversationRepository` and the `ConversationSocket` (obtained from `UISystem`).
    *   `StateManagerImpl`: Initialized with the `StateRepository` and the `config.stateSavingStrategy` (defaulting to `'explicit'`).
    *   `ObservationManagerImpl`: Initialized with the `ObservationRepository` and the `ObservationSocket` (obtained from `UISystem`).

5.  **Tool Registry & Initial Tools:**
    *   `ToolRegistryImpl`: Initialized, potentially with the `StateManager` instance (if `config.stateManager` was provided, allowing the registry to filter tools based on thread enablement).
    *   If `config.tools` (an array of `IToolExecutor` instances) is provided, it iterates through them and calls `toolRegistry.registerTool()` for each.

6.  **ProviderManager:**
    *   `ProviderManagerImpl`: Initialized with `config.providers` (`ProviderManagerConfig`), which defines all available LLM provider adapters and their settings.

7.  **Reasoning Components:**
    *   `ReasoningEngineImpl`: Initialized with the `ProviderManager` instance.
    *   `PromptManagerImpl`: Instantiated (currently stateless, mainly provides fragment access and validation).
    *   `OutputParserImpl`: Instantiated.

8.  **Tool System:**
    *   `ToolSystemImpl`: Initialized with the `ToolRegistry`, `StateManager`, and `ObservationManager`.

**Key Method: `createAgent(): IAgentCore`**

*   This method is called *after* `initialize()` has successfully completed.
*   It checks if all essential components (managers, engine, parser, systems) have been initialized. If not, it throws an error.
*   It then instantiates the configured `IAgentCore` implementation. This is determined by `config.agentCore`, defaulting to `PESAgent`.
*   It injects all the necessary initialized dependencies (like `stateManager`, `conversationManager`, `reasoningEngine`, etc.) into the agent core's constructor.
*   Returns the created agent instance.

**Getters:**

The `AgentFactory` also provides public getter methods (e.g., `getStorageAdapter()`, `getUISystem()`, `getToolRegistry()`) that allow `createArtInstance` to retrieve the initialized components to bundle into the `ArtInstance` object. These getters return `null` if `initialize()` has not yet been called.

**In essence:**

*   `ArtInstanceConfig` is the blueprint.
*   `AgentFactory.initialize()` builds and wires all the framework parts according to the blueprint.
*   `AgentFactory.createAgent()` assembles the "brain" (the agent core) using these parts.
*   `createArtInstance()` wraps this entire process into a single, convenient function for the end-user.