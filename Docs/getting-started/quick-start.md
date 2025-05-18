# Quick Start: "Hello, Agent!"

This guide will walk you through creating a minimal, runnable ART agent. This "Hello, Agent!" example will use an in-memory storage adapter and a mock LLM provider (or a real one if you have an API key) to demonstrate the basic setup and processing flow.

## 1. Project Setup

Ensure you have [installed the ART Framework](./installation.md).

Create a new TypeScript file in your project, for example, `src/myFirstAgent.ts`.

## 2. Import Necessary Components

At the top of your `myFirstAgent.ts` file, import the core components you'll need:

```typescript
import {
    createArtInstance,
    ArtInstanceConfig,
    AgentProps,
    LogLevel,
    // For a real LLM, you'd import its adapter, e.g., OpenAIAdapter
    // For this example, we'll mock a simple provider adapter
    ProviderAdapter,
    FormattedPrompt,
    CallOptions,
    StreamEvent
} from 'art-framework';
```

## 3. Define a Simple Mock Provider Adapter (Optional)

If you don't want to use a real LLM API key for this quick start, you can create a very simple mock adapter. If you have an API key (e.g., for OpenAI), you can skip this step and configure the real adapter in step 4.

```typescript
// Simple Mock Adapter (if not using a real LLM for this example)
class MockGreeterAdapter implements ProviderAdapter {
    providerName = 'mock-greeter';

    constructor(private options: any) {} // Constructor to accept options

    async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
        const query = (prompt.find(msg => msg.role === 'user')?.content as string) || "no query";
        const responseText = `Hello from MockGreeter! You said: "${query}". My config: ${JSON.stringify(this.options)}`;

        // Simulate a stream
        async function* generateStream(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: responseText, threadId: options.threadId, traceId: options.traceId || 'mock-trace' };
            yield { type: 'METADATA', data: { inputTokens: 10, outputTokens: 5, stopReason: 'stop' }, threadId: options.threadId, traceId: options.traceId || 'mock-trace' };
            yield { type: 'END', data: null, threadId: options.threadId, traceId: options.traceId || 'mock-trace' };
        }
        return generateStream();
    }
    // Optional shutdown
    async shutdown(): Promise<void> { console.log(`${this.providerName} shutting down.`); }
}
```

## 4. Configure Your ART Instance

The `createArtInstance` function takes an `ArtInstanceConfig` object. This configuration tells ART which components to use.

```typescript
const artConfig: ArtInstanceConfig = {
    // 1. Storage: Use in-memory storage for this example
    storage: { type: 'memory' },

    // 2. Providers: Configure the LLM provider(s)
    providers: {
        availableProviders: [
            {
                name: 'my-mock-provider', // A unique name for this provider configuration
                adapter: MockGreeterAdapter, // Use our mock adapter
                isLocal: true, // Treat as a local provider for simplicity
                // baseOptions: { greeting: "Aloha" } // Optional: Base options for the adapter constructor
            },
            // Example for OpenAI (if you have an API key and want to use it):
            /*
            {
                name: 'openai-main',
                adapter: OpenAIAdapter, // Requires: import { OpenAIAdapter } from 'art-framework';
                isLocal: false,
            }
            */
        ],
        // Default max instances for API providers (not strictly needed for a single local mock)
        maxParallelApiInstancesPerProvider: 1,
        // Default idle timeout (not strictly needed for a single local mock)
        apiInstanceIdleTimeoutSeconds: 60,
    },

    // 3. Agent Core (Optional): Defaults to PESAgent, which is fine for this example.
    // agentCore: PESAgent,

    // 4. Tools (Optional): No tools needed for this simple example.
    // tools: [],

    // 5. State Saving Strategy (Optional): Defaults to 'explicit'.
    // stateSavingStrategy: 'implicit',

    // 6. Logger (Optional): Configure logging level.
    logger: {
        level: LogLevel.DEBUG, // Show more detailed logs
    },
};
```

## 5. Create the ART Instance and Process a Query

Now, use `createArtInstance` with your configuration and then call the `process` method.

```typescript
async function runAgent() {
    try {
        // Create and initialize the ART instance
        console.log("Creating ART instance...");
        const art = await createArtInstance(artConfig);
        console.log("ART instance created and initialized.");

        // Define the properties for the agent call
        const agentProps: AgentProps = {
            query: "How are you today?",
            threadId: "quick-start-thread-1", // A unique ID for this conversation
            userId: "user-001",
            // Specify which provider configuration to use for this call
            options: {
                providerConfig: {
                    providerName: 'my-mock-provider', // Matches name in artConfig.providers.availableProviders
                    modelId: 'mock-model-v1',      // A model identifier for this provider
                    adapterOptions: {              // Options passed to the adapter's constructor
                        apiKey: 'mock-api-key',    // Even mocks might expect an options structure
                        customSetting: "QuickStartSetting"
                    }
                }
            }
        };

        console.log(`\nProcessing query for thread ${agentProps.threadId}: "${agentProps.query}"`);
        const finalResponse = await art.process(agentProps);

        console.log("\nAgent's Final Response:");
        console.log(`  Role: ${finalResponse.response.role}`);
        console.log(`  Content: "${finalResponse.response.content}"`);
        console.log("Execution Metadata:");
        console.log(`  Status: ${finalResponse.metadata.status}`);
        console.log(`  LLM Calls: ${finalResponse.metadata.llmCalls}`);
        console.log(`  Total Duration: ${finalResponse.metadata.totalDurationMs}ms`);
        if (finalResponse.metadata.error) {
            console.error(`  Error: ${finalResponse.metadata.error}`);
        }

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

// Run the agent
runAgent();
```

## 6. Run Your Agent

Save your `myFirstAgent.ts` file. If you're using TypeScript, compile it:

```bash
npx tsc src/myFirstAgent.ts --outDir dist --module commonjs --esModuleInterop --target es2020 --skipLibCheck
node dist/myFirstAgent.js
```

Or, if you have `ts-node` installed:

```bash
npx ts-node src/myFirstAgent.ts
```

**Expected Output (using the MockGreeterAdapter):**

You should see output similar to this (timestamps and exact log messages might vary):

```
Creating ART instance...
[ART] StateManager initialized with strategy: explicit
[ART] ToolRegistry initialized without StateManager.
[ART] ProviderManager initialized.
[ART] ReasoningEngine initialized with ProviderManager
[ART] PromptManager initialized. Default fragments loaded: ...
[ART] OutputParser initialized.
[ART] ToolSystem initialized.
[ART] ConversationRepository requires a valid StorageAdapter instance. (If using default PESAgent, it initializes this)
[ART] ObservationRepository requires a valid StorageAdapter instance.
[ART] StateRepository requires a valid StorageAdapter instance.
[ART] UISystem initialized with Observation, Conversation, and LLM Stream sockets.
[ART] ConversationManager initialized.
[ART] ObservationManager initialized.
ART instance created and initialized.

Processing query for thread quick-start-thread-1: "How are you today?"
[ART] ReasoningEngine requesting adapter for provider: my-mock-provider, model: mock-model-v1
[ART] Created new instance for signature: {"providerName":"my-mock-provider","modelId":"mock-model-v1",...}
... (other debug logs from PESAgent flow) ...
[ART] ReasoningEngine released adapter for signature: my-mock-provider

Agent's Final Response:
  Role: AI
  Content: "Hello from MockGreeter! You said: "How are you today?". My config: {"apiKey":"mock-api-key","customSetting":"QuickStartSetting"}"
Execution Metadata:
  Status: success
  LLM Calls: 2
  Total Duration: ...ms
```

## Congratulations!

You've successfully set up and run your first ART agent!

**Key Takeaways:**

*   **`createArtInstance(artConfig)`:** The main entry point to initialize the framework.
*   **`ArtInstanceConfig`:** Defines storage, LLM providers, tools, and other core settings.
    *   `storage`: Specifies how data like conversation history is stored.
    *   `providers`: Configures available LLM adapters (like `MockGreeterAdapter` or `OpenAIAdapter`) and their settings.
*   **`art.process(agentProps)`:** The method to interact with the agent.
*   **`AgentProps`:** Contains the user's query, thread ID, and importantly, `options.providerConfig` to select and configure the LLM for that specific call.
*   **`ProviderAdapter`:** The interface that LLM-specific adapters implement.

From here, you can explore:

*   **[Project Setup](./project-setup.md):** For structuring larger projects.
*   **[Core Concepts](../core-concepts/architecture-overview.md):** To understand ART's architecture in more detail.
*   **Using Real LLMs:** Replace the `MockGreeterAdapter` with an adapter for a provider like OpenAI, Anthropic, or Gemini, and provide your API key in the `adapterOptions` within `RuntimeProviderConfig`.
*   **Adding Tools:** Explore how to define and use tools with your agent.