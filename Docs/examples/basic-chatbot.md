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
    FormattedPrompt,
    CallOptions,
    StreamEvent
} from 'art-framework';

// --- Optional: Mock Adapter for testing without API keys ---
class SimpleEchoAdapter implements ProviderAdapter {
    providerName = 'echo-adapter';
    constructor(private options: any) {}
    async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
        const userMessage = prompt.find(m => m.role === 'user');
        const query = userMessage ? String(userMessage.content) : "no query provided";
        const responseText = `Echo: "${query}". My config: ${JSON.stringify(this.options)}`;
        async function* generateStream(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: responseText, threadId: options.threadId, traceId: options.traceId! };
            yield { type: 'METADATA', data: { inputTokens: 5, outputTokens: 10, stopReason: 'stop' }, threadId: options.threadId, traceId: options.traceId! };
            yield { type: 'END', data: null, threadId: options.threadId, traceId: options.traceId! };
        }
        return generateStream();
    }
    async shutdown() { console.log(`${this.providerName} shutting down.`); }
}
// --- End Mock Adapter ---


async function runBasicChatbot() {
    console.log("Setting up Basic Chatbot...");

    // --- Configuration ---
    const artConfig: ArtInstanceConfig = {
        storage: {
            type: 'memory' // Conversation history will not persist
        },
        providers: {
            availableProviders: [
                // Option 1: Use the Mock Echo Adapter
                {
                    name: 'mock-echo',
                    adapter: SimpleEchoAdapter,
                    isLocal: true, // Treat as local for simplicity
                },
                // Option 2: Use OpenAI (requires OPENAI_API_KEY environment variable)
                /*
                {
                    name: 'openai-chat',
                    adapter: OpenAIAdapter,
                    isLocal: false,
                }
                */
            ],
        },
        logger: {
            level: LogLevel.INFO // Set to DEBUG for more verbose output
        }
        // No tools, default PESAgent, default 'explicit' stateSavingStrategy
    };

    // Create and initialize the ART instance
    const art = await createArtInstance(artConfig);
    console.log("ART Instance initialized.");

    // --- Interaction Loop ---
    const threadId = "basic-chat-thread-001";
    const userId = "test-user";

    // Helper function to send a query and log the response
    async function sendQuery(query: string) {
        console.log(`\nYOU: ${query}`);

        const agentProps: AgentProps = {
            query,
            threadId,
            userId,
            options: {
                // Specify which provider configuration to use
                providerConfig: {
                    // Option 1: Mock Echo Adapter
                    providerName: 'mock-echo',
                    modelId: 'echo-v1',
                    adapterOptions: { customGreeting: "Hi from basic chatbot" }

                    // Option 2: OpenAI
                    /*
                    providerName: 'openai-chat',
                    modelId: 'gpt-3.5-turbo', // Or 'gpt-4o-mini', etc.
                    adapterOptions: { apiKey: process.env.OPENAI_API_KEY }
                    */
                },
                stream: false // For simplicity in this console example, disable streaming
                            // Set to true to see token-by-token (would need UI stream handling)
            }
        };

        // Validate API key if using OpenAI
        /*
        if (agentProps.options?.providerConfig?.providerName === 'openai-chat' && !process.env.OPENAI_API_KEY) {
            console.error("ERROR: OPENAI_API_KEY environment variable is not set. Skipping OpenAI call.");
            return;
        }
        */

        try {
            const finalResponse = await art.process(agentProps);
            console.log(`AGENT: ${finalResponse.response.content}`);
            console.log(`  (Metadata: Status=${finalResponse.metadata.status}, LLM Calls=${finalResponse.metadata.llmCalls}, Duration=${finalResponse.metadata.totalDurationMs}ms)`);

            // You can also inspect observations or full conversation history:
            // const history = await art.conversationManager.getMessages(threadId);
            // console.log("Current History:", history);
            // const observations = await art.observationManager.getObservations(threadId);
            // console.log("Last few Observations:", observations.slice(-3));

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
    2.  Make sure you have the provider's SDK/adapter installed if it's not a core ART export (though `OpenAIAdapter` is).
    3.  Set the required API key as an environment variable (e.g., `OPENAI_API_KEY`). You can use a `.env` file with the `dotenv` package for local development:
        *   Install `dotenv`: `npm install dotenv`
        *   Create a `.env` file in your project root:
            ```
            OPENAI_API_KEY=your_openai_api_key_here
            ```
        *   Add `require('dotenv').config();` at the very top of your `basic-chatbot.ts` file.
    4.  Run the script:
        ```bash
        npx ts-node src/basic-chatbot.ts
        ```

## Expected Output (with `SimpleEchoAdapter`)

```
Setting up Basic Chatbot...
[ART] InMemoryStorageAdapter initialized.
[ART] AgentFactory initialized with config: ...
... (other initialization logs) ...
ART Instance initialized.

YOU: Hello there!
[ART] PESAgent processing query for thread basic-chat-thread-001: "Hello there!"
... (PESAgent flow logs) ...
AGENT: Echo: "Hello there!". My config: {"customGreeting":"Hi from basic chatbot"}
  (Metadata: Status=success, LLM Calls=2, Duration=...ms)

YOU: What is the ART Framework?
[ART] PESAgent processing query for thread basic-chat-thread-001: "What is the ART Framework?"
... (PESAgent flow logs) ...
AGENT: Echo: "What is the ART Framework?". My config: {"customGreeting":"Hi from basic chatbot"}
  (Metadata: Status=success, LLM Calls=2, Duration=...ms)

YOU: Thanks!
[ART] PESAgent processing query for thread basic-chat-thread-001: "Thanks!"
... (PESAgent flow logs) ...
AGENT: Echo: "Thanks!". My config: {"customGreeting":"Hi from basic chatbot"}
  (Metadata: Status=success, LLM Calls=2, Duration=...ms)

Chatbot session finished.
```

## Key Concepts Illustrated

*   **`ArtInstanceConfig`:** Minimal configuration for `storage` (using `'memory'`) and `providers`.
*   **`createArtInstance`:** The main function to initialize the framework.
*   **`AgentProps`:** How to structure input for `art.process()`, including `query`, `threadId`, and `options.providerConfig` for runtime LLM selection.
*   **`RuntimeProviderConfig`:** Specifying `providerName`, `modelId`, and `adapterOptions` (like API keys or mock adapter settings) for each call.
*   **Basic Interaction:** A simple loop to send queries and receive responses.
*   **Non-Persistent History:** Because `InMemoryStorageAdapter` is used, the conversation context (history) is maintained during the `runBasicChatbot` execution but would be lost if the script were run again. For persistence, see the [Persistent Agent example](persistent-agent.md).