# Context System Guide (v0.2.4)

## Overview

The Context System (CS) is responsible for managing all the information an agent needs to maintain coherent, stateful, and relevant interactions within a specific conversation or task thread. It acts as the central hub for accessing:

1.  **Conversation History:** The sequence of user and AI messages exchanged within a thread.
2.  **Thread Configuration:** Settings specific to a thread, such as the LLM model to use, enabled tools, system prompts, and history limits.
3.  **Agent State:** Persistent, non-configuration state associated with a thread or user (e.g., user preferences, accumulated data).
4.  **Dynamic Context:** Information retrieved or generated at runtime to augment prompts (e.g., RAG results, file contents - basic implementation in v1.0).

The Context System relies heavily on the [Storage System](./StorageSystem.md) for persisting and retrieving this data, ensuring continuity across sessions (when using persistent adapters like `IndexedDBStorageAdapter`).

## Core Components

The Context System is primarily composed of Managers that provide high-level APIs for accessing context data, delegating the actual storage operations to underlying Repositories.

1.  **`StateManager`**:
    *   **Purpose:** Manages thread-specific configuration (`ThreadConfig`) and persistent agent state (`AgentState`).
    *   **Key Role:** Provides other systems (like Agent Core, Reasoning System, Tool System) with the necessary configuration for the current `threadId`. It ensures that the correct LLM, tools, and parameters are used for each specific thread. It also handles saving any changes made to the `AgentState` during an execution cycle.
    *   **Interaction:** Uses `StateRepository` to load/save config and state from the `StorageAdapter`.

2.  **`ConversationManager`**:
    *   **Purpose:** Manages the sequence of `ConversationMessage` objects for each thread.
    *   **Key Role:** Provides access to the message history needed for constructing prompts and allows the Agent Core to save new user and AI messages at the end of an execution cycle.
    *   **Interaction:** Uses `ConversationRepository` to load/save messages from the `StorageAdapter`.

3.  **`ContextProvider`**:
    *   **Purpose:** Gathers and formats dynamic, non-conversational context required for specific tasks (e.g., RAG).
    *   **Key Role (v1.0):** Basic implementation, primarily focused on potentially retrieving data from storage or other sources as needed for prompt augmentation (though advanced RAG is a future goal).
    *   **Interaction:** May interact with various repositories or external sources depending on the required context.

## Key Concepts & Data Structures

### 1. Thread ID (`threadId`)

The `threadId` is the **central key** used throughout the Context System (and the entire framework). All conversation history, configuration, and state are associated with a specific `threadId`. This allows the framework to manage multiple independent conversations or tasks concurrently. It is **mandatory** when calling `artInstance.process()`.

### 2. Thread Configuration (`ThreadConfig`)

Managed by the `StateManager`, this object holds settings that define how the agent should operate for a specific thread.

```typescript
interface ThreadConfig {
  reasoning: {
    adapter: string;  // Identifier for the reasoning adapter (e.g., 'openai')
    model: string;    // Specific model ID (e.g., 'gpt-4o')
    params?: Record<string, any>; // LLM parameters like temperature, max_tokens
  };
  enabledTools: string[]; // Array of tool names allowed for this thread
  historyLimit: number;  // Max number of messages to retrieve for history
  systemPrompt: string;  // Base instructions for the agent
  // Other potential thread-specific settings...
}
```

### 3. Agent State (`AgentState`)

Also managed by the `StateManager`, this object stores persistent, non-configuration data related to the thread or user. This could include user preferences, summaries, or intermediate results that need to persist across multiple `process` calls. Its structure is flexible.

```typescript
interface AgentState {
  // Example properties:
  userPreferences?: {
    responseFormat?: 'concise' | 'detailed';
  };
  accumulatedData?: any; 
  lastInteractionSummary?: string;
  // Application-specific state...
}
```

### 4. Thread Context (`ThreadContext`)

This is the combined object loaded by `StateManager.loadThreadContext`, containing both the configuration and the state for a given thread.

```typescript
interface ThreadContext {
  config: ThreadConfig;
  state: AgentState | null; // State might not exist for a new thread
}
```

### 5. Conversation Message (`ConversationMessage`)

Managed by the `ConversationManager`, this represents a single turn in the conversation.

```typescript
enum MessageRole { USER = "USER", AI = "AI" }

interface ConversationMessage {
  messageId: string; // Unique ID for the message
  threadId: string;  // The thread this message belongs to
  role: MessageRole;
  content: string;   // The text content of the message
  timestamp: number; // Unix timestamp (ms)
  metadata?: Record<string, any>; // Links to observations, tool calls, etc.
}
```

## Workflow Integration

The Context System components are used at various stages of the PES execution flow:

*   **Stage 1 (Initiation):** `StateManager.loadThreadContext` is called to fetch the configuration and state for the `threadId`.
*   **Stage 2 (Planning Context):**
    *   `ConversationManager.getMessages` retrieves history.
    *   `StateManager` provides `enabledTools` and `systemPrompt` from the loaded config.
*   **Stage 3 (Planning Call):** `StateManager` provides the `reasoning` configuration to the `ReasoningEngine`.
*   **Stage 4 (Tool Execution):** `StateManager.isToolEnabled` is used by the `ToolSystem` to verify permissions.
*   **Stage 5 (Synthesis Call):** `StateManager` provides `reasoning` config. `ConversationManager` might provide history again if needed by the prompt strategy.
*   **Stage 6 (Finalization):**
    *   `ConversationManager.addMessages` saves the new user and AI messages.
    *   `StateManager.saveStateIfModified` persists any changes to the `AgentState`.

## Managing Context

### Accessing Configuration and State

The `StateManager` is the primary interface for accessing thread-specific settings during an agent run.

```typescript
// Inside Agent Core or other components needing config:
const stateManager = props.stateManager; // Injected dependency
const threadId = props.threadId;

// Load the full context (config + state)
const threadContext = await stateManager.loadThreadContext(threadId);
const config = threadContext.config;
const state = threadContext.state;

// Get a specific config value
const llmModel = await stateManager.getThreadConfigValue<string>(threadId, 'reasoning.model');
const isCalcEnabled = await stateManager.isToolEnabled(threadId, 'CalculatorTool');

// Modify state (example - state object needs to be managed appropriately)
// state.userPreferences.responseFormat = 'detailed'; 
// stateManager.markStateAsModified(threadId); // Indicate state needs saving

// Save state at the end of the cycle (usually done by Agent Core)
await stateManager.saveStateIfModified(threadId); 
```

### Managing Conversation History

The `ConversationManager` handles adding and retrieving messages.

```typescript
const conversationManager = props.conversationManager; // Injected dependency
const threadId = props.threadId;

// Get recent history (respecting limits defined in ThreadConfig)
const historyOptions = { limit: threadContext.config.historyLimit };
const messages = await conversationManager.getMessages(threadId, historyOptions);

// Add new messages at the end of the cycle
const userMsg: ConversationMessage = { /* ... */ };
const aiMsg: ConversationMessage = { /* ... */ };
await conversationManager.addMessages(threadId, [userMsg, aiMsg]);
```

## Persistence

The effectiveness of the Context System relies on the configured `StorageAdapter`.

*   **`InMemoryStorageAdapter`**: Context (history, state, config) exists only for the duration of the application's runtime. Useful for testing or ephemeral agents.
*   **`IndexedDBStorageAdapter`**: Context is persisted in the browser's IndexedDB. Conversations and state will be retained across page reloads and browser sessions. This is the recommended adapter for most browser-based applications requiring persistence.

The choice of adapter is made during `createArtInstance` initialization.

## Related Guides

*   [Storage System Guide](./StorageSystem.md)
*   [Agent Core Guide](./AgentCore.md)
*   [Basic Usage Tutorial](../BasicUsage.md)