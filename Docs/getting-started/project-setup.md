# Project Setup Recommendations

While ART is flexible, a structured project setup can make development smoother, especially for larger applications. Here are some recommendations:

## Recommended Directory Structure

A typical ART project might look like this:

```
my-art-project/
├── src/
│   ├── agents/                # Custom agent logic (if extending beyond PESAgent)
│   │   └── my-custom-agent.ts
│   ├── tools/                 # Custom tool implementations
│   │   ├── weather-tool.ts
│   │   └── database-tool.ts
│   ├── prompts/               # Store prompt blueprints or fragments (if using PromptManager heavily)
│   │   ├── planning-blueprint.md
│   │   └── common-instructions.txt
│   ├── config/                # Application-specific configurations
│   │   └── art-config.ts      # Central place to define your ArtInstanceConfig
│   ├── services/              # Other application services
│   ├── main.ts                # Main application entry point (e.g., where createArtInstance is called)
│   └── types.ts               # Custom application-specific types
├── tests/
│   ├── agents/
│   └── tools/
├── node_modules/
├── package.json
├── tsconfig.json
└── README.md
```

**Explanation:**

*   **`src/agents/`**: If you create custom agent core implementations (beyond the default `PESAgent`), place them here.
*   **`src/tools/`**: Your custom tool implementations (classes that implement `IToolExecutor`).
*   **`src/prompts/`**: If you use the `PromptManager` extensively with many custom fragments or complex blueprints, organizing them here can be helpful. (Note: For `PESAgent` using direct `ArtStandardPrompt` construction, this might be less critical).
*   **`src/config/art-config.ts`**: This is a crucial file. It's recommended to define your main `ArtInstanceConfig` here. This keeps your agent setup centralized and easy to manage.
*   **`src/main.ts`**: Your application's primary entry point. This is often where you'll call `createArtInstance` using the configuration from `art-config.ts` and start interacting with the agent.
*   **`src/types.ts`**: For any custom TypeScript types or interfaces specific to your application's domain that might be used with agent state or tool inputs/outputs.

## Centralizing `ArtInstanceConfig`

It's highly recommended to define your `ArtInstanceConfig` in a dedicated file (e.g., `src/config/art-config.ts`). This makes it easier to manage and modify your agent's setup.

**Example (`src/config/art-config.ts`):**

```typescript
import {
    ArtInstanceConfig,
    InMemoryStorageAdapter, // Or IndexedDBStorageAdapter
    OpenAIAdapter,          // Example LLM Adapter
    CalculatorTool,         // Example built-in tool
    LogLevel
} from 'art-framework';
// import { MyCustomTool } from '../tools/my-custom-tool'; // If you have custom tools

export const myAppArtConfig: ArtInstanceConfig = {
    storage: {
        type: 'memory', // Or: { type: 'indexedDB', dbName: 'MyAgentDB_V1', version: 1 }
    },
    providers: {
        availableProviders: [
            {
                name: 'openai-gpt4',
                adapter: OpenAIAdapter,
                isLocal: false,
                // No baseOptions needed if apiKey is provided at runtime in adapterOptions
            },
            // Add other providers like Anthropic, Gemini, Ollama here
            // {
            //     name: 'anthropic-claude3',
            //     adapter: AnthropicAdapter,
            //     isLocal: false,
            // },
        ],
        maxParallelApiInstancesPerProvider: 3,
        apiInstanceIdleTimeoutSeconds: 180,
    },
    tools: [
        new CalculatorTool(),
        // new MyCustomTool(),
    ],
    // agentCore: MyCustomAgent, // If using a custom agent core
    stateSavingStrategy: 'implicit', // Or 'explicit'
    logger: {
        level: LogLevel.INFO, // Adjust as needed (DEBUG, WARN, ERROR)
    },
};
```

**Using the Centralized Config (`src/main.ts`):**

```typescript
import { createArtInstance, AgentProps } from 'art-framework';
import { myAppArtConfig } from './config/art-config'; // Import your centralized config

async function startApp() {
    try {
        const art = await createArtInstance(myAppArtConfig);
        console.log('ART Instance successfully initialized!');

        // Example agent interaction
        const agentProps: AgentProps = {
            query: "What is 5 plus 7?",
            threadId: "main-app-thread-001",
            options: {
                providerConfig: {
                    providerName: 'openai-gpt4', // Must match a name in availableProviders
                    modelId: 'gpt-4o-mini',         // Specific model
                    adapterOptions: {
                        apiKey: process.env.OPENAI_API_KEY, // Load API key securely
                    },
                },
            },
        };

        if (!process.env.OPENAI_API_KEY) {
            console.error("Error: OPENAI_API_KEY environment variable is not set.");
            return;
        }

        const result = await art.process(agentProps);
        console.log("Agent Response:", result.response.content);

    } catch (error) {
        console.error("Failed to initialize or run ART agent:", error);
    }
}

startApp();
```

## Managing API Keys and Sensitive Configuration

**Never hardcode API keys directly in your source code.** Use environment variables or a secure configuration management system.

*   **Environment Variables:**
    *   Load API keys using `process.env.YOUR_API_KEY_NAME`.
    *   Use a `.env` file (e.g., with the `dotenv` package) for local development. Add `.env` to your `.gitignore`.
*   **Secrets Management Services:** For production, use services like AWS Secrets Manager, Google Cloud Secret Manager, or HashiCorp Vault.

## TypeScript Configuration (`tsconfig.json`)

A basic `tsconfig.json` for an ART project might look like this:

```json
{
  "compilerOptions": {
    "target": "ES2020",         // Modern JavaScript features
    "module": "commonjs",       // Or "ESNext" if using ES modules
    "lib": ["ES2020", "DOM"],   // Include DOM if targeting browser environments (e.g., for IndexedDB)
    "strict": true,             // Enable all strict type-checking options
    "esModuleInterop": true,    // Allows default imports from commonjs modules
    "skipLibCheck": true,       // Skip type checking of declaration files
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",         // Output directory for compiled files
    "rootDir": "./src",
    "resolveJsonModule": true,  // Allows importing JSON files
    "experimentalDecorators": true, // If using decorators
    "emitDecoratorMetadata": true   // If using decorators with reflection
  },
  "include": ["src/**/*"],      // Which files to include
  "exclude": ["node_modules", "dist"] // Which files to exclude
}
```

Adjust `target`, `module`, and `lib` based on your specific environment and needs.

## Next Steps

*   Explore the [Core Concepts](architecture-overview.md) to understand ART's building blocks.
*   Dive into specific [How-To Guides](../how-to/configure-art-instance.md) for practical tasks.