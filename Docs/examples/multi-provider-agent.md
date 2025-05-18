# Example: Multi-Provider Agent

This example demonstrates how to configure and use the ART Framework to interact with multiple Large Language Model (LLM) providers. It leverages the `ProviderManager` to dynamically select an LLM provider and model at runtime for each agent call.

## 1. Project Setup

*   Ensure you have [installed ART Framework](installation.md).
*   You'll need API keys for the different LLM providers you want to use (e.g., OpenAI, Anthropic). Store them securely as environment variables.

Create a file, e.g., `src/multi-provider-agent.ts`.

## 2. Code

```typescript
// src/multi-provider-agent.ts
import {
    createArtInstance,
    ArtInstanceConfig,
    AgentProps,
    LogLevel,
    OpenAIAdapter,
    AnthropicAdapter,
    OllamaAdapter, // Example for a local provider
    // CalculatorTool // If you want to add tools
} from 'art-framework';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file for API keys

async function runMultiProviderDemo() {
    console.log("Setting up Multi-Provider Agent Demo...");

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!OPENAI_API_KEY) {
        console.warn("WARN: OPENAI_API_KEY not set. OpenAI calls will be skipped.");
    }
    if (!ANTHROPIC_API_KEY) {
        console.warn("WARN: ANTHROPIC_API_KEY not set. Anthropic calls will be skipped.");
    }

    // --- Configuration: Define all available providers ---
    const artConfig: ArtInstanceConfig = {
        storage: { type: 'memory' },
        providers: {
            availableProviders: [
                {
                    name: 'openai-gpt4o-mini', // Unique name for this configuration
                    adapter: OpenAIAdapter,
                    isLocal: false,
                },
                {
                    name: 'openai-gpt3.5',    // Another OpenAI configuration
                    adapter: OpenAIAdapter,
                    isLocal: false,
                },
                {
                    name: 'anthropic-claude3-haiku',
                    adapter: AnthropicAdapter,
                    isLocal: false,
                },
                {
                    name: 'ollama-local-llama3', // Example for a local Ollama model
                    adapter: OllamaAdapter,
                    isLocal: true,
                }
            ],
            maxParallelApiInstancesPerProvider: 2, // Max active instances per named provider config
            apiInstanceIdleTimeoutSeconds: 120,
        },
        // tools: [new CalculatorTool()], // Add tools if needed
        logger: { level: LogLevel.INFO },
    };

    const art = await createArtInstance(artConfig);
    console.log("ART Instance with Multiple Providers initialized.");

    const threadId = "multi-provider-thread-001";

    // --- Function to make a call with specified provider ---
    async function askWithProvider(query: string, providerName: string, modelId: string, adapterOptions: any) {
        console.log(`\n--- Asking "${query}" using ${providerName} (${modelId}) ---`);

        const agentProps: AgentProps = {
            query,
            threadId,
            options: {
                providerConfig: { // This is the RuntimeProviderConfig
                    providerName: providerName,
                    modelId: modelId,
                    adapterOptions: adapterOptions
                },
                // llmParams: { temperature: 0.7 } // Can add other LLM params here
            }
        };

        try {
            const result = await art.process(agentProps);
            console.log(`RESPONSE (${providerName}): ${result.response.content}`);
            console.log(`  (Metadata: Status=${result.metadata.status}, LLM Calls=${result.metadata.llmCalls})`);
            if (result.metadata.error) console.error(`  Error: ${result.metadata.error}`);
        } catch (error) {
            console.error(`Error processing with ${providerName}:`, error);
        }
    }

    // --- Make calls using different providers ---

    // Call 1: OpenAI GPT-4o mini
    if (OPENAI_API_KEY) {
        await askWithProvider(
            "What are three key benefits of using a modular framework for AI development?",
            'openai-gpt4o-mini',         // providerName from availableProviders
            'gpt-4o-mini',               // modelId for OpenAI
            { apiKey: OPENAI_API_KEY }   // adapterOptions for OpenAIAdapter
        );
    }

    // Call 2: Anthropic Claude 3 Haiku
    if (ANTHROPIC_API_KEY) {
        await askWithProvider(
            "Write a short, optimistic sentence about the future of AI.",
            'anthropic-claude3-haiku',   // providerName
            'claude-3-haiku-20240307',   // modelId for Anthropic
            { apiKey: ANTHROPIC_API_KEY, defaultMaxTokens: 500 } // adapterOptions for AnthropicAdapter
        );
    }

    // Call 3: OpenAI GPT-3.5 Turbo (using a different 'name' but same adapter type)
    if (OPENAI_API_KEY) {
        await askWithProvider(
            "Suggest a catchy name for a new coffee shop.",
            'openai-gpt3.5',             // Different providerName
            'gpt-3.5-turbo-instruct',    // Different modelId
            { apiKey: OPENAI_API_KEY }
        );
    }

    // Call 4: Local Ollama model (e.g., Llama 3)
    // Ensure your Ollama server is running and has the 'llama3' model pulled.
    await askWithProvider(
        "What is the capital of France?",
        'ollama-local-llama3',       // providerName
        'llama3',                    // modelId (the tag of your Ollama model)
        {
            // For Ollama, apiKey defaults to "ollama", ollamaBaseUrl to localhost.
            // Explicitly set if different:
            // ollamaBaseUrl: 'http://localhost:11434',
            // defaultModel: 'llama3' // Can also be set here
        }
    );

    console.log("\nMulti-Provider Demo finished.");
}

runMultiProviderDemo().catch(console.error);
```

## Explanation

1.  **`ArtInstanceConfig.providers.availableProviders`**:
    *   We define multiple entries, each with a unique `name` (e.g., `openai-gpt4o-mini`, `anthropic-claude3-haiku`, `ollama-local-llama3`).
    *   Each entry specifies the `adapter` class (`OpenAIAdapter`, `AnthropicAdapter`, `OllamaAdapter`) and whether it's `isLocal`.

2.  **`AgentProps.options.providerConfig`**:
    *   When calling `art.process()`, the `agentProps.options.providerConfig` object is crucial.
    *   `providerName`: This string **must exactly match** one of the `name`s you defined in `availableProviders`. This tells the `ProviderManager` which adapter configuration to use.
    *   `modelId`: This specifies the exact model to be used for that call (e.g., "gpt-4o-mini", "claude-3-haiku-20240307", "llama3"). This `modelId` is passed to the selected adapter.
    *   `adapterOptions`: This object is passed to the constructor of the selected adapter. This is where you provide runtime necessities like the `apiKey`. You can also include other options specific to that adapter (e.g., `defaultMaxTokens` for `AnthropicAdapter`, or `ollamaBaseUrl` for `OllamaAdapter` if it's not running on the default localhost).

3.  **Dynamic Selection:**
    By changing the `providerConfig` within `AgentProps.options` for each call to `art.process()`, you can dynamically switch between different LLM providers and models for different tasks or based on user choice, cost considerations, or capability requirements.

4.  **Local vs. API Providers:**
    *   The `ollama-local-llama3` entry is marked `isLocal: true`. The `ProviderManager` will treat this as a singleton (only one local provider active at a time) and won't apply the `maxParallelApiInstancesPerProvider` or `apiInstanceIdleTimeoutSeconds` settings to it in the same way as API-based providers.
    *   API-based providers like `openai-gpt4o-mini` and `anthropic-claude3-haiku` (with `isLocal: false` or `isLocal` omitted) will be subject to pooling and idle timeout based on the `ProviderManagerConfig`.

## Running the Example

1.  Create a `.env` file in your project root with your API keys:
    ```
    OPENAI_API_KEY=your_openai_api_key
    ANTHROPIC_API_KEY=your_anthropic_api_key
    ```
2.  Ensure Ollama is running locally and you have pulled the model you intend to use (e.g., `ollama pull llama3`).
3.  Install `dotenv`: `npm install dotenv`.
4.  Run the script: `npx ts-node src/multi-provider-agent.ts`.

You will see responses from the different configured LLMs, demonstrating the ability to switch providers at runtime. The ART Framework's `ProviderManager` handles the instantiation and management of the underlying adapter instances.