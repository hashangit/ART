# How-To: Configure an ART Instance

The foundation of any ART Framework application is the `ArtInstance`, which is created and configured using the `createArtInstance` function and an `ArtInstanceConfig` object. This guide provides examples of how to configure `ArtInstanceConfig` for various common scenarios.

## Basic Structure of `ArtInstanceConfig`

Recall the key properties of `ArtInstanceConfig` (from `src/types/index.ts`):

```typescript
export interface ArtInstanceConfig {
  storage: StorageAdapter | { type: 'memory' | 'indexedDB', ... }; // Required
  providers: ProviderManagerConfig; // Required
  agentCore?: new (dependencies: any) => IAgentCore;
  tools?: IToolExecutor[];
  stateSavingStrategy?: StateSavingStrategy;
  logger?: { level?: LogLevel };
}
```

## Scenario 1: Simple In-Memory Agent (for Testing/Demos)

This setup is quick and easy, perfect for testing, quick demos, or agents that don't need to remember anything between sessions. It uses `InMemoryStorageAdapter` and a mock or a single API-based LLM provider.

```typescript
import {
    ArtInstanceConfig,
    // For a real LLM:
    // OpenAIAdapter,
    // AnthropicAdapter,
    // For a local LLM via Ollama:
    OllamaAdapter,
    CalculatorTool,
    LogLevel
} from 'art-framework';

// If using a real LLM, ensure API keys are handled securely (e.g., environment variables)
// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const simpleInMemoryConfig: ArtInstanceConfig = {
    // 1. Storage: Use in-memory (data lost on session end)
    storage: {
        type: 'memory'
    },

    // 2. Providers: Configure LLM access
    providers: {
        availableProviders: [
            // Option A: Using Ollama for a local model (replace 'llama3' with your model)
            {
                name: 'local-llm',
                adapter: OllamaAdapter,
                isLocal: true, // Important for local provider behavior
            },
            // Option B: Using a cloud provider (e.g., OpenAI - uncomment and add API key)
            /*
            {
                name: 'openai-chat',
                adapter: OpenAIAdapter,
                isLocal: false,
            },
            */
        ],
        // Defaults are usually fine for a single provider setup
        maxParallelApiInstancesPerProvider: 1,
        apiInstanceIdleTimeoutSeconds: 300,
    },

    // 3. Tools (Optional): Add any tools the agent should use
    tools: [
        new CalculatorTool(),
    ],

    // 4. Agent Core (Optional): Defaults to PESAgent, which is suitable for most cases.
    // agentCore: MyCustomAgentClass,

    // 5. State Saving Strategy (Optional): Defaults to 'explicit'.
    //    'implicit' can be convenient if agent state changes should always be saved.
    stateSavingStrategy: 'implicit',

    // 6. Logger (Optional): Configure logging verbosity
    logger: {
        level: LogLevel.DEBUG, // More verbose for development/testing
    }
};

// To use this config:
// import { createArtInstance } from 'art-framework';
// async function main() {
//   const art = await createArtInstance(simpleInMemoryConfig);
//   // Now you can use art.process(...)
//   // Remember to provide RuntimeProviderConfig in AgentProps.options
//   // For Ollama example:
//   /*
//   const response = await art.process({
//       query: "Hello!",
//       threadId: "thread-ollama-test",
//       options: {
//           providerConfig: {
//               providerName: 'local-llm', // Matches name in availableProviders
//               modelId: 'llama3',          // Your Ollama model
//               adapterOptions: {
//                   // For Ollama, default ollamaBaseUrl and apiKey are often sufficient
//                   // ollamaBaseUrl: 'http://localhost:11434' // Default
//               }
//           }
//       }
//   });
//   */
//   // For OpenAI example:
//   /*
//   if (!OPENAI_API_KEY) throw new Error("OpenAI API key not set.");
//   const response = await art.process({
//       query: "Hello!",
//       threadId: "thread-openai-test",
//       options: {
//           providerConfig: {
//               providerName: 'openai-chat',
//               modelId: 'gpt-3.5-turbo',
//               adapterOptions: { apiKey: OPENAI_API_KEY }
//           }
//       }
//   });
//   console.log(response.response.content);
//   */
// }
// main();
```

## Scenario 2: Persistent Web Agent with IndexedDB and Multiple LLM Options

This setup is for web applications where conversation history and agent state need to persist across browser sessions. It also demonstrates configuring multiple LLM providers.

```typescript
import {
    ArtInstanceConfig,
    OpenAIAdapter,
    AnthropicAdapter,
    CalculatorTool,
    LogLevel
    // Assuming you have a WeatherTool defined as per other guides
    // import { WeatherTool } from './path/to/your/WeatherTool';
} from 'art-framework';

// Ensure API keys are handled securely (e.g., from a backend or secure config)
// const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
// const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY;

const persistentWebConfig: ArtInstanceConfig = {
    // 1. Storage: Use IndexedDB for persistence in the browser
    storage: {
        type: 'indexedDB',
        dbName: 'MyWebAppAgentDB_V1', // Choose a unique name for your app's DB
        dbVersion: 1,                 // Increment if you change objectStores schema
        // Default objectStores ('conversations', 'observations', 'state') are usually sufficient
    },

    // 2. Providers: Configure multiple LLM providers
    providers: {
        availableProviders: [
            {
                name: 'openai-gpt4o-mini',
                adapter: OpenAIAdapter,
                isLocal: false,
            },
            {
                name: 'anthropic-claude3-haiku',
                adapter: AnthropicAdapter,
                isLocal: false,
            }
            // You could also add an OllamaAdapter entry here for local model support
        ],
        maxParallelApiInstancesPerProvider: 2, // Allow a couple of concurrent calls per provider type
        apiInstanceIdleTimeoutSeconds: 180,  // Evict idle adapters after 3 minutes
    },

    // 3. Tools:
    tools: [
        new CalculatorTool(),
        // new WeatherTool(), // Your custom tool
    ],

    // 4. State Saving Strategy:
    stateSavingStrategy: 'implicit', // Auto-save agent state changes

    // 5. Logger:
    logger: {
        level: LogLevel.INFO, // Less verbose for a web app, DEBUG during development
    }
};

// How to use it (conceptual, assuming API keys are available):
// async function initializeWebAppAgent() {
//   if (!OPENAI_API_KEY || !ANTHROPIC_API_KEY) {
//     console.error("API keys are missing!");
//     return;
//   }
//   const art = await createArtInstance(persistentWebConfig);
//
//   // Example: User chooses OpenAI for a query
//   const openAIResponse = await art.process({
//     query: "Explain quantum entanglement simply.",
//     threadId: "userXYZ-chat1",
//     options: {
//       providerConfig: {
//         providerName: 'openai-gpt4o-mini',
//         modelId: 'gpt-4o-mini', // Could also be just 'gpt-4o' if the entry name is generic
//         adapterOptions: { apiKey: OPENAI_API_KEY }
//       }
//     }
//   });
//   console.log("OpenAI says:", openAIResponse.response.content);

//   // Example: User chooses Anthropic for another query in the same thread
//   const anthropicResponse = await art.process({
//     query: "Write a poem about a persistent database.",
//     threadId: "userXYZ-chat1", // Same thread, history will be used
//     options: {
//       providerConfig: {
//         providerName: 'anthropic-claude3-haiku',
//         modelId: 'claude-3-haiku-20240307',
//         adapterOptions: { apiKey: ANTHROPIC_API_KEY }
//       }
//     }
//   });
//   console.log("Anthropic says:", anthropicResponse.response.content);
// }
```

## Scenario 3: Custom Agent Core and Explicit State Saving

This example shows how to specify a custom agent core implementation and use explicit state saving.

```typescript
import {
    ArtInstanceConfig,
    IAgentCore, // For typing MyCustomAgent
    // ... other necessary imports
    OpenAIAdapter,
    LogLevel
} from 'art-framework';

// Assume MyCustomAgent is defined elsewhere and implements IAgentCore
// import { MyCustomAgent } from './my-custom-agent';

const customAgentConfig: ArtInstanceConfig = {
    storage: { type: 'memory' }, // Or 'indexedDB'
    providers: {
        availableProviders: [
            { name: 'default-openai', adapter: OpenAIAdapter, isLocal: false }
        ],
    },
    // agentCore: MyCustomAgent, // Specify your custom agent class
    tools: [ /* ... your tools ... */ ],
    stateSavingStrategy: 'explicit', // Agent must call stateManager.setAgentState()
    logger: {
        level: LogLevel.DEBUG,
    }
};

// Usage:
// const art = await createArtInstance(customAgentConfig);
// When art.process() is called, it will use MyCustomAgent.
// MyCustomAgent's logic would be responsible for calling:
// await stateManager.setAgentState(threadId, newAgentState);
// whenever it needs to persist changes to the AgentState.
// The PESAgent's automatic call to saveStateIfModified() will be a no-op for AgentState here.
```

## Key Configuration Points to Remember:

*   **`storage`**: Choose `'memory'` for transience or `'indexedDB'` for browser persistence. Provide `dbName` and `dbVersion` for IndexedDB.
*   **`providers.availableProviders`**:
    *   Define each LLM provider setup you intend to use.
    *   `name` is how you'll refer to it in `RuntimeProviderConfig`.
    *   `adapter` is the specific adapter class (e.g., `OpenAIAdapter`).
    *   `isLocal: true` for providers like Ollama to enforce singleton behavior.
*   **`RuntimeProviderConfig` (in `AgentProps.options`):** This is crucial for *every* call to `art.process()`. It tells ART:
    *   `providerName`: Which entry from `availableProviders` to use.
    *   `modelId`: The specific model for that provider (e.g., "gpt-4o-mini", "llama3").
    *   `adapterOptions`: Runtime options for the adapter, most importantly the `apiKey` for cloud providers.
*   **`tools`**: Provide instances of your `IToolExecutor` implementations.
*   **`stateSavingStrategy`**: Decide if you want `'implicit'` state saving (convenient) or `'explicit'` control.
*   **`logger.level`**: Adjust verbosity for development vs. production.

By carefully crafting your `ArtInstanceConfig`, you can tailor the ART Framework to a wide variety of agent application needs.