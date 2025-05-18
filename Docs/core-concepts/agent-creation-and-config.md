# Agent Creation and Configuration: `createArtInstance` & `ArtInstanceConfig`

The primary way to get started with the ART Framework and create a functional agent instance is by using the `createArtInstance` function. This function handles the complex process of initializing and wiring together all the necessary framework components based on a central configuration object: `ArtInstanceConfig`.

## `createArtInstance(config: ArtInstanceConfig)`

Found in `src/core/agent-factory.ts` (and exported from `art-framework`), `createArtInstance` is your main entry point.

*   **Purpose:** To simplify the setup of a complete ART environment. It instantiates an `AgentFactory` internally, which then initializes all required systems (storage, context managers, reasoning engine, tool systems, UI sockets, etc.) according to the provided configuration. Finally, it creates and returns an `ArtInstance` object.
*   **`ArtInstance` Object:** This returned object provides:
    *   `process(props: AgentProps): Promise<AgentFinalResponse>`: The main method to interact with the configured agent.
    *   Access to key managers and systems like `uiSystem`, `stateManager`, `conversationManager`, `toolRegistry`, and `observationManager`, allowing for more direct interaction if needed (e.g., subscribing to UI sockets, managing tools).

**Basic Usage:**

```typescript
import { createArtInstance, ArtInstanceConfig, AgentProps /* ... other imports */ } from 'art-framework';

// 1. Define your configuration (see ArtInstanceConfig details below)
const myArtConfig: ArtInstanceConfig = {
    storage: { type: 'memory' },
    providers: { /* ... provider manager config ... */ },
    // ... other config options
};

async function main() {
    try {
        // 2. Create and initialize the ART instance
        const art = await createArtInstance(myArtConfig);

        // 3. Prepare AgentProps for an interaction
        const agentProps: AgentProps = {
            query: "Hello, agent!",
            threadId: "user123-conv456",
            options: {
                providerConfig: { /* ... runtime provider config ... */ }
            }
        };

        // 4. Process the query
        const finalResponse = await art.process(agentProps);
        console.log("Agent says:", finalResponse.response.content);

    } catch (error) {
        console.error("Error setting up or running ART:", error);
    }
}

main();
```

## `ArtInstanceConfig`

The `ArtInstanceConfig` interface (defined in `src/types/index.ts`) is the cornerstone of configuring your ART setup. It's a single object that specifies how all the different parts of the framework should be initialized.

**Key Properties of `ArtInstanceConfig`:**

1.  **`storage: StorageAdapter | { type: 'memory' | 'indexedDB', ... }`** (Required)
    *   Determines how conversation history, agent state, and observations are stored.
    *   You can either provide a pre-configured `StorageAdapter` instance directly.
    *   Or, provide an object specifying the `type` of built-in adapter and its options:
        *   `{ type: 'memory' }`: Uses `InMemoryStorageAdapter` (data lost when process ends).
        *   `{ type: 'indexedDB', dbName?: string, version?: number, objectStores?: any[] }`: Uses `IndexedDBStorageAdapter` for persistent browser storage.
            *   `dbName`: Name of the IndexedDB database (defaults to `ART_Framework_DB`).
            *   `version`: Database version for schema migrations (defaults to `1`).
            *   `objectStores`: Array of object store names (defaults include `conversations`, `observations`, `state`).

    ```typescript
    // Example storage configurations:
    const memoryStorage = { type: 'memory' };
    const persistentStorage = { type: 'indexedDB', dbName: 'MyAgentData_v2', version: 2 };
    ```

2.  **`providers: ProviderManagerConfig`** (Required)
    *   Configures the `ProviderManager`, which handles access to LLM providers.
    *   See [Provider Management](provider-management.md) and `src/types/providers.ts` for details on `ProviderManagerConfig`.
    *   Includes `availableProviders` (array defining each LLM adapter like `OpenAIAdapter`, `AnthropicAdapter`, their names, and if they are local), `maxParallelApiInstancesPerProvider`, and `apiInstanceIdleTimeoutSeconds`.

    ```typescript
    // Example providers configuration:
    // import { OpenAIAdapter, OllamaAdapter } from 'art-framework';
    const providersConfig = {
        availableProviders: [
            { name: 'openai-chat', adapter: OpenAIAdapter, isLocal: false },
            { name: 'ollama-local', adapter: OllamaAdapter, isLocal: true }
        ],
        maxParallelApiInstancesPerProvider: 2,
        apiInstanceIdleTimeoutSeconds: 120
    };
    ```

3.  **`agentCore?: new (dependencies: any) => IAgentCore`** (Optional)
    *   Specifies the agent core implementation class to use.
    *   If omitted, it defaults to `PESAgent`.
    *   Useful if you create a custom agent class implementing the `IAgentCore` interface.

    ```typescript
    // import { MyCustomAgent } from './my-custom-agent';
    // const agentCoreConfig = { agentCore: MyCustomAgent };
    ```

4.  **`tools?: IToolExecutor[]`** (Optional)
    *   An array of pre-instantiated tool executor objects (classes implementing `IToolExecutor`).
    *   These tools will be automatically registered with the `ToolRegistry` during initialization.

    ```typescript
    // import { CalculatorTool, MyCustomSearchTool } from 'art-framework'; // or from your project
    // const toolsConfig = { tools: [new CalculatorTool(), new MyCustomSearchTool()] };
    ```

5.  **`stateSavingStrategy?: StateSavingStrategy`** (Optional)
    *   Determines how `AgentState` is persisted. Can be `'explicit'` (default) or `'implicit'`.
    *   `'explicit'`: Agent state is only saved when `StateManager.setAgentState()` is explicitly called. `StateManager.saveStateIfModified()` will be a no-op for agent state.
    *   `'implicit'`: `StateManager.loadThreadContext()` caches the loaded agent state. If the agent modifies this state, `StateManager.saveStateIfModified()` (called by `PESAgent` at the end of `process`) will automatically persist the changes by comparing it to the initial snapshot. `setAgentState()` still works for explicit saves.
    *   See [State Management](./state-management.md) for more details.

    ```typescript
    const stateStrategyConfig = { stateSavingStrategy: 'implicit' };
    ```

6.  **`logger?: { level?: LogLevel }`** (Optional)
    *   Configures the framework's internal `Logger`.
    *   `level`: Sets the minimum log level (e.g., `LogLevel.DEBUG`, `LogLevel.INFO`, `LogLevel.WARN`, `LogLevel.ERROR`). Defaults to `LogLevel.INFO`.

    ```typescript
    // import { LogLevel } from 'art-framework';
    const loggerConfig = { logger: { level: LogLevel.DEBUG } };
    ```

**Complete `ArtInstanceConfig` Example:**

```typescript
import {
    ArtInstanceConfig,
    OpenAIAdapter,
    CalculatorTool,
    LogLevel
} from 'art-framework';

const fullConfig: ArtInstanceConfig = {
    storage: {
        type: 'indexedDB',
        dbName: 'MyFullAgentDB',
        version: 1
    },
    providers: {
        availableProviders: [
            {
                name: 'openai-main-model',
                adapter: OpenAIAdapter,
                isLocal: false,
            }
        ],
        maxParallelApiInstancesPerProvider: 5,
        apiInstanceIdleTimeoutSeconds: 300,
    },
    tools: [
        new CalculatorTool()
    ],
    // agentCore: MyCustomAgent, // Defaults to PESAgent
    stateSavingStrategy: 'implicit',
    logger: {
        level: LogLevel.INFO,
    }
};
```

## The `AgentFactory` (Internal Mechanism)

While `createArtInstance` is the recommended public API, it internally uses the `AgentFactory` class (`src/core/agent-factory.ts`).

*   **Role:** The `AgentFactory` is responsible for the detailed process of:
    1.  Receiving the `ArtInstanceConfig`.
    2.  Initializing the correct `StorageAdapter`.
    3.  Instantiating all repositories (`ConversationRepository`, `ObservationRepository`, `StateRepository`) with the storage adapter.
    4.  Setting up the `UISystem` and its associated sockets.
    5.  Instantiating all managers (`ConversationManager`, `StateManager`, `ObservationManager`) with their dependencies (repositories, sockets, strategy).
    6.  Initializing the `ToolRegistry` (and `StateManager` if provided) and registering any initial tools.
    7.  Initializing the `ProviderManager` with the `providers` configuration.
    8.  Setting up reasoning components (`ReasoningEngine`, `PromptManager`, `OutputParser`).
    9.  Initializing the `ToolSystem`.
    10. Finally, creating an instance of the specified `IAgentCore` (e.g., `PESAgent`) and injecting all the initialized components as dependencies.

Developers typically don't need to interact with `AgentFactory` directly unless they are doing very advanced framework customization or embedding ART in a unique way. `createArtInstance` provides a simpler and more stable interface.