# State Management in ART

Effective state management is crucial for AI agents to maintain context, remember preferences, and provide coherent, multi-turn interactions. The ART Framework provides a robust **Context System** with a central `StateManager` to handle this.

## Key Components

*   **`StateManager` (`src/systems/context/managers/StateManager.ts`):**
    *   The primary service for managing thread-specific configuration (`ThreadConfig`) and persistent agent state (`AgentState`).
    *   It interacts with an underlying `IStateRepository` to load and save this data.
    *   Crucially, its behavior regarding `AgentState` persistence is influenced by the `StateSavingStrategy` defined in `ArtInstanceConfig`.
*   **`IStateRepository` (`src/core/interfaces.ts`):**
    *   An interface defining how `ThreadContext` (which bundles `ThreadConfig` and `AgentState`) is stored and retrieved.
    *   Implemented by `StateRepository` (`src/systems/context/repositories/StateRepository.ts`), which uses a generic `StorageAdapter` (like `InMemoryStorageAdapter` or `IndexedDBStorageAdapter`) for actual persistence.
*   **`ThreadContext` (`src/types/index.ts`):**
    *   An object holding both the `ThreadConfig` and `AgentState` for a specific conversation thread.
    *   `config: ThreadConfig`: Contains settings like enabled tools, LLM provider details for the thread, history limits, and system prompts.
    *   `state: AgentState | null`: Holds arbitrary, persistent data specific to the agent's operation within that thread (e.g., user preferences, accumulated knowledge, intermediate task results). Can be `null` if no state has been set.
*   **`StateSavingStrategy` (`src/types/index.ts`):**
    *   An important configuration option set in `ArtInstanceConfig` when calling `createArtInstance`.
    *   It dictates how `AgentState` is saved by the `StateManager`.

## `StateSavingStrategy`: Explicit vs. Implicit

The `StateSavingStrategy` significantly impacts how `AgentState` is persisted.

1.  **`'explicit'` (Default Strategy):**
    *   **Behavior:** `AgentState` is **only** saved when the agent logic explicitly calls `StateManager.setAgentState(threadId, newState)`.
    *   The `StateManager.saveStateIfModified(threadId)` method (which `PESAgent` calls at the end of its `process` cycle) becomes a **no-op** for `AgentState` persistence in this mode. It will *not* automatically save changes made to `AgentState` during the agent's operation.
    *   **Use Case:** Gives developers full control over when `AgentState` is written to storage. Suitable when state changes are deliberate and should not happen automatically after every interaction.
    *   **Example:**
        ```typescript
        // In agent logic, after loading context via stateManager.loadThreadContext(threadId)
        // context.state.someProperty = 'new value'; // This change IS NOT automatically saved

        // To save it explicitly:
        // await stateManager.setAgentState(threadId, context.state);
        ```

2.  **`'implicit'`:**
    *   **Behavior:**
        *   When `StateManager.loadThreadContext(threadId)` is called, the `StateManager` caches the loaded `ThreadContext` and internally creates a snapshot (e.g., a JSON string) of the initial `AgentState`.
        *   The agent logic receives and can modify this cached `ThreadContext.state` object directly.
        *   When `StateManager.saveStateIfModified(threadId)` is called (typically by `PESAgent` at the end of its processing cycle):
            *   The `StateManager` compares the current `AgentState` in its cache (which might have been modified by the agent) with the initial snapshot.
            *   If they are different, the `StateManager` automatically calls `IStateRepository.setAgentState(threadId, currentState)` to persist the changes.
            *   The internal snapshot is then updated to reflect the newly saved state.
        *   Explicit calls to `StateManager.setAgentState(threadId, newState)` will still save the state immediately and also update the internal snapshot in the `StateManager`.
    *   **Use Case:** Convenient for scenarios where any modification to the `AgentState` object during an agent's turn should be automatically persisted. Reduces boilerplate for saving state.
    *   **Example:**
        ```typescript
        // ArtInstanceConfig: { ..., stateSavingStrategy: 'implicit', ... }

        // In agent logic, after loading context via stateManager.loadThreadContext(threadId)
        // context.state.someProperty = 'new value'; // This change WILL BE automatically saved
                                                 // when PESAgent calls saveStateIfModified.
        ```

**Choosing a Strategy:**

*   Use **`'explicit'`** if you need fine-grained control over state persistence, want to minimize writes, or if state changes are complex and shouldn't be saved automatically after every turn.
*   Use **`'implicit'`** for simpler state management where automatic persistence of any changes to the `AgentState` object during an agent's turn is desired.

## `StateManager` Key Methods

*   **`async loadThreadContext(threadId: string, userId?: string): Promise<ThreadContext>`:**
    *   Loads the `ThreadConfig` and `AgentState` for the given `threadId`.
    *   If `stateSavingStrategy` is `'implicit'`, it caches the context and snapshots the `AgentState`.
    *   Throws an error if the context is not found (application should call `setThreadConfig` for new threads).

*   **`async isToolEnabled(threadId: string, toolName: string): Promise<boolean>`:**
    *   Loads the thread context (respecting caching if `'implicit'`) and checks if `toolName` is in `ThreadConfig.enabledTools`.
    *   Returns `false` if context/config cannot be loaded or tool is not listed.

*   **`async getThreadConfigValue<T>(threadId: string, key: string): Promise<T | undefined>`:**
    *   Loads the thread context and retrieves a top-level value from `ThreadConfig` by its `key`.
    *   Does *not* support deep/nested key access (e.g., `'reasoning.model'`).

*   **`async saveStateIfModified(threadId: string): Promise<void>`:**
    *   Crucial method, especially for the `'implicit'` strategy.
    *   If `'explicit'`, it's a no-op for `AgentState`.
    *   If `'implicit'`, compares the current cached `AgentState` with its initial snapshot. If different, saves the state via the repository.

*   **`async setThreadConfig(threadId: string, config: ThreadConfig): Promise<void>`:**
    *   Explicitly sets or overwrites the `ThreadConfig` for a thread.
    *   If context was cached (in `'implicit'` mode), it's cleared to ensure fresh data on next load.

*   **`async setAgentState(threadId: string, state: AgentState): Promise<void>`:**
    *   Explicitly sets or overwrites the `AgentState` for a thread.
    *   Requires `ThreadConfig` to exist for the thread.
    *   If `stateSavingStrategy` is `'implicit'`, this method also updates the `StateManager`'s internal snapshot of the state to prevent an immediate re-save by `saveStateIfModified`.

## Interaction with `PESAgent`

The `PESAgent` interacts with the `StateManager` as follows:

1.  At the beginning of `process()`: Calls `loadThreadContext()` to get the current configuration and state.
2.  During planning/execution: May call `isToolEnabled()` or `getThreadConfigValue()` to make decisions.
3.  Agent logic might modify `context.state` directly (especially in `'implicit'` mode) or call `setAgentState()` (especially in `'explicit'` mode or for deliberate saves in `'implicit'` mode).
4.  At the end of `process()` (in a `finally` block): Calls `saveStateIfModified()` to ensure state is persisted according to the chosen strategy.

Understanding `StateManager` and `StateSavingStrategy` is key to controlling how your ART agent remembers information and preferences across interactions.