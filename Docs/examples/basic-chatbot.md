# Example: Basic Chatbot

This example demonstrates the minimal setup required to create a simple conversational agent using the ART Framework. It will use `InMemoryStorageAdapter` (so history is not persisted across sessions) and can be configured with a mock LLM adapter or a real one like `OpenAIAdapter`.

## 1. Project Setup

Ensure you have [installed ART Framework](installation.md).

Create a file, e.g., `src/basic-chatbot.ts`.

## 2. Code

```typescript
// src/basic-chatbot.ts
import {
    createArtInstance,
    ArtInstanceConfig,
    AgentProps,
    LogLevel,
    // If using a real LLM provider:
    OpenAIAdapter, // Example
    // AnthropicAdapter,
    // OllamaAdapter,
    // For a mock provider (as in Quick Start):
    ProviderAdapter,
    CallOptions,
    StreamEvent
} from 'art-framework';

// --- Optional: Mock Adapter for testing without API keys ---
class SimpleEchoAdapter implements ProviderAdapter {
    providerName = 'echo-adapter';
    constructor(private options: any) {}
    async call(prompt: any, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
        const userMessage = prompt.find((m: any) => m.role === 'user');
        const query = userMessage ? String(userMessage.content) : "no query provided";
        const responseText = `Echo: "${query}". My config: ${JSON.stringify(this.options)}`;
        async function* generateStream(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: responseText, threadId: options.threadId, traceId: options.traceId! } as any;
            yield { type: 'METADATA', data: { inputTokens: 5, outputTokens: 10, stopReason: 'stop' }, threadId: options.threadId, traceId: options.traceId! } as any;
            yield { type: 'END', data: null, threadId: options.threadId, traceId: options.traceId! } as any;
        }
        return generateStream();
    }
    async shutdown() { /* noop */ }
}
// --- End Mock Adapter ---


async function runBasicChatbot() {
    console.log("Setting up Basic Chatbot...");

    // --- Configuration ---
    const artConfig: ArtInstanceConfig = {
        storage: { type: 'memory' },
        providers: {
            availableProviders: [
                // Option 1: Use the Mock Echo Adapter
                { name: 'mock-echo', adapter: SimpleEchoAdapter, isLocal: true },
                // Option 2: Use OpenAI (requires OPENAI_API_KEY)
                // { name: 'openai-chat', adapter: OpenAIAdapter, isLocal: false }
            ],
        },
        logger: { level: LogLevel.INFO },
        // Optional: define system prompt presets
        systemPrompts: {
          defaultTag: 'default',
          specs: {
            default: { template: "{{fragment:pes_system_default}}" }
          }
        }
    };

    // Create and initialize the ART instance
    const art = await createArtInstance(artConfig);
    console.log("ART Instance initialized.");

    // --- Interaction Loop ---
    const threadId = "basic-chat-thread-001";
    const userId = "test-user";

    async function sendQuery(query: string) {
        console.log(`\nYOU: ${query}`);

        const agentProps: AgentProps = {
            query,
            threadId,
            userId,
            options: {
                providerConfig: {
                    // Option 1: Mock Echo Adapter
                    providerName: 'mock-echo',
                    modelId: 'echo-v1',
                    adapterOptions: { customGreeting: "Hi from basic chatbot" }

                    // Option 2: OpenAI
                    // providerName: 'openai-chat',
                    // modelId: 'gpt-4o-mini',
                    // adapterOptions: { apiKey: process.env.OPENAI_API_KEY }
                },
                // Optional: one-off guidance
                systemPrompt: { content: "Be friendly and concise for this reply.", strategy: 'append' },
                stream: false
            }
        };

        try {
            const finalResponse = await art.process(agentProps);
            console.log(`AGENT: ${finalResponse.response.content}`);
            console.log(`  (Metadata: Status=${finalResponse.metadata.status}, LLM Calls=${finalResponse.metadata.llmCalls}, Duration=${finalResponse.metadata.totalDurationMs}ms)`);
        } catch (error) {
            console.error("Error during agent processing:", error);
        }
    }

    // Simulate a conversation
    await sendQuery("Hello there!");
    await sendQuery("What is the ART Framework?");
    await sendQuery("Thanks!");

    console.log("\nChatbot session finished.");
}

runBasicChatbot().catch(console.error);
```

## 3. Running the Example

*   **If using the `SimpleEchoAdapter`:**
    You can run this directly.
    ```bash
    # If in TypeScript project:
    npx ts-node src/basic-chatbot.ts
    # Or compile first: npx tsc src/basic-chatbot.ts --outDir dist ... && node dist/basic-chatbot.js
    ```

*   **If using `OpenAIAdapter` (or another cloud provider):**
    1.  Uncomment the OpenAI parts in the code.
    2.  Set the required API key as an environment variable (e.g., `OPENAI_API_KEY`).
    3.  Run the script.

## Expected Output (with `SimpleEchoAdapter`)

```
Setting up Basic Chatbot...
... initialization logs ...
ART Instance initialized.

YOU: Hello there!
AGENT: Echo: "Hello there!". My config: {"customGreeting":"Hi from basic chatbot"}
  (Metadata: Status=success, LLM Calls=2, Duration=...ms)

YOU: What is the ART Framework?
AGENT: Echo: "What is the ART Framework?". My config: {"customGreeting":"Hi from basic chatbot"}
  (Metadata: Status=success, LLM Calls=2, Duration=...ms)

YOU: Thanks!
AGENT: Echo: "Thanks!". My config: {"customGreeting":"Hi from basic chatbot"}
  (Metadata: Status=success, LLM Calls=2, Duration=...ms)

Chatbot session finished.
```

## Key Concepts Illustrated

*   **`ArtInstanceConfig`:** Minimal configuration for `storage`, `providers`, and optional `systemPrompts` presets.
*   **`createArtInstance`:** The main function to initialize the framework.
*   **`AgentProps`:** Use `options.providerConfig` per call and optionally `options.systemPrompt` override.
*   **Basic Interaction:** A simple loop to send queries and receive responses.
*   **Non-Persistent History:** With `InMemoryStorageAdapter`, history is not persisted across runs. For persistence, see the [Persistent Agent example](persistent-agent.md).