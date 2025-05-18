# Deep Dive: `StateRepository`

The `StateRepository` is a specialized repository within ART's Context System responsible for persisting and retrieving the complete `ThreadContext` for each conversation thread. A `ThreadContext` object encapsulates both the `ThreadConfig` (configuration settings for the thread) and the `AgentState` (persistent operational state for the agent within that thread).

*   **Source:** `src/systems/context/repositories/StateRepository.ts`
*   **Implements:** `IStateRepository` from `src/core/interfaces.ts`
*   **Dependencies:** `StorageAdapter`.

## Constructor

```typescript
constructor(storageAdapter: StorageAdapter)
```

*   `storageAdapter`: An instance of a class implementing the `StorageAdapter` interface. This adapter handles the actual storage of `ThreadContext` objects.
    *   The constructor throws an error if `storageAdapter` is not provided.
    *   It assumes the `storageAdapter` is already initialized.

## Core Responsibilities & Data Structure

The `StateRepository` typically uses a collection named `"state"` within the `StorageAdapter`.

*   **Keying:** Each `ThreadContext` is stored under a key equal to its `threadId`.
*   **Stored Object (`StoredThreadContext`):** Internally, when saving, the `threadId` is also added as an `id` property to the `ThreadContext` object itself. This is for compatibility with `StorageAdapter` implementations (like `IndexedDBStorageAdapter`) that might use `{ keyPath: 'id' }` for their object stores.
    ```typescript
    // Internal structure used for storage
    type StoredThreadContext = ThreadContext & { id: string };
    ```
    When data is retrieved, this internal `id` property is removed before returning the `ThreadContext` to ensure it strictly matches the interface.

## Methods

1.  **`async getThreadContext(threadId: string): Promise<ThreadContext | null>`**
    *   **Purpose:** Retrieves the complete `ThreadContext` (config and state) for a given `threadId`.
    *   **Process:**
        1.  Calls `this.adapter.get<StoredThreadContext>(this.collectionName, threadId)`.
        2.  If a `StoredThreadContext` is found:
            *   It creates a copy of the object.
            *   Deletes the internal `id` property from this copy.
            *   Returns the cleaned `ThreadContext` object.
        3.  If not found, returns `null`.
    *   **Error Handling:** Propagates errors from the `storageAdapter.get()` call.

2.  **`async setThreadContext(threadId: string, context: ThreadContext): Promise<void>`**
    *   **Purpose:** Saves or overwrites the complete `ThreadContext` for a `threadId`.
    *   **Process:**
        1.  Validates that the provided `context` object has a `config` property (as `ThreadConfig` is mandatory). If not, it rejects the promise.
        2.  Creates a `StoredThreadContext` object by spreading the input `context` and adding an `id: threadId` property.
        3.  Calls `this.adapter.set<StoredThreadContext>(this.collectionName, threadId, contextToStore)`.
    *   **Error Handling:** Propagates errors from the `storageAdapter.set()` call.

3.  **`async getThreadConfig(threadId: string): Promise<ThreadConfig | null>`**
    *   **Purpose:** Retrieves only the `ThreadConfig` portion for a `threadId`.
    *   **Process:**
        1.  Calls `this.getThreadContext(threadId)`.
        2.  If a context is found, returns `context.config`.
        3.  Otherwise, returns `null`.

4.  **`async setThreadConfig(threadId: string, config: ThreadConfig): Promise<void>`**
    *   **Purpose:** Sets or updates only the `ThreadConfig` for a `threadId`, preserving any existing `AgentState`.
    *   **Process:**
        1.  Calls `this.getThreadContext(threadId)` to fetch the current context.
        2.  Constructs a new `ThreadContext` object:
            *   Uses the provided `config`.
            *   Uses `currentContext.state` if `currentContext` and `currentContext.state` exist, otherwise sets `state` to `null`.
        3.  Calls `this.setThreadContext(threadId, newContext)` to save the updated full context.

5.  **`async getAgentState(threadId: string): Promise<AgentState | null>`**
    *   **Purpose:** Retrieves only the `AgentState` portion for a `threadId`.
    *   **Process:**
        1.  Calls `this.getThreadContext(threadId)`.
        2.  If a context is found, returns `context.state` (which could be an `AgentState` object or `null`).
        3.  Otherwise, returns `null`.

6.  **`async setAgentState(threadId: string, state: AgentState | null): Promise<void>`**
    *   **Purpose:** Sets or updates only the `AgentState` for a `threadId`, preserving the existing `ThreadConfig`.
    *   **Process:**
        1.  Calls `this.getThreadContext(threadId)` to fetch the current context.
        2.  **Validation:** If `currentContext` or `currentContext.config` is not found (meaning no configuration has been set for this thread yet), it rejects the promise with an error. `AgentState` cannot be set without an existing `ThreadConfig`.
        3.  Constructs a new `ThreadContext` object:
            *   Uses `currentContext.config`.
            *   Uses the provided `state` (which can be an `AgentState` object or `null` to clear the state).
        4.  Calls `this.setThreadContext(threadId, newContext)` to save the updated full context.

## Usage

The `StateManager` is the primary consumer of the `StateRepository`. It uses these methods to:

*   Load the initial `ThreadContext` at the start of an agent's processing cycle.
*   Allow the agent or application to explicitly set/update `ThreadConfig` or `AgentState`.
*   Persist `AgentState` changes (especially when `StateSavingStrategy` is 'implicit' and `StateManager.saveStateIfModified` is called).

By centralizing context storage through the `StateRepository`, ART ensures a consistent approach to managing the essential configuration and persistent data associated with each conversation thread.