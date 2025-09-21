# ART Framework State Management Concept

## Overview

The ART (Agentic Reactive Triad) Framework provides a robust and flexible state management system that allows agents to maintain persistent memory across conversation turns. This system is centered around three key concepts:

1. **ThreadConfig**: Configuration settings for a specific conversation thread
2. **AgentState**: Dynamic, evolving state data that agents can use as memory
3. **StateManager**: The orchestration layer that manages loading, saving, and caching of thread context

## Core Components

### ThreadConfig

`ThreadConfig` holds the configuration for a single conversation thread. This includes:

- Provider configuration (which LLM provider and model to use)
- Enabled tools for this thread
- History limit (how many past messages to retrieve)
- System prompt overrides
- Agent persona customizations

This configuration is typically set once when a new conversation starts and remains relatively static throughout the conversation.

### AgentState

`AgentState` represents the dynamic, evolving state of the agent for a specific thread. This serves as the agent's "memory" and can store:

- Conversation summaries
- User preferences
- Accumulated knowledge
- Any other data the agent needs to remember across turns

The `AgentState` interface is defined as:

```typescript
interface AgentState {
  data: any;
  version?: number;
  [key: string]: any;
}
```

This flexible structure allows agents to store any JSON-serializable data they need.

### ThreadContext

`ThreadContext` is a container that holds both `ThreadConfig` and `AgentState` for a thread:

```typescript
interface ThreadContext {
  config: ThreadConfig;
  state: AgentState | null;
}
```

### StateManager

The `StateManager` is the central service that orchestrates loading, saving, and caching of `ThreadConfig` and `AgentState`. It acts as an abstraction layer over the configured `StorageAdapter`.

Key features of the StateManager include:

1. **Thread Context Management**: Loading and saving complete thread contexts
2. **State Saving Strategies**: Supporting both explicit and implicit state saving
3. **Tool Permission Management**: Enabling/disabling tools for specific threads
4. **Configuration Management**: Managing thread-specific configurations

## State Saving Strategies

The ART framework supports two state saving strategies that can be configured when creating an ART instance:

### Explicit Strategy (Default)

In this mode, the agent's state is only saved when you explicitly call `art.stateManager.setAgentState()`. This gives you full control but requires you to manage state saving manually within your agent's logic.

```typescript
const config: ArtInstanceConfig = {
  // ... other config
  stateSavingStrategy: 'explicit'
};
```

### Implicit Strategy

In this mode, the `StateManager` automatically saves the `AgentState` at the end of a processing cycle, but only if it detects that the state object has been modified. It does this by keeping a snapshot of the state from when it was loaded and comparing it to the state after the agent has run.

```typescript
const config: ArtInstanceConfig = {
  // ... other config
  stateSavingStrategy: 'implicit'
};
```

## Storage Adapters

The state management system uses storage adapters to persist data. ART provides several built-in adapters:

1. **InMemoryStorageAdapter**: Keeps all data in memory (not persistent)
2. **IndexedDBStorageAdapter**: Uses browser's IndexedDB for client-side persistence
3. **SupabaseStorageAdapter**: Connects to a Supabase (Postgres) database for server-side/cloud persistence

## Working with State in Practice

### Initializing Thread Configuration

Before an agent can process requests for a new thread, you must set up its initial configuration:

```typescript
await art.stateManager.setThreadConfig(threadId, {
  providerConfig: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'your-api-key'
  },
  enabledTools: ['calculator', 'web-search'],
  historyLimit: 10
});
```

### Loading Thread Context

The agent automatically loads thread context when processing requests, but you can also load it manually:

```typescript
const context = await art.stateManager.loadThreadContext(threadId);
```

### Saving Agent State

With the explicit strategy, you explicitly save state:

```typescript
await art.stateManager.setAgentState(threadId, {
  data: {
    conversationSummary: 'User is asking about state management',
    preferences: { theme: 'dark' }
  },
  version: 1
});
```

With the implicit strategy, the state manager automatically detects changes and saves them at the end of the processing cycle.

### Modifying Thread Configuration

You can dynamically modify thread configurations:

```typescript
// Enable additional tools
await art.stateManager.enableToolsForThread(threadId, ['file-upload']);

// Disable tools
await art.stateManager.disableToolsForThread(threadId, ['web-search']);

// Get currently enabled tools
const tools = await art.stateManager.getEnabledToolsForThread(threadId);
```

## Advanced Features

### Tool Permission Management

The StateManager provides granular control over which tools are available to each thread:

```typescript
// Check if a tool is enabled
const isEnabled = await art.stateManager.isToolEnabled(threadId, 'calculator');

// Enable specific tools
await art.stateManager.enableToolsForThread(threadId, ['calculator', 'web-search']);

// Disable specific tools
await art.stateManager.disableToolsForThread(threadId, ['dangerous-tool']);
```

### Configuration Value Retrieval

You can retrieve specific configuration values:

```typescript
const model = await art.stateManager.getThreadConfigValue(threadId, 'providerConfig.model');
const historyLimit = await art.stateManager.getThreadConfigValue(threadId, 'historyLimit');
```

## Best Practices

1. **Initialize Configuration First**: Always set up the thread configuration before processing requests
2. **Use Appropriate Storage Adapter**: Choose the right storage adapter for your use case (memory for testing, IndexedDB for web apps, Supabase for server/cloud apps)
3. **Consider State Saving Strategy**: Use explicit strategy for fine-grained control, implicit for automatic management
4. **Handle State Updates Efficiently**: With implicit strategy, modify the state object in place rather than replacing it entirely
5. **Version Your State**: Use the version field in AgentState to track state schema changes

## Integration with Agent Processing

The state management system is deeply integrated with the agent processing flow:

1. **Context Loading**: Agent loads ThreadConfig and AgentState at the beginning of processing
2. **State Modification**: Agent can modify AgentState during processing
3. **Automatic Saving**: With implicit strategy, StateManager automatically saves modified state at the end
4. **Explicit Saving**: With explicit strategy, agent must call setAgentState to persist changes

This integration ensures that agents can maintain persistent memory across conversation turns while providing developers with flexible control over how that state is managed.