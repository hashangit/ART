# Quick Start: "Hello, Agent!"

This guide will walk you through creating a minimal, runnable ART agent. This "Hello, Agent!" example will use an in-memory storage adapter and a mock LLM provider (or a real one if you have an API key) to demonstrate the basic setup and processing flow.

## 1. Project Setup

Ensure you have [installed the ART Framework](./installation.md).

Create a new TypeScript file in your project, for example, `src/myFirstAgent.ts`.

## 2. Import Necessary Components

At the top of your `myFirstAgent.ts` file, import the core components you'll need (from the public entry only):

```typescript
import {
    createArtInstance,
    ArtInstanceConfig,
    AgentProps,
    LogLevel,
    ProviderAdapter,
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

    constructor(private options: any) {}

    async call(prompt: any, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
        const query = (prompt.find((msg: any) => msg.role === 'user')?.content as string) || "no query";
        const responseText = `Hello from MockGreeter! You said: "${query}". My config: ${JSON.stringify(this.options)}`;

        async function* generateStream(): AsyncIterable<StreamEvent> {
            yield { type: 'TOKEN', data: responseText, threadId: options.threadId, traceId: options.traceId || 'mock-trace' } as any;
            yield { type: 'METADATA', data: { inputTokens: 10, outputTokens: 5, stopReason: 'stop' }, threadId: options.threadId, traceId: options.traceId || 'mock-trace' } as any;
            yield { type: 'END', data: null, threadId: options.threadId, traceId: options.traceId || 'mock-trace' } as any;
        }
        return generateStream();
    }
    async shutdown(): Promise<void> { /* noop */ }
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
                name: 'my-mock-provider',
                adapter: MockGreeterAdapter,
                isLocal: true
            },
            // Example for OpenAI (if you have an API key and want to use it):
            // { name: 'openai-main', adapter: OpenAIAdapter, isLocal: false }
        ],
        maxParallelApiInstancesPerProvider: 1,
        apiInstanceIdleTimeoutSeconds: 60,
    },

    // 3. Optional: Define system prompt presets (tags)
    systemPrompts: {
      defaultTag: 'default',
      specs: {
        default: { template: "{{fragment:pes_system_default}}\nTone: {{tone}}", defaultVariables: { tone: 'neutral' } }
      }
    },

    // 4. Agent Core (Optional): Defaults to PESAgent
    // agentCore: PESAgent,

    // 5. Tools (Optional)
    // tools: [],

    // 6. Logger (Optional)
    logger: { level: LogLevel.DEBUG },
};
```

## 5. Create the ART Instance and Process a Query

Now, use `createArtInstance` with your configuration and then call the `process` method.

```typescript
async function runAgent() {
    try {
        const art = await createArtInstance(artConfig);

        const agentProps: AgentProps = {
            query: "How are you today?",
            threadId: "quick-start-thread-1",
            userId: "user-001",
            options: {
                providerConfig: {
                    providerName: 'my-mock-provider',
                    modelId: 'mock-model-v1',
                    adapterOptions: { apiKey: 'mock-api-key', customSetting: "QuickStartSetting" }
                },
                // Optional: one-off system prompt override
                systemPrompt: { content: "For this answer, be friendly and concise.", strategy: 'append' }
            }
        };

        const finalResponse = await art.process(agentProps);
        console.log("Agent's Final Response:", finalResponse.response.content);

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

runAgent();
```

## 6. Run Your Agent

Save your `myFirstAgent.ts` file and run it (ts-node or compiled). The output should show the final message along with execution metadata.

## Congratulations!

You've successfully set up and run your first ART agent!

Key Takeaways:
- Use the public package exports (no deep/internal imports).
- `createArtInstance(artConfig)` initializes everything.
- Configure providers under `providers`, and optionally define `systemPrompts` presets.
- Call `art.process(agentProps)` and pass `options.providerConfig` (and optional `systemPrompt` override) per call.