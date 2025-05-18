# How-To: Manage Multiple LLM Providers

One of the key strengths of the ART Framework is its ability to work with multiple Large Language Model (LLM) providers simultaneously. This is facilitated by the `ProviderManager` and a flexible configuration system. This guide explains how to set up and use different LLM providers within your ART application.

## 1. Configure `ProviderManagerConfig`

The first step is to define all the LLM providers your application *might* use in the `ProviderManagerConfig`. This configuration is part of your main `ArtInstanceConfig` passed to `createArtInstance`.

*   **`availableProviders: AvailableProviderEntry[]`**: This array is where you list each provider setup.
    *   `name: string`: A unique string identifier for this specific provider configuration (e.g., "openai-gpt4o", "anthropic-claude3-sonnet", "ollama-llama3-local"). You'll use this name at runtime to select this provider.
    *   `adapter: new (options: any) => ProviderAdapter`: The constructor of the adapter class for this provider (e.g., `OpenAIAdapter`, `AnthropicAdapter`, `OllamaAdapter`).
    *   `isLocal?: boolean`: Set to `true` if this provider runs locally (like Ollama). This affects how the `ProviderManager` handles its instances (typically as a singleton). Defaults to `false`.
    *   `baseOptions?: any` (Optional): Base options passed to the adapter constructor if not overridden by `RuntimeProviderConfig.adapterOptions`. Often, API keys and model-specific defaults are better placed in `RuntimeProviderConfig`.

**Example `ArtInstanceConfig` with multiple providers:**

```typescript
// src/config/art-config.ts
import {
    ArtInstanceConfig,
    OpenAIAdapter,
    AnthropicAdapter,
    OllamaAdapter,
    LogLevel
} from 'art-framework';

export const multiProviderArtConfig: ArtInstanceConfig = {
    storage: { type: 'memory' }, // Or 'indexedDB'
    providers: {
        availableProviders: [
            {
                name: 'openai-gpt4o-mini', // A descriptive, unique name
                adapter: OpenAIAdapter,
                isLocal: false,
            },
            {
                name: 'openai-gpt3.5-turbo',
                adapter: OpenAIAdapter,
                isLocal: false,
            },
            {
                name: 'anthropic-claude3-haiku',
                adapter: AnthropicAdapter,
                isLocal: false,
            },
            {
                name: 'ollama-local-model',
                adapter: OllamaAdapter,
                isLocal: true, // This is a local provider
            }
        ],
        maxParallelApiInstancesPerProvider: 2, // Max active instances per API provider NAME
        apiInstanceIdleTimeoutSeconds: 180,    // Evict idle API adapters after 3 minutes
    },
    tools: [ /* ... your tools ... */ ],
    logger: { level: LogLevel.INFO },
};
```
In this example, we've defined four potential LLM setups that the `ProviderManager` knows about.

## 2. Select a Provider at Runtime using `RuntimeProviderConfig`

When you make an LLM call using `art.process(agentProps)` (which internally calls `ReasoningEngine.call()`), you need to specify which provider configuration to use for *that specific call*. This is done via the `RuntimeProviderConfig` object within `AgentProps.options`.

*   **`AgentProps.options.providerConfig: RuntimeProviderConfig`**:
    *   `providerName: string`: This **must match** one of the `name`s you defined in `ProviderManagerConfig.availableProviders`.
    *   `modelId: string`: The specific model identifier for the chosen provider (e.g., "gpt-4o-mini", "claude-3-haiku-20240307", "llama3:latest").
    *   `adapterOptions: any`: An object containing options required by the selected adapter's constructor for *this specific instance*.
        *   **API Keys are provided here:** For cloud-based providers like OpenAI or Anthropic, this is where you supply the `apiKey`.
        *   You can also provide other adapter-specific options (e.g., `baseURL` override for OpenAI, `defaultMaxTokens` for Anthropic, `ollamaBaseUrl` or `defaultModel` for Ollama if you want to override the constructor default for that specific instance).

**Example: Calling `art.process()` with different providers:**

```typescript
// main.ts
// import { createArtInstance, AgentProps } from 'art-framework';
// import { multiProviderArtConfig } from './config/art-config'; // Your config from above

// async function runMultiProviderAgent() {
//   const art = await createArtInstance(multiProviderArtConfig);

//   // --- Interaction 1: Using OpenAI GPT-4o-mini ---
//   const propsForOpenAI: AgentProps = {
//     query: "Explain black holes to a 5-year-old.",
//     threadId: "chat-thread-1",
//     options: {
//       providerConfig: {
//         providerName: 'openai-gpt4o-mini', // Matches name in availableProviders
//         modelId: 'gpt-4o-mini',          // The specific model for this call
//         adapterOptions: {
//           apiKey: process.env.OPENAI_API_KEY, // API key for OpenAI
//         }
//       },
//       llmParams: { temperature: 0.5 } // Additional LLM params for this call
//     }
//   };
//   if (process.env.OPENAI_API_KEY) {
//     const resultOpenAI = await art.process(propsForOpenAI);
//     console.log("OpenAI GPT-4o mini says:", resultOpenAI.response.content);
//   } else {
//     console.warn("OPENAI_API_KEY not set. Skipping OpenAI call.");
//   }

//   // --- Interaction 2: Using Anthropic Claude 3 Haiku (in the same thread or a new one) ---
//   const propsForAnthropic: AgentProps = {
//     query: "Write a short poem about a friendly robot.",
//     threadId: "chat-thread-1", // Can be the same thread or a different one
//     options: {
//       providerConfig: {
//         providerName: 'anthropic-claude3-haiku', // Selects the Anthropic config
//         modelId: 'claude-3-haiku-20240307',
//         adapterOptions: {
//           apiKey: process.env.ANTHROPIC_API_KEY, // API key for Anthropic
//           // defaultMaxTokens: 1000 // Adapter-specific option
//         }
//       },
//       llmParams: { temperature: 0.8 }
//     }
//   };
//   if (process.env.ANTHROPIC_API_KEY) {
//     const resultAnthropic = await art.process(propsForAnthropic);
//     console.log("Anthropic Haiku says:", resultAnthropic.response.content);
//   } else {
//     console.warn("ANTHROPIC_API_KEY not set. Skipping Anthropic call.");
//   }

//   // --- Interaction 3: Using a local Ollama model ---
//   const propsForOllama: AgentProps = {
//     query: "What is 15 * 7?",
//     threadId: "chat-thread-2",
//     options: {
//       providerConfig: {
//         providerName: 'ollama-local-model', // Selects the Ollama config
//         modelId: 'llama3:8b',              // Specify the Ollama model tag
//         adapterOptions: {
//           // For Ollama, apiKey defaults to "ollama", ollamaBaseUrl to localhost.
//           // Override if needed:
//           // ollamaBaseUrl: 'http://192.168.1.100:11434',
//           // defaultModel: 'llama3:8b' // Can also be set here if not in main config
//         }
//       }
//     }
//   };
//   const resultOllama = await art.process(propsForOllama);
//   console.log("Local Ollama model says:", resultOllama.response.content);
// }

// runMultiProviderAgent();
```

## Thread-Level Default Provider Configuration

You can also set a default `providerConfig` at the thread level within `ThreadConfig`.

```typescript
// import { ThreadConfig, StateManager } from 'art-framework';

// async function setupThreadWithDefaultProvider(stateManager: StateManager, threadId: string) {
//   const threadDefaultConfig: ThreadConfig = {
//     providerConfig: { // This becomes the default for this thread
//       providerName: 'anthropic-claude3-haiku',
//       modelId: 'claude-3-haiku-20240307',
//       adapterOptions: { apiKey: process.env.ANTHROPIC_API_KEY }
//     },
//     enabledTools: ["calculator"],
//     historyLimit: 20,
//   };
//   await stateManager.setThreadConfig(threadId, threadDefaultConfig);
// }
```

If `AgentProps.options.providerConfig` is **not** provided when calling `art.process()`, the `PESAgent` (or other agent cores) will attempt to use the `providerConfig` defined in the `ThreadConfig` for that `threadId`. If neither is available, the call will fail. `AgentProps.options.providerConfig` always overrides the thread-level default.

## Benefits of This Approach

*   **Flexibility:** Choose the best LLM provider and model for different tasks or user preferences at runtime.
*   **Centralized Management:** `ProviderManager` handles the complexities of instance pooling, caching, and local provider constraints.
*   **Simplified Agent Logic:** The agent core (`PESAgent`) doesn't need to know the specifics of each provider; it just uses the `ReasoningEngine` which gets the appropriate adapter from the `ProviderManager`.
*   **Easy Configuration:** Define all potential providers in one place (`ArtInstanceConfig`) and then select them dynamically.

By leveraging the `ProviderManager` and the two-tiered configuration system (`ProviderManagerConfig` and `RuntimeProviderConfig`), you can build sophisticated ART applications that effectively utilize a diverse range of LLM capabilities.