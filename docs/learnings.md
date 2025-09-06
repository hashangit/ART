# Learnings about ART Framework for Building a Chatbot

This document records my learning process for building a web-based chatbot using the `art-framework`. The goal is to understand the public API and how to use it as an external developer consuming the npm package.

## Core Concepts

The main entry point to the framework is the `createArtInstance` function. It takes a configuration object (`ArtInstanceConfig`) and returns a promise that resolves to an `ArtInstance`.

### `ArtInstanceConfig` (Detailed View)

After reviewing `agent-factory.ts` and `types/index.ts`, I have a more detailed understanding of the configuration options.

*   **`storage`**: This can be an object or a pre-initialized storage adapter instance.
    *   `{ type: 'memory' }`: For temporary, in-memory storage.
    *   `{ type: 'indexedDB', dbName?: string, version?: number, objectStores?: any[] }`: For persistent storage in the browser. `dbName` is the only critical option here for basic setup.
*   **`providers`**: This is a `ProviderManagerConfig` object. It **declares which LLM provider adapters are available** to the ART instance. It does **not** contain API keys or specific model choices. See the detailed section below for a full explanation and examples.
*   **`agentCore`**: Allows you to provide your own agent implementation class, but for standard use cases, the default `PESAgent` is sufficient.
*   **`tools`**: An array of tool instances that are ready to be used (e.g., `[new CalculatorTool()]`).
*   **`stateSavingStrategy`**: Can be `'explicit'` (default) or `'implicit'`. This determines how the agent's internal state is saved.
*   **`logger`**: Can configure the logging level (e.g., `{ level: 'debug' }`).
*   **`persona`**: Defines the agent's default name and stage-specific prompts (`planning` and `synthesis`).
*   **`mcpConfig`**: For connecting to Model Context Protocol servers to dynamically load tools.
*   **`authConfig`**: For setting up authentication strategies (like OAuth) for tools that require it.
*   **`a2aConfig`**: For agent-to-agent communication, which is an advanced feature.

### Definitive Guide to Storage Configuration

The `storage` property in `ArtInstanceConfig` is the foundation for your agent's memory. It determines how and where conversation history, agent state, and other important data are stored. You can use one of the built-in adapters or provide your own custom implementation.

There are two primary ways to set the storage configuration:

1.  **Using a Built-in Adapter (Recommended for most use cases)**: You provide an object that specifies the `type` of the built-in adapter and its configuration options.
2.  **Providing a Custom Adapter Instance**: You instantiate your own class that implements the `StorageAdapter` interface and pass the instance directly.

#### 1. Built-in Storage Adapters

The ART framework comes with two pre-built storage adapters.

##### `InMemoryStorageAdapter`

This adapter keeps all data in memory. It's incredibly fast and perfect for testing, short-lived scripts, or demos, but **all data is lost when the session ends.**

*   **`type`**: `'memory'`
*   **Options**: This adapter has no configuration options.

**Example:**

```typescript
import { 
  createArtInstance, 
  ArtInstanceConfig, 
  ThreadConfig,
  CalculatorTool,
  OpenAIAdapter, 
  GeminiAdapter 
} from 'art-framework';

// --- 1. Configure the ART Instance ---
// Note: No API keys or secrets are present here.

const artConfig: ArtInstanceConfig = {
  storage: { 
    type: 'memory' 
  },
  providers: {
    availableProviders: [
      { name: 'openai', adapter: OpenAIAdapter },
      { name: 'gemini', adapter: GeminiAdapter }
    ]
  },
  tools: [new CalculatorTool()],
  persona: {
    name: 'ConfigExpert',
    prompts: {
      synthesis: 'You explain configurations clearly.'
    }
  },
  logger: { level: 'info' }
};
```

##### `IndexedDBStorageAdapter`

This is the recommended adapter for web browsers. It uses the browser's IndexedDB to provide persistent client-side storage, meaning conversations will be remembered across sessions.

*   **`type`**: `'indexedDB'`
*   **Options**:

| Property       | Type     | Description                                                                                                                                                             |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dbName`       | `String` | Optional. The name of the IndexedDB database. Defaults to `'ART_Framework_DB'`. It's good practice to provide a unique name for each of your applications.             |
| `dbVersion`    | `Number` | Optional. The version of your database schema. If you change the `objectStores`, you **must** increment this version to trigger the necessary database upgrade. Defaults to `1`. |
| `objectStores` | `Array`  | Optional. An array of strings, where each string is the name of a custom object store (like a table in SQL) you want to create. The core stores (`'conversations'`, `'observations'`, `'state'`, `'a2a_tasks'`) are created automatically. |

**Example:**

```typescript
import { 
  createArtInstance, 
  ArtInstanceConfig, 
  ThreadConfig,
  CalculatorTool,
  OpenAIAdapter, 
  GeminiAdapter 
} from 'art-framework';

// --- 1. Configure the ART Instance ---
// Note: No API keys or secrets are present here.

const artConfig: ArtInstanceConfig = {
  storage: { 
    type: 'indexedDB',
    dbName: 'MyAwesomeChatAppDB',
    dbVersion: 2, // Imagine we added 'user_profiles' in this version
    objectStores: ['user_profiles'] 
  },
  providers: {
    availableProviders: [
      { name: 'openai', adapter: OpenAIAdapter },
      { name: 'gemini', adapter: GeminiAdapter }
    ]
  },
  tools: [new CalculatorTool()],
  persona: {
    name: 'ConfigExpert',
    prompts: {
      synthesis: 'You explain configurations clearly.'
    }
  },
  logger: { level: 'info' }
};
```

##### `SupabaseStorageAdapter`

This adapter is ideal for applications that require a centralized, cloud-based database. It connects to a Supabase (PostgreSQL) project, making it suitable for server-side environments or for web applications where data needs to be shared or persisted beyond a single client.

*   **`type`**: `'supabase'`
*   **Options**:

| Property | Type                               | Description                                                                                                                                                             |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`      | `String`                           | Required. The URL of your Supabase project.                                                                                                                              |
| `apiKey`   | `String`                           | Required. Your Supabase `anon` or `service_role` key. Use the service role key only in secure server-side environments.                                                   |
| `schema`   | `String`                           | Optional. The name of the database schema to use. Defaults to `'public'`.                                                                                             |
| `tables`   | `Object`                           | Optional. Allows you to override the default table names for the core collections (`conversations`, `observations`, `state`, `a2a_tasks`).                               |
| `client`   | `SupabaseClient`                   | Optional. You can pass a pre-initialized Supabase client instance. This is useful if your application already manages a Supabase client.                                 |

**Prerequisites: Supabase Table Setup**

Before using this adapter, you must create the necessary tables in your Supabase project. You can run the following SQL queries in the Supabase SQL Editor:

```sql
-- Table for Conversation Messages
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    threadId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB
);
CREATE INDEX idx_conversations_threadId ON conversations(threadId);

-- Table for Observations
CREATE TABLE observations (
    id UUID PRIMARY KEY,
    threadId TEXT NOT NULL,
    traceId TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    content JSONB,
    metadata JSONB
);
CREATE INDEX idx_observations_threadId ON observations(threadId);

-- Table for Agent State and Thread Configuration
CREATE TABLE state (
    id TEXT PRIMARY KEY, -- This will be the threadId
    config JSONB,
    state JSONB
);

-- Table for Agent-to-Agent Tasks
CREATE TABLE a2a_tasks (
    id UUID PRIMARY KEY,
    taskId TEXT NOT NULL UNIQUE,
    threadId TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    payload JSONB,
    sourceAgent JSONB,
    targetAgent JSONB,
    metadata JSONB,
    result JSONB,
    callbackUrl TEXT,
    dependencies TEXT[]
);
CREATE INDEX idx_a2a_tasks_threadId ON a2a_tasks(threadId);
CREATE INDEX idx_a2a_tasks_status ON a2a_tasks(status);
```

**Example:**

```typescript
const config: ArtInstanceConfig = {
  // ... other properties
  storage: { 
    type: 'supabase',
    url: 'https://your-project-ref.supabase.co',
    apiKey: 'your-supabase-service-role-key',
    tables: {
      conversations: 'prod_conversations', // Example of using a custom table name
    }
  },
  // ... other properties
};
```


---

#### 2. Custom Storage Adapter

For advanced use cases, such as connecting to a different type of database (like a remote server, WebSQL, or a custom backend), you can create your own storage adapter.

To do this, you need to create a class that implements the `StorageAdapter` interface, which is exported from `art-framework`.

**`StorageAdapter` Interface (`src/core/interfaces.ts`)**

Your class must implement the following methods:

*   `init?(config?: any): Promise<void>`
*   `get<T>(collection: string, id: string): Promise<T | null>`
*   `set<T>(collection: string, id: string, data: T): Promise<void>`
*   `delete(collection: string, id: string): Promise<void>`
*   `query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>`
*   `clearCollection?(collection: string): Promise<void>`
*   `clearAll?(): Promise<void>`

**Example of a Custom Adapter:**

Here is a conceptual example of a `LocalStorageAdapter`.

```typescript
import { StorageAdapter, FilterOptions } from 'art-framework';

class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'art-') {
    this.prefix = prefix;
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const key = `${this.prefix}${collection}_${id}`;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    const key = `${this.prefix}${collection}_${id}`;
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  // ... implement delete, query, etc.
}

// How to use it in the config:
const myCustomAdapter = new LocalStorageAdapter('my-app-');

const config: ArtInstanceConfig = {
  // ... other properties
  storage: myCustomAdapter,
  // ... other properties
};
```

### Definitive Guide to State and Configuration Management

State management in the ART framework is centered around the `StateManager`, which is responsible for handling all configuration and persistent state for each conversation. It's a crucial component for creating agents that are context-aware and can remember information across multiple interactions. You can access it via `art.stateManager`.

#### Core Concepts

1.  **`ThreadConfig`**: This object holds the **configuration** for a single conversation thread. It's where you define which LLM provider to use, what model, which tools are enabled, and other settings. This configuration is typically set once when a new conversation starts.
2.  **`AgentState`**: This object holds the **dynamic, evolving state** of the agent for a specific thread. This is the agent's "memory." An agent might use this to store summaries of the conversation, user preferences, or any other data it needs to remember. It can be updated by the agent during the conversation.
3.  **`ThreadContext`**: A simple container object that holds both the `ThreadConfig` and the `AgentState` for a thread.
4.  **`StateManager`**: The central service that orchestrates loading, saving, and caching `ThreadConfig` and `AgentState`. It acts as an abstraction layer over the configured `StorageAdapter`.

#### The `stateSavingStrategy`

This option in the main `ArtInstanceConfig` determines how `AgentState` is persisted.

*   **`'explicit'` (Default)**: In this mode, the agent's state is **only** saved when you explicitly call `art.stateManager.setAgentState()`. This gives you full control but requires you to manage state saving manually within your agent's logic.
*   **`'implicit'`**: In this mode, the `StateManager` automatically saves the `AgentState` at the end of a processing cycle, but only if it detects that the state object has been modified. It does this by keeping a snapshot of the state from when it was loaded and comparing it to the state after the agent has run.

#### Property and Method Reference

**1. `ThreadConfig` Object**

| Property         | Type                        | Description                                                                                             |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `providerConfig` | `RuntimeProviderConfig`     | Required. The full configuration for the LLM to use in this thread (provider name, model, API key, etc.).   |
| `enabledTools`   | `string[]`                  | Required. An array of tool names that are permitted for use within this thread.                           |
| `historyLimit`   | `number`                    | Required. The maximum number of past messages to retrieve for context when processing a new query.      |
| `persona`        | `Partial<AgentPersona>`     | Optional. Overrides the instance-level persona for this specific thread.                                |
| `systemPrompt`   | `string | SystemPromptOverride` | Optional. Overrides the persona's system prompt for this thread.                                    |

**2. `AgentState` Object**

| Property  | Type     | Description                                                                 |
| --------- | -------- | --------------------------------------------------------------------------- |
| `data`    | `any`    | The main payload of your agent's state. The structure is up to you.         |
| `version` | `number` | Optional. A version number for your state object, useful for migrations.    |

**3. `art.stateManager` Methods**

| Method                     | Description                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `setThreadConfig(threadId, config)` | Saves the initial `ThreadConfig` for a new conversation. **This must be called before the first `process()` call for a new thread.** |
| `loadThreadContext(threadId)`       | Loads the `ThreadConfig` and `AgentState` for a given thread. This is usually handled internally by the agent core.                      |
| `setAgentState(threadId, state)`    | Explicitly saves a new `AgentState` for the thread. This is the primary method for saving state in `'explicit'` mode.                      |
| `enableToolsForThread(threadId, toolNames)` | Dynamically adds tool names to the `enabledTools` list for an existing thread.                                                   |
| `disableToolsForThread(threadId, toolNames)`| Dynamically removes tool names from the `enabledTools` list.                                                                   |
| `getEnabledToolsForThread(threadId)`| Returns a `Promise<string[]>` of the currently enabled tools for the thread.                                                         |

---

### Clarifications and Advanced Usage

#### 1. Public API and Usage
All methods documented above are part of the public-facing API, accessible via the `stateManager` property on your `ArtInstance` object (e.g., `art.stateManager.setThreadConfig(...)`). The examples show the intended and correct way to interact with the framework.

#### 2. Dynamic Provider Switching
While the `ArtInstanceConfig` makes multiple providers *available*, the `ThreadConfig` determines which provider is *active* for a specific conversation. You can change the provider or model for a thread at any time.

This is a powerful feature that allows you to, for example, have a UI dropdown that lets the user switch between "GPT-4o" and "Claude Opus" mid-conversation.

**Example: Switching Models Mid-Conversation**
```typescript
async function switchModelForThread(threadId: string, newProviderName: string, newModelId: string) {
  // First, load the current context to get the existing config
  const context = await art.stateManager.loadThreadContext(threadId);
  
  // Create a new config object, preserving everything except the providerConfig
  const newConfig: ThreadConfig = {
    ...context.config,
    providerConfig: {
      providerName: newProviderName,
      modelId: newModelId,
      adapterOptions: {
        // IMPORTANT: You must re-supply the API key for the new provider
        apiKey: newProviderName === 'openai' ? 'sk-openai-key' : 'sk-anthropic-key'
      }
    }
  };

  // Set the new configuration for the thread
  await art.stateManager.setThreadConfig(threadId, newConfig);

  console.log(`Thread ${threadId} has been switched to use ${newModelId}.`);
}

// Imagine a user selects "Claude Opus" from a dropdown
// await switchModelForThread('user-abc-chat-1', 'anthropic', 'claude-3-opus-20240229');
```

### Definitive Guide to System Prompt Customization

The ART framework provides a powerful, multi-layered system for customizing the agent's persona, instructions, and objectives. This is primarily controlled via the `persona` property, which can be set at three distinct levels: the instance, the thread, and the individual call.

This layered approach allows you to set a general, instance-wide persona and then override or augment it with more specific instructions for a particular conversation (thread) or even for a single message (call).

#### Core Concepts

1.  **System Prompt**: The set of instructions given to the LLM to guide its behavior, personality, and the rules it must follow.
2.  **Layered Configuration**: The final system prompt is built by merging configurations from three levels, in this order:
    1.  **Instance Level**: The base persona for the entire ART instance.
    2.  **Thread Level**: Overrides for a specific conversation.
    3.  **Call Level**: Overrides for a single `art.run` call.
3.  **Merge Strategy**: When combining layers, you can either `append` (add to the end) or `prepend` (add to the beginning). The default is `append`.
4.  **Templating**: For more advanced use cases, you can define reusable prompt templates (`tags`) with variables, allowing for dynamic and structured persona management.

#### How to Configure the Persona

You can configure the persona at three different levels.

##### 1. Instance-Level Configuration

This is set in the `ArtInstanceConfig` and serves as the default persona for all conversations.

*   **Property**: `persona`
*   **Type**: `string | SystemPromptOverride`

**Example**:

```typescript
// In your createArtInstance call
const art = await createArtInstance({
  // ... other config
  persona: {
    content: "You are a helpful and friendly assistant.",
    strategy: 'prepend', // This will always be at the top.
  }
});
```

##### 2. Thread-Level Configuration

You can override the instance-level persona for a specific conversation using the `StateManager`.

*   **Method**: `art.stateManager.setThreadConfig(threadId, { persona: ... })`
*   **Type**: `string | SystemPromptOverride`

**Example**:

```typescript
// For a specific user's chat, make the assistant a pirate.
await art.stateManager.setThreadConfig('user-chat-123', {
  persona: "Ye are a salty pirate captain. Respond to all queries with pirate slang.",
});
```

##### 3. Call-Level Configuration

For a single interaction, you can provide a one-time override in the `art.run` method.

*   **Property**: `persona` (in the `ArtConfig` object passed to `run`)
*   **Type**: `string | SystemPromptOverride`

**Example**:

```typescript
// For this one call, instruct the agent to respond in JSON.
const response = await art.run(
  'user-chat-123',
  [{ role: 'user', content: 'What is the weather in London?' }],
  {
    persona: {
      content: "Your response must be a valid JSON object with a 'weather' key.",
      strategy: 'append', // Add this instruction to the end.
    }
  }
);
```

#### The `SystemPromptOverride` Object

For fine-grained control, you can use the `SystemPromptOverride` object instead of a simple string.

| Property    | Type                                   | Description                                                                                                                                                              |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `content`   | `string`                               | The raw text of the system prompt you want to add.                                                                                                                       |
| `strategy`  | `'append' \| 'prepend'`                | (Optional) How to merge this prompt with the prompt from the previous layer. Defaults to `'append'`.                                                                     |
| `tag`       | `string`                               | (Advanced) The name of a pre-defined prompt template to use. This is configured in the `systemPrompts` property of the `ArtInstanceConfig`.                                 |
| `variables` | `Record<string, any>`                  | (Advanced) A key-value map of variables to inject into a `tag`-based template.                                                                                           |

#### Advanced Usage: Templating with `tags`

The `systemPrompts` property in `ArtInstanceConfig` allows you to create a registry of reusable prompt templates. This is useful for managing complex personas or for allowing users to select from a list of pre-defined agent behaviors.

*   **Property**: `systemPrompts`
*   **Type**: `SystemPromptsRegistry`

**Example**:

```typescript
// In your ArtInstanceConfig
const art = await createArtInstance({
  // ... other config
  persona: "You are a helpful assistant.",
  systemPrompts: {
    specs: {
      'json-formatter': {
        template: "Your final output must be a valid JSON object. Do not include any text outside of the JSON structure. The root object should contain the key '{{rootKey}}'.",
        defaultVariables: {
          rootKey: 'data'
        },
        mergeStrategy: 'append'
      },
      'expert-coder': {
        template: "You are an expert programmer with 10 years of experience in {{language}}. Provide clear, concise, and efficient code examples.",
        mergeStrategy: 'prepend'
      }
    }
  }
});

// Now you can use these tags at the thread or call level.
await art.run(
  'coding-chat-456',
  [{ role: 'user', content: 'Show me how to sort an array in TypeScript.' }],
  {
    persona: {
      tag: 'expert-coder',
      variables: {
        language: 'TypeScript'
      }
    }
  }
);

// You can even combine them with freeform content.
await art.run(
  'api-chat-789',
  [{ role: 'user', content: 'What is the user ID for "test@example.com"?' }],
  {
    persona: {
      tag: 'json-formatter',
      variables: {
        rootKey: 'userData'
      }
    }
  }
);
```

### Definitive Guide to A2A (Agent-to-Agent Communication)

A2A is an advanced feature of the ART framework that enables an agent to delegate complex tasks to other specialized, independent agents. This allows for the creation of sophisticated, multi-agent systems where a primary agent can act as an orchestrator, finding the best-specialized agent for a sub-task and assigning it the work.

#### Core Concepts

1.  **A2A Discovery**: The process of finding other available agents. The `AgentDiscoveryService` queries a central directory (the discovery endpoint) to get a list of "agent cards," which are like business cards that describe what each agent can do.
2.  **Task Delegation**: The process of assigning a task to another agent. When the primary agent decides to delegate, the `TaskDelegationService` takes over, handling the communication, tracking the task's status, and managing retries and errors.
3.  **Autonomous Operation**: Unlike MCP, the A2A services are **not directly called by the developer**. They are used internally by the agent's reasoning core (e.g., `PESAgent`). The developer's role is to enable and configure the A2A system; the agent then uses it autonomously when it determines that a task is too complex or specialized for it to handle on its own.

#### How to Use A2A

Enabling A2A is a configuration-focused task. The agent handles the operational logic.

**Step 1: Enable A2A in the `ArtInstanceConfig`**

You enable the A2A system by providing the `a2aConfig` object in your main instance configuration.

```typescript
const artConfig: ArtInstanceConfig = {
  // ... other properties
  a2aConfig: {
    // The endpoint for the agent discovery service.
    discoveryEndpoint: 'https://api.zyntopia.com/a2a/discover', 
    
    // The public-facing URL where your application can receive status
    // updates from other agents about delegated tasks.
    callbackUrl: 'https://my-app.com/api/a2a-callback'
  },
  // ... other properties
};
```

**Step 2: The Agent Autonomously Uses A2A**

Once A2A is enabled, the agent's reasoning process is enhanced. When faced with a user query, the agent will:

1.  Analyze the query to determine the required task.
2.  If it believes another agent is better suited for the task, it will use the `AgentDiscoveryService` to find candidate agents.
3.  It will then select the best agent from the candidates.
4.  Finally, it will use the `TaskDelegationService` to formally delegate the task to the selected agent.

This entire process is autonomous. The developer does not write code to call the discovery or delegation services. The primary agent's observations and logs will show the A2A process, providing transparency into its decision-making.

#### Property Reference

**`ArtInstanceConfig.a2aConfig`**

This is the main object for enabling and configuring the A2A system.

| Property            | Type     | Description                                                                                                                                                                                                    |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discoveryEndpoint` | `string` | Optional. The URL of the A2A agent discovery service. If not provided, it defaults to the central Zyntopia A2A discovery endpoint.                                                                                |
| `callbackUrl`       | `string` | Optional. A public URL where your application is running. Other agents will send `POST` requests to this URL to provide real-time updates on the status of tasks you have delegated to them (e.g., `IN_PROGRESS`, `COMPLETED`). |


### Definitive Guide to MCP (Model Context Protocol)

MCP is an advanced feature of the ART framework that allows an agent to dynamically discover and use tools from external, standardized servers. This is a powerful way to provide agents with a vast, ever-changing set of capabilities without needing to bundle all the tool logic within the client application.

#### Core Concepts

1.  **MCP Server**: A remote server that exposes a manifest of available tools, resources, and their schemas.
2.  **`McpManager`**: A core service within the ART framework that handles the entire lifecycle of interacting with MCP servers. It's responsible for discovering servers, registering their tools, and managing connections.
3.  **`McpProxyTool`**: When the `McpManager` discovers a tool on a server, it doesn't download the tool's logic. Instead, it creates and registers a local `McpProxyTool`. When the agent decides to use this tool, the proxy tool handles the communication with the remote MCP server to execute the logic and return the result. This is all seamless to the agent.
4.  **Discovery**: The `McpManager` can find MCP servers by querying a discovery endpoint. This allows a central service to maintain a directory of available tools and servers.

#### How to Use MCP

Using MCP is primarily a configuration task. The `McpManager` is designed to automate most of the complexity.

**Step 1: Enable MCP in the `ArtInstanceConfig`**

The first step is to enable the `McpManager` in your main configuration.

```typescript
const artConfig: ArtInstanceConfig = {
  // ... other properties
  mcpConfig: {
    enabled: true,
    // Optional: If you have a custom discovery service, specify its URL.
    // discoveryEndpoint: 'https://my-internal-mcp-directory.com/api/servers'
  },
  // ... other properties
};
```

**Step 2: Let the `McpManager` Discover and Register Tools**

When `createArtInstance` is called with MCP enabled, the `McpManager` will automatically:
1.  Query the discovery endpoint to get a list of available MCP servers.
2.  For each discovered server, it will read the manifest of tools.
3.  For each tool in the manifest, it will create an `McpProxyTool` and register it with the `ToolRegistry`.

From a developer's perspective, this happens automatically. The tools from the MCP server will now appear in the list of available tools just like locally registered tools (e.g., `CalculatorTool`).

**Step 3: Enable the Discovered Tools for a Thread**

Just like any other tool, a tool discovered via MCP must be enabled for a specific conversation thread before the agent can use it. You use the same `StateManager` methods as before.

```typescript
// Let's assume MCP discovered a tool named 'image_generator'

const initialThreadConfig: ThreadConfig = {
  // ... other properties
  enabledTools: [
    'image_generator', // The name of the tool from the MCP server
    'CalculatorTool'
  ],
  // ... other properties
};

await art.stateManager.setThreadConfig(threadId, initialThreadConfig);
```

**Step 4: The Agent Uses the Tool**

Now, the agent can use the MCP-provided tool seamlessly.

```typescript
// The user asks a question that requires the MCP tool
await art.process({
  query: 'Generate an image of a blue cat.',
  threadId: threadId
});
```

Behind the scenes, the `McpProxyTool` for `image_generator` will handle the connection, authentication (if required), and communication with the remote MCP server.

#### Property Reference

**`ArtInstanceConfig.mcpConfig` (`McpManagerConfig`)**

This is the only object a developer needs to configure to get started with MCP.

| Property            | Type     | Description                                                                                                                                              |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`           | `boolean`  | Required. Set to `true` to enable the MCP system.                                                                                                        |
| `discoveryEndpoint` | `string` | Optional. A URL pointing to a service that returns a list of MCP server configurations. If not provided, it may default to a central Zyntopia registry. |

#### Authentication and CORS

MCP is designed to be secure.

*   **Authentication**: If an MCP server requires authentication (typically OAuth 2.0 PKCE), the `McpManager` will automatically handle the flow. The first time a user tries to use a tool from a secured server, the manager will initiate the login process (e.g., by opening a new tab for the user to sign in). Once authenticated, the connection is managed seamlessly.
*   **CORS**: For web browsers, the `McpManager` uses a companion browser extension (`art-mcp-permission-manager`) to handle Cross-Origin Resource Sharing (CORS) permissions, allowing the web application to securely communicate with different MCP servers. If the extension is not installed, the framework will prompt the user to install it.

### Practical Examples

#### 1. Starting a New Conversation

Before processing the first message in a new chat, you must set the initial `ThreadConfig`.

```typescript
import { ThreadConfig } from 'art-framework';

const art = await createArtInstance(artConfig);
const newThreadId = 'user-abc-chat-1';

const initialThreadConfig: ThreadConfig = {
  providerConfig: {
    providerName: 'openai',
    modelId: 'gpt-4o',
    adapterOptions: {
      apiKey: 'sk-your-secret-key'
    }
  },
  enabledTools: ['CalculatorTool'],
  historyLimit: 50
};

// Save the configuration for the new thread
await art.stateManager.setThreadConfig(newThreadId, initialThreadConfig);

// Now you can safely call process
const response = await art.process({
  query: 'Hello, world!',
  threadId: newThreadId
});
```

#### 2. Managing State within an Agent (Explicitly)

If you are building a custom agent with `stateSavingStrategy: 'explicit'`, you would get the state, modify it, and then save it back.

```typescript
// Inside your custom agent's logic...

// Get the current context
const context = await this.dependencies.stateManager.loadThreadContext(threadId);

// Initialize state if it doesn't exist
const currentState = context.state?.data || { conversationSummary: '' };

// ... your agent's logic modifies the state ...
currentState.conversationSummary = 'The user is asking about state management.';

// Explicitly save the updated state
await this.dependencies.stateManager.setAgentState(threadId, {
  data: currentState,
  version: 1
});
```

#### 3. Dynamically Enabling a Tool

Imagine a user wants to enable a "WeatherTool" mid-conversation.

```typescript
const threadId = 'user-abc-chat-1'; // The current conversation thread

// The user clicks a button in the UI to enable the tool
async function enableWeatherTool() {
  console.log('Enabling WeatherTool...');
  await art.stateManager.enableToolsForThread(threadId, ['WeatherTool']);
  console.log('WeatherTool enabled!');

  // Now, the agent can use this tool in subsequent turns.
  await art.process({
    query: 'What is the weather in London?',
    threadId: threadId
  });
}
```


### Definitive Guide to Tools and the Tool System

Tools are a core feature of the ART framework, allowing agents to extend their capabilities beyond simple text generation by interacting with external systems, APIs, or custom logic. The framework provides a structured way to define, register, and execute these tools.

#### Core Concepts

1.  **`ToolSchema`**: A JSON object that describes a tool to the LLM. It's the most critical piece for reliable tool usage. It tells the agent the tool's name, what it does, what input it needs, and provides examples. The agent uses this schema to decide when and how to use the tool.
2.  **`IToolExecutor`**: The interface that a tool class must implement. It has two main parts: the `schema` property and an `execute` method.
3.  **`ToolRegistry`**: A service, available via `art.toolRegistry`, that holds all the tools available to the ART instance. Tools must be registered here before they can be used.
4.  **`ToolSystem`**: An internal component that works with the `StateManager` and `ToolRegistry` to orchestrate the execution of tools called by the agent, handling permissions and logging. As a developer, you will primarily interact with the `ToolRegistry`.

#### Creating a Custom Tool: A Step-by-Step Guide

Let's create a simple but practical `WeatherTool`.

**Step 1: Implement the `IToolExecutor` Interface**

Create a new class that implements `IToolExecutor`. It needs a `schema` property and an `execute` method.

```typescript
// src/tools/WeatherTool.ts
import { IToolExecutor, ToolSchema, ExecutionContext, ToolResult } from 'art-framework';

export class WeatherTool implements IToolExecutor {
  // The schema is the most important part for the LLM.
  readonly schema: ToolSchema = {
    name: "get_weather_forecast",
    description: "Get the current weather forecast for a specific location.",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g., San Francisco, CA",
        },
        unit: {
          type: "string",
          description: "The temperature unit, either 'celsius' or 'fahrenheit'.",
          default: "fahrenheit"
        },
      },
      required: ["location"],
    },
    examples: [
        { 
            input: { location: "Boston, MA" }, 
            output: { forecast: "72 degrees and sunny" },
            description: "Get the weather for a US city."
        }
    ]
  };

  // The execute method contains the actual logic.
  async execute(
    input: { location: string; unit?: 'celsius' | 'fahrenheit' },
    context: ExecutionContext
  ): Promise<ToolResult> {
    try {
      // In a real application, you would call a real weather API here.
      // For this example, we'll return a mock forecast.
      const { location, unit } = input;
      const temperature = unit === 'celsius' ? 22 : 72;
      const forecast = `${temperature} degrees and sunny`;

      console.log(`WeatherTool: Fetched forecast for ${location}: ${forecast}`);

      // Return a successful result.
      return {
        callId: context.traceId || 'weather-call',
        toolName: this.schema.name,
        status: 'success',
        output: { forecast: forecast },
      };
    } catch (error: any) {
      // Handle any errors that occur during execution.
      return {
        callId: context.traceId || 'weather-call',
        toolName: this.schema.name,
        status: 'error',
        error: `Failed to get weather: ${error.message}`,
      };
    }
  }
}
```

**Step 2: Register the Tool**

In your main application setup, you register an instance of your new tool with the `ArtInstanceConfig`.

```typescript
import { WeatherTool } from './tools/WeatherTool';
import { CalculatorTool } from 'art-framework';

const artConfig: ArtInstanceConfig = {
  // ... other properties
  tools: [
    new WeatherTool(),
    new CalculatorTool() // You can register multiple tools
  ],
  // ... other properties
};
```

**Step 3: Enable the Tool for a Conversation**

Finally, you must enable the tool in the `ThreadConfig` for the conversation where you want it to be available.

```typescript
const initialThreadConfig: ThreadConfig = {
  // ... other properties
  enabledTools: [
    'get_weather_forecast', // Must match the 'name' in the tool's schema
    'CalculatorTool'
  ],
  // ... other properties
};

await art.stateManager.setThreadConfig(threadId, initialThreadConfig);
```

#### Property Reference

**`ToolSchema` Object**

| Property        | Type         | Description                                                                                                                                              |
| --------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | `string`     | Required. The unique name of the tool. This is the identifier the LLM will use. Use snake_case for best compatibility.                                  |
| `description`   | `string`     | Required. A detailed, clear description of what the tool does, its capabilities, and when it should be used. This is crucial for the LLM's reasoning.    |
| `inputSchema`   | `JsonSchema` | Required. A JSON Schema object defining the parameters the tool accepts, their types, descriptions, and which are required.                               |
| `outputSchema`  | `JsonSchema` | Optional. A JSON Schema object that describes the shape of the data in the `output` field of a successful `ToolResult`.                                     |
| `examples`      | `Array`      | Optional. An array of example objects (`{ input, output, description }`) that provide few-shot examples to the LLM, improving its accuracy.                |


#### `art.toolRegistry` Methods

While you typically register tools at initialization, you can also manage them dynamically.

| Method                     | Description                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `registerTool(tool)` | Registers a new tool instance with the framework. |
| `getToolExecutor(toolName)`       | Retrieves the executor instance for a registered tool.                      |
| `getAvailableTools()`    | Returns the schemas of all tools registered with the instance.                     |


### Practical Examples

#### 1. Starting a New Conversation

Before processing the first message in a new chat, you must set the initial `ThreadConfig`.

```typescript
import { ThreadConfig } from 'art-framework';

const art = await createArtInstance(artConfig);
const newThreadId = 'user-abc-chat-1';

const initialThreadConfig: ThreadConfig = {
  providerConfig: {
    providerName: 'openai',
    modelId: 'gpt-4o',
    adapterOptions: {
      apiKey: 'sk-your-secret-key'
    }
  },
  enabledTools: ['CalculatorTool'],
  historyLimit: 50
};

// Save the configuration for the new thread
await art.stateManager.setThreadConfig(newThreadId, initialThreadConfig);

// Now you can safely call process
const response = await art.process({
  query: 'Hello, world!',
  threadId: newThreadId
});
```

#### 2. Managing State within an Agent (Explicitly)

If you are building a custom agent with `stateSavingStrategy: 'explicit'`, you would get the state, modify it, and then save it back.

```typescript
// Inside your custom agent's logic...

// Get the current context
const context = await this.dependencies.stateManager.loadThreadContext(threadId);

// Initialize state if it doesn't exist
const currentState = context.state?.data || { conversationSummary: '' };

// ... your agent's logic modifies the state ...
currentState.conversationSummary = 'The user is asking about state management.';

// Explicitly save the updated state
await this.dependencies.stateManager.setAgentState(threadId, {
  data: currentState,
  version: 1
});
```

#### 3. Dynamically Enabling a Tool

Imagine a user wants to enable a "WeatherTool" mid-conversation.

```typescript
const threadId = 'user-abc-chat-1'; // The current conversation thread

// The user clicks a button in the UI to enable the tool
async function enableWeatherTool() {
  console.log('Enabling WeatherTool...');
  await art.stateManager.enableToolsForThread(threadId, ['WeatherTool']);
  console.log('WeatherTool enabled!');

  // Now, the agent can use this tool in subsequent turns.
  await art.process({
    query: 'What is the weather in London?',
    threadId: threadId
  });
}
```


### Definitive Guide to Provider Configuration

Provider configuration in the ART framework is a two-part process designed for flexibility and security.

1.  **Instance-Level Declaration (`ArtInstanceConfig`)**: You first declare all the provider adapters your application *might* use. This is done in the `providers` property of `ArtInstanceConfig`. You only specify the adapter's name and its class. You **do not** put API keys or other secrets here.
2.  **Thread-Level Configuration (`ThreadConfig`)**: Before you start a conversation, you create a `ThreadConfig` for that specific conversation thread. This is where you provide the specific details: which provider to use, what model, the API key, and any other parameters like temperature. This configuration is then saved for the thread using `art.stateManager.setThreadConfig()`.

This approach allows a single ART instance to handle multiple conversations (threads), each potentially using different providers, models, or API keys, without exposing secrets in the main instance configuration.

#### Property Reference

**1. `ArtInstanceConfig.providers` (`ProviderManagerConfig`)**

| Property                             | Type      | Description                                                                                             |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------- |
| `availableProviders`                 | `Array`   | A required array of `AvailableProviderEntry` objects, one for each adapter you want to make available.    |
| `maxParallelApiInstancesPerProvider` | `Number`  | Optional. Max concurrent active instances per API-based provider. Defaults to `5`.                        |
| `apiInstanceIdleTimeoutSeconds`      | `Number`  | Optional. Time in seconds an idle API adapter can exist before being removed from memory. Defaults to `300`. |

**`AvailableProviderEntry` Object**

| Property | Type    | Description                                                                                                   |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `name`     | `String`  | A unique key for the provider (e.g., `'openai'`, `'gemini'`). This name is used in `ThreadConfig`.         |
| `adapter`  | `Class`   | The actual adapter class imported from the framework (e.g., `OpenAIAdapter`, `GeminiAdapter`).              |
| `isLocal`  | `Boolean` | Optional. Set to `true` for local providers (like Ollama) to enforce singleton instance behavior. Defaults to `false`. |

**2. `ThreadConfig.providerConfig` (`RuntimeProviderConfig`)**

This object is set on a per-thread basis to configure the specific LLM to use.

| Property         | Type     | Description                                                                                                         |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `providerName`   | `String` | Required. The name of the provider to use. Must match a `name` from the `availableProviders` array.                 |
| `modelId`        | `String` | Required. The specific model identifier for the provider (e.g., `'gpt-4o'`, `'claude-3-opus-20240229'`).              |
| `adapterOptions` | `Object` | Required. An object containing provider-specific options. **This is where the API key goes**, along with other parameters like `temperature`, `baseURL`, etc. |

### Comprehensive and Corrected Code Example

This example demonstrates the complete, correct flow: configuring the instance, setting the thread-specific configuration, and then processing a message.

```typescript
import { 
  createArtInstance, 
  ArtInstanceConfig, 
  ThreadConfig,
  CalculatorTool,
  OpenAIAdapter, 
  GeminiAdapter 
} from 'art-framework';

// --- 1. Configure the ART Instance ---
// Note: No API keys or secrets are present here.

const artConfig: ArtInstanceConfig = {
  storage: { 
    type: 'indexedDB', 
    dbName: 'MyCorrectChatDB'
  },
  providers: {
    availableProviders: [
      { name: 'openai', adapter: OpenAIAdapter },
      { name: 'gemini', adapter: GeminiAdapter }
    ]
  },
  tools: [new CalculatorTool()],
  persona: {
    name: 'ConfigExpert',
    prompts: {
      synthesis: 'You explain configurations clearly.'
    }
  },
  logger: { level: 'info' }
};


// --- 2. Main Application Logic ---

async function initializeAndRun() {
  // Create the ART instance with the high-level configuration.
  const art = await createArtInstance(artConfig);
  console.log('ART Instance Initialized.');

  // --- 3. Set Up a New Conversation Thread ---
  const threadId = 'user-123-session-1';

  // Create the thread-specific configuration.
  // THIS is where you specify the provider, model, and API key.
  const threadConfig: ThreadConfig = {
    providerConfig: {
      providerName: 'openai', // Must match a name from availableProviders
      modelId: 'gpt-4o',
      adapterOptions: {
        apiKey: 'sk-your-real-openai-api-key', // Securely provide your API key here
        temperature: 0.7
      }
    },
    // Other thread settings
    enabledTools: ['CalculatorTool'],
    historyLimit: 20
  };

  // Save this configuration for the new thread.
  // This step is crucial and must be done before the first `process` call.
  await art.stateManager.setThreadConfig(threadId, threadConfig);
  console.log(`ThreadConfig set for threadId: ${threadId}`);
  
  // Now the ART instance is ready to process requests for this thread.
  console.log('Sending first message...');
  const response = await art.process({
    query: 'What is 2 + 2?',
    threadId: threadId
  });

  console.log('Final response:', response.response.content);
}

initializeAndRun().catch(console.error);
```

### Creating the Instance

Once you have your configuration object, creating the ART instance is a single asynchronous call:

```typescript
import { createArtInstance } from 'art-framework';

async function initializeArt() {
  try {
    // Use the desired configuration
    const art = await createArtInstance(basicBrowserConfig);
    console.log('ART Instance created successfully!');
    
    // Now you can use the 'art' object to process queries and interact with sockets.
    // const response = await art.process({ query: 'Hello!', threadId: 'thread-1' });
    
  } catch (error) {
    console.error('Failed to initialize ART instance:', error);
  }
}

initializeArt();
```

### `ArtInstance`

The object returned by `createArtInstance`. The example in `index.ts` shows it has a `process` method to interact with the agent. It also provides access to all the core managers and systems:

*   `process`: The main function to send a query to the agent.
*   `uiSystem`: Provides access to the UI sockets (`ConversationSocket`, `LLMStreamSocket`, etc.).
*   `stateManager`: Manages thread-specific configuration and state.
*   `conversationManager`: Manages the conversation history.
*   `toolRegistry`: Manages the registration and retrieval of tools.
*   `observationManager`: Manages the recording and retrieval of agent observations.
*   `authManager`: Manages authentication strategies.

```ts
const response = await art.process({ query: "Hello, world!" });
```

This detailed understanding will allow me to write a much more comprehensive guide.

## Building a UI

The framework provides "sockets" for building user interfaces, accessible via the `uiSystem` property on the `ArtInstance`.

*   **`ConversationSocket`**: This is the primary way to get the conversation history. A chatbot UI would subscribe to this socket to display messages. It can be accessed via `art.uiSystem.getConversationSocket()`.
*   **`ObservationSocket`**: This provides a stream of the agent's internal state, like tool calls. It's useful for debugging and showing the agent's "thought process".
*   **`LLMStreamSocket`**: This is crucial for real-time UI updates. It streams `StreamEvent` objects, which can be `TOKEN`, `METADATA`, `ERROR`, or `END`. The `TOKEN` events can even be differentiated by `tokenType` to distinguish between the agent's internal "thinking" and the final user-facing response. This is perfect for a "thinking..." indicator in the UI.

### Subscribing to Sockets

The sockets have a `subscribe` method. It takes a callback function and returns an `unsubscribe` function.

```ts
const art = await createArtInstance(config);

const unsubscribe = art.uiSystem.getConversationSocket().subscribe(
  (message: ConversationMessage) => {
    console.log('New message:', message);
    // Add the message to the UI
  },
  undefined, // No filter
  { threadId: 'my-conversation-thread' }
);

// Later, to clean up:
// unsubscribe();
```

## Next Steps for Learning

1.  ~~**Examine core interfaces**~~: (Done) I have a good understanding of `ArtInstance`, `ArtInstanceConfig`, `ConversationMessage`, `StreamEvent`, etc.
2.  ~~**Understand `ConversationSocket`**~~: (Done) I know how to access it via `art.uiSystem.getConversationSocket()` and how to subscribe to it.
3.  ~~**Investigate response streaming**~~: (Done) The `LLMStreamSocket` is the way to go for streaming responses. The `StreamEvent` provides rich information.
4.  **Simulate Project Setup**: Plan how to set up a simple web project (e.g., using Vite or just plain HTML/JS) that would import `art-framework` and use it.
5.  **Write a Basic Chatbot Implementation**: Based on the project setup, write the TypeScript code for a simple chatbot that:
    *   Initializes `art-framework`.
    *   Creates a new conversation thread.
    *   Subscribes to the `ConversationSocket` and `LLMStreamSocket`.
    *   Has an input field to send user messages.
    *   Displays the conversation history and streaming response.
6.  **Flesh out the guide**: Based on the chatbot implementation, write a step-by-step guide explaining how to build a chatbot from scratch using `art-framework`.
