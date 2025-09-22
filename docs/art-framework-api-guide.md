# ART Framework Public API Guide

Welcome to the ART (Agentic Reasoning & Tool-use) Framework! This guide provides a comprehensive overview of the public API surface, helping you understand how to use, configure, and extend the framework.

The main entry point for the library is structured to provide a clear and intuitive experience for developers. For most common use cases, you'll only need `createArtInstance` and the associated configuration types.

## 1. Core Factory

This is the recommended starting point for all users. It simplifies setup by assembling all necessary components based on your configuration.

### `createArtInstance`

The main factory function to create and initialize a complete ART framework instance.

-   **Usage**: `createArtInstance(config: ArtInstanceConfig): Promise<ArtInstance>`
-   **Description**: This function takes a configuration object and returns a fully initialized instance of the ART framework, ready to process requests. It handles the instantiation and wiring of all underlying systems like storage, reasoning providers, tools, and agents.
-   **When to use**: Always use this function to create an ART instance. It ensures all components are set up correctly.
-   **See also**: `ArtInstanceConfig` for all available configuration options.

**Example:**
```ts
import { createArtInstance } from 'art-framework';
import type { ArtInstanceConfig } from 'art-framework';

const config: ArtInstanceConfig = {
  storage: { type: 'memory' },
  providers: {
    openai: { adapter: 'openai', apiKey: '...' }
  },
  tools: [new CalculatorTool()],
  persona: {
    name: 'MyAgent',
    prompts: {
      synthesis: 'You are MyAgent. Always answer in rhyme.'
    }
  }
};

const art = await createArtInstance(config);
const response = await art.process({ query: "Hello, world!" });
```

---

## 2. Primary Interfaces & Types

These are the core data structures, enums, and type definitions used throughout the framework. Use them to understand the shape of data and to build your own custom components.

### Core Interfaces (`@/core/interfaces`)

These interfaces define the contracts for key components of the ART framework. If you want to create your own agent, tool, or storage adapter, you should implement these interfaces.

### Core Types (`@/types`)

This module exports essential data structures, including:
-   Message formats (`ArtStandardMessage`).
-   Observation types.
-   Agent state definitions.
-   `ArtInstanceConfig`: The main configuration object for `createArtInstance`.
-   `AgentPersona`: Defines the agent's identity, including its name and system prompts.

### Provider Management Types (`@/types/providers`)

These types are useful for advanced scenarios, such as dynamically configuring LLM providers at runtime.
-   `ProviderManagerConfig`
-   `AvailableProviderEntry`
-   `RuntimeProviderConfig`
-   `ManagedAdapterAccessor`
-   `IProviderManager`

---

## 3. Built-in Components

ART comes with a set of pre-built components to get you started quickly.

### Agent Implementations

#### `PESAgent`

The default agent core implementation based on the **P**lan-**E**xecute-**S**ynthesize model.
-   **Description**: This agent is designed for general-purpose tasks. It first creates a plan, then executes tools according to the plan, and finally synthesizes the results into a final answer.
-   **When to use**: Use this as your default reasoning engine unless you have a specific need for a different agent architecture (e.g., ReAct, Chain-of-Thought).

### Storage Adapters

Storage adapters handle the persistence of conversation history and agent state.

#### `InMemoryStorageAdapter`

A non-persistent storage adapter that keeps all data in memory.
-   **When to use**: Ideal for testing, short-lived scripts, or any scenario where data persistence across sessions is not required. Data will be lost when the process terminates.

#### `IndexedDBStorageAdapter`

A persistent storage adapter that uses the browser's IndexedDB.
-   **When to use**: The recommended choice for web-based applications to persist data on the client-side. It's efficient and works offline.

#### `SupabaseStorageAdapter`

A persistent storage adapter for connecting to a Supabase (Postgres) database.
-   **When to use**: Suitable for server-side environments or applications that require data to be shared across users or persisted in the cloud.

### Reasoning Provider Adapters

These adapters connect ART to various Large Language Models (LLMs).

-   **`GeminiAdapter`**: For Google's Gemini models.
-   **`OpenAIAdapter`**: For OpenAI's models (e.g., GPT-3.5, GPT-4).
-   **`AnthropicAdapter`**: For Anthropic's Claude models.
-   **`OpenRouterAdapter`**: Acts as a proxy to a wide variety of models from different providers.
-   **`DeepSeekAdapter`**: For DeepSeek models.
-   **`OllamaAdapter`**: For running local LLMs through the Ollama service.

Each adapter comes with its own options type for specific configurations:
-   `GeminiAdapterOptions`
-   `OpenAIAdapterOptions`
-   `AnthropicAdapterOptions`
-   `OpenRouterAdapterOptions`
-   `DeepSeekAdapterOptions`
-   `OllamaAdapterOptions`

### Built-in Tools

#### `CalculatorTool`

A basic tool that allows the agent to evaluate mathematical expressions.
-   **When to use**: A good example of a simple tool. Include it when you expect the agent to perform calculations.

---

## 4. Advanced Systems & Managers

For developers who need to directly interact with or extend ART's internal systems.

### UI & Sockets

These components provide real-time data streams, useful for building custom user interfaces.

#### `ConversationSocket`

Provides a real-time connection to an agent's conversation history.
-   **When to use**: For building custom UI components that display the back-and-forth interaction between a user and the agent, like a chat window.

#### `ObservationSocket`

Provides a real-time stream of an agent's internal "thoughts" and actions.
-   **When to use**: For building developer tools, debug panels, or UIs that visualize the agent's reasoning process, such as tool calls and state changes.

#### `LLMStreamSocket`

Provides a real-time stream of the raw token output from the Language Model as it's being generated.
-   **When to use**: For creating a "typewriter" effect in the UI, showing the agent's response as it's being formed token by token. This provides immediate feedback to the user.
-   **Associated Types**:
    -   `StreamEventTypeFilter`: A type used to filter the events received from the LLM stream.

#### Rendering Execution Metadata (Run Metrics)

You can surface execution metrics like token counts, durations, and stop reasons in a small UI card by listening to the final agent event via the `ObservationSocket`.

-   **What to listen to**: Subscribe to `FINAL_RESPONSE` on `art.uiSystem.getObservationSocket()` scoped by `threadId`.
-   **Where the fields live**:
    -   From `ExecutionMetadata` (`response.metadata`): `totalDurationMs`, `llmCalls`, `toolCalls`.
    -   From `LLMMetadata` (`response.metadata.llmMetadata`): `inputTokens`, `outputTokens`, `timeToFirstTokenMs`, `stopReason`.

```tsx
import React from 'react';

type MetaMap = Record<string, any>;

export function RunMetricsCard({ art, threadId }: { art: any; threadId: string }) {
  const [meta, setMeta] = React.useState<MetaMap | null>(null);

  React.useEffect(() => {
    const observationSocket = art.uiSystem.getObservationSocket();
    const unsubscribe = observationSocket.subscribe(
      (observation: any) => {
        if (observation.type !== 'FINAL_RESPONSE') return;

        const response = observation.content; // AgentFinalResponse
        const exec = response.metadata;       // ExecutionMetadata
        const llm = exec.llmMetadata ?? {};   // LLMMetadata

        const totalInputTokens = llm.inputTokens ?? 0;
        const totalOutputTokens = llm.outputTokens ?? 0;
        const timeToFirstTokenMs = llm.timeToFirstTokenMs ?? undefined;
        const lastStopReason = llm.stopReason ?? undefined;

        const metaMap: MetaMap = {
          'Input Tokens': totalInputTokens,
          'Output Tokens': totalOutputTokens,
          'Total Tokens': totalInputTokens + totalOutputTokens,
          'First Token MS': timeToFirstTokenMs,
          'Total Time MS': exec.totalDurationMs,
          'Finish Reason': lastStopReason ?? 'stop',
          'LLM Calls': exec.llmCalls,
          'Tool Calls': exec.toolCalls,
        };
        setMeta(metaMap);
      },
      'FINAL_RESPONSE',
      { threadId }
    );

    return () => unsubscribe();
  }, [art, threadId]);

  if (!meta) return null;

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: 12,
      background: '#fff',
      maxWidth: 360
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Run Metrics</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6 }}>
        {Object.entries(meta).map(([label, value]) => (
          <React.Fragment key={label}>
            <div style={{ color: '#475569' }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{value ?? '—'}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

If you want earlier values for fields like "First Token MS" or an interim stop reason, also subscribe to the `LLMStreamSocket` and handle `METADATA` events (availability varies by adapter). Update the same state as tokens arrive, and let the `FINAL_RESPONSE` overwrite with authoritative values at the end.

---

## 6. Gemini Thinking Tokens & THOUGHTS Observations

The Gemini adapter now supports optional separation of thought (reasoning) tokens from response tokens on models that expose this feature (e.g., `gemini-2.5-*`).

### Enabling Thinking Output

Pass provider-specific options on the call:

```ts
const stream = await art.reasoningEngine.call(prompt, {
  threadId,
  stream: true,
  callContext: 'FINAL_SYNTHESIS',
  providerConfig, // your configured Gemini provider
  gemini: {
    thinking: { includeThoughts: true, thinkingBudget: 8096 }
  }
});
```

The adapter forwards these to the GenAI SDK via `config.thinkingConfig` and, when available, distinguishes thought vs response parts.

### Stream Event Token Typing

When thought markers are available, `StreamEvent.tokenType` will be set to one of the agent-context-aware variants:

-   `AGENT_THOUGHT_LLM_THINKING` / `AGENT_THOUGHT_LLM_RESPONSE`
-   `FINAL_SYNTHESIS_LLM_THINKING` / `FINAL_SYNTHESIS_LLM_RESPONSE`

If unsupported, tokens fall back to `...LLM_RESPONSE`.

### Observations: THOUGHTS

The `PESAgent` now emits `ObservationType.THOUGHTS` entries whenever a thinking token is received during planning or synthesis. Each observation contains:

-   `content.text`: the token text
-   `metadata.phase`: `planning` or `synthesis`
-   `metadata.tokenType`: the specific token type

### Metadata

When provided by the SDK, `LLMMetadata.thinkingTokens` is populated in the final `METADATA` stream event.

### Example: Streaming THOUGHTS to a UI element

```ts
// Given an initialized ART instance `art` and a known `threadId`
const obsSocket = art.uiSystem.getObservationSocket();

// Subscribe only to THOUGHTS for a specific thread
const unsubscribe = obsSocket.subscribe(
  (observation) => {
    if (observation.type !== ObservationType.THOUGHTS) return;

    const phase = observation.metadata?.phase; // 'planning' | 'synthesis'
    const token = typeof observation.content?.text === 'string' ? observation.content.text : '';

    // Route to your UI components
    if (phase === 'planning') {
      appendToPlanningThoughts(token); // your UI helper
    } else if (phase === 'synthesis') {
      appendToSynthesisThoughts(token); // your UI helper
    }
  },
  ObservationType.THOUGHTS,
  { threadId }
);

// Later, to stop streaming thoughts for this thread:
// unsubscribe();
```

#### `A2ATaskSocket`

Provides real-time updates on the status of tasks delegated between agents in a multi-agent system.
-   **When to use**: For building dashboards or monitoring tools that track the lifecycle of agent-to-agent tasks, showing statuses like `PENDING`, `IN_PROGRESS`, `COMPLETED`, or `FAILED`.

#### `UISystem`

Facade providing access to all UI sockets (`ConversationSocket`, `ObservationSocket`, `LLMStreamSocket`, `A2ATaskSocket`).
-   **When to use**: To conveniently retrieve socket instances without managing their lifecycles yourself.
-   **Example**:
```ts
const ui = art.uiSystem;
const conv = ui.getConversationSocket();
const obs = ui.getObservationSocket();
const llm = ui.getLlmStreamSocket();
const tasks = ui.getA2ATaskSocket();
```

### Authentication

#### `AuthManager`

Manages authentication strategies and token lifecycle for external services.
-   **When to use**: When your tools or providers require secure authentication (e.g., OAuth2). You can register different strategies with this manager to handle various auth flows.

#### `PKCEOAuthStrategy`

An implementation of the PKCE (Proof Key for Code Exchange) OAuth2 flow.
-   **When to use**: As a strategy in the `AuthManager` for services that support the PKCE flow. This is common in public clients and Single-Page Applications (SPAs).
-   **Configuration**: Use the `PKCEOAuthConfig` interface to configure the strategy.

#### `ApiKeyStrategy`

Simple API key authentication strategy.
-   **When to use**: For providers or tools that accept a static API key.
-   **Example**: Register with `AuthManager` and attach the key via headers or params.

#### `GenericOAuthStrategy`

Generic OAuth2 strategy for providers that follow standard OAuth flows.
-   **When to use**: When you need a configurable OAuth flow beyond PKCE specifics.
-   **Configuration**: `OAuthConfig`

#### `ZyntopiaOAuthStrategy`

Provider-specific OAuth strategy for Zyntopia integrations.
-   **When to use**: If integrating with Zyntopia services.
-   **Configuration**: `ZyntopiaOAuthConfig`

### MCP (Model Context Protocol)

MCP allows agents to dynamically discover and use tools and other resources from a server.

#### `McpManager`

The core manager for handling connections to MCP servers.
-   **When to use**: When integrating ART with an MCP server to dynamically load tools and resources, making the agent more extensible.
-   **Configuration**: `McpManagerConfig`

#### `McpProxyTool`

A special tool that acts as a proxy for all tools provided by an MCP server.
-   **When to use**: This is typically registered automatically when MCP is configured, but can be used manually for advanced MCP integrations.

#### `McpClientController`

A client for making direct requests to an MCP server.
-   **When to use**: If you need to interact with an MCP server's resources outside of the standard agent tool-use loop.

#### MCP Types

The following types are used for configuring and interacting with MCP servers:
-   `McpServerConfig`: Defines the connection details for an MCP server.
-   `McpToolDefinition`: The structure of a tool as defined by an MCP server.
-   `McpResource`: Represents a generic resource provided by the server.
-   `McpResourceTemplate`: Represents a template for creating resources.
-   `McpServerStatus`: Represents the health and status of the MCP server.

### A2A (Agent-to-Agent Communication)

These services enable agents to collaborate by delegating tasks to one another.

#### `AgentDiscoveryService`

A service for discovering other agents available on an A2A network.
-   **When to use**: When building collaborative agent systems where one agent needs to find another agent with a specific capability.
-   **Configuration**: `AgentDiscoveryConfig`

#### `TaskDelegationService`

A service for delegating tasks to other agents and monitoring their status.
-   **When to use**: After discovering a suitable agent, use this service to assign it a task and receive updates on its progress.
-   **Configuration**: `TaskDelegationConfig`

#### A2A Types

-   `TaskStatusResponse`: The object returned when checking the status of a delegated task.
-   `A2ATaskEvent`: Represents an event related to a delegated task (e.g., status change).
-   `A2ATaskFilter`: Used to filter which task events you want to listen for.

---

## 5. Utilities

Helper functions and classes.

### Managers & Registries (advanced)

These are advanced components for deeper customization and control.

#### `StateManager`

State manager for thread configuration and state with explicit/implicit save strategies.
-   **When to use**: When you need direct control over thread state persistence and retrieval.

#### `ToolRegistry`

In-memory registry for registering and querying tool executors.
-   **When to use**: To dynamically add, remove, or look up tools at runtime.

#### `ProviderManagerImpl`

Provider manager implementation controlling adapter lifecycles and concurrency.
-   **When to use**: For advanced control of provider adapters, including pooling, rate limits, and concurrency.

### `Logger` & `LogLevel`

A simple logging utility with configurable levels (`DEBUG`, `INFO`, `WARN`, `ERROR`).
-   **When to use**: For adding consistent logging throughout your custom components. An instance is available on `ArtInstance.logger`.
-   **Configuration**: `LoggerConfig`

### `generateUUID`

A function to generate RFC4122 v4 compliant UUIDs.
-   **When to use**: For creating unique identifiers for threads, messages, or other entities in your application.

---

## Framework Version

### `VERSION`

The current version of the ART Framework package.
-   **Usage**: `console.log(VERSION);`
-   **Value**: `'0.3.8'` (at the time of writing)
