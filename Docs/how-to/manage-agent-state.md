# How-To: Manage Agent State (`StateSavingStrategy`)

The ART Framework provides flexibility in how an agent's persistent operational state (`AgentState`) is managed and saved. This is primarily controlled by the `StateSavingStrategy` option in your `ArtInstanceConfig`, which influences the behavior of the `StateManager`.

**Recall `AgentState`:**
An `AgentState` object (`src/types/index.ts`) typically holds arbitrary, application-defined data that needs to persist for an agent within a specific conversation thread. For example:
```typescript
interface MyAgentStateData {
  userPreferences?: {
    language?: string;
    notificationLevel?: 'all' | 'mentions';
  };
  lastTaskSummary?: string;
  accumulatedData?: any[];
}

// An AgentState object
const agentStateExample: AgentState = {
  data: { // The application-defined payload
    userPreferences: { language: 'en-US' },
    lastTaskSummary: "Booked flight to Mars."
  },
  version: 1 // Optional versioning
};
```

## Understanding `StateSavingStrategy`

When you configure your ART instance using `createArtInstance`, you can set `ArtInstanceConfig.stateSavingStrategy`. It can be one of two values:

1.  **`'explicit'` (Default):**
    *   In this mode, `AgentState` is **only** saved to persistent storage when your agent logic explicitly calls `stateManager.setAgentState(threadId, newState)`.
    *   If your agent modifies the `state` object it received from `stateManager.loadThreadContext()`, these changes **will not** be automatically saved at the end of the processing cycle by `PESAgent`'s call to `stateManager.saveStateIfModified()`. That method becomes a no-op for `AgentState` in this strategy.
    *   **When to use:**
        *   You need fine-grained control over when state is persisted.
        *   State changes are significant and shouldn't happen automatically after every minor interaction.
        *   You want to minimize writes to the storage layer.

2.  **`'implicit'`:**
    *   In this mode, the `StateManager` helps automate state saving.
    *   **Loading:** When `stateManager.loadThreadContext(threadId)` is called:
        1.  It fetches the `ThreadContext` from the repository.
        2.  It **deep clones** this context and stores this clone in an internal cache for the current `StateManager` instance and processing cycle.
        3.  It creates a JSON snapshot of the `AgentState` part of this *cloned context*. This snapshot serves as the "original" version for comparison later.
        4.  The agent logic receives this (cloned and cached) `ThreadContext`.
    *   **Modification:** Your agent logic can directly modify the `context.state` object it received (e.g., `context.state.data.userPreferences.language = 'fr-FR';`).
    *   **Saving:** When `stateManager.saveStateIfModified(threadId)` is called (typically by `PESAgent` at the end of its `process` method):
        1.  The `StateManager` retrieves the current (potentially modified) `AgentState` from its internal cache for that `threadId`.
        2.  It creates a JSON snapshot of this current cached `AgentState`.
        3.  It compares this new snapshot with the `originalStateSnapshot` taken during `loadThreadContext`.
        4.  **If the snapshots differ**, the `StateManager` calls `stateRepository.setAgentState(threadId, currentState)` to persist the changes. It then updates its internal `originalStateSnapshot` to this newly saved state.
        5.  If the snapshots are the same, no save operation occurs.
    *   **Explicit Saves Still Work:** Even in `'implicit'` mode, calling `stateManager.setAgentState(threadId, newState)` will still explicitly save the state and also update the `StateManager`'s internal cache and snapshot for that thread.
    *   **When to use:**
        *   Convenience is desired, and any modification to `AgentState` during an agent's turn should generally be persisted.
        *   Reduces boilerplate for saving state.

## Example: Configuring the Strategy

```typescript
// src/config/art-config.ts
import { ArtInstanceConfig, LogLevel } from 'art-framework';

export const explicitSavingConfig: ArtInstanceConfig = {
  storage: { type: 'memory' },
  providers: { /* ... */ },
  stateSavingStrategy: 'explicit', // Explicitly set
  logger: { level: LogLevel.DEBUG }
};

export const implicitSavingConfig: ArtInstanceConfig = {
  storage: { type: 'memory' },
  providers: { /* ... */ },
  stateSavingStrategy: 'implicit', // Use implicit saving
  logger: { level: LogLevel.DEBUG }
};
```

## Example: Agent Logic with `'explicit'` Strategy

```typescript
// Conceptual agent logic (e.g., inside a custom IAgentCore or PESAgent modification)
// Assuming 'stateManager' is an injected StateManager instance.
// ArtInstanceConfig.stateSavingStrategy = 'explicit';

async function handleUserPreferenceUpdate(threadId: string, newLanguage: string) {
    const context = await stateManager.loadThreadContext(threadId);
    if (!context) throw new Error("Context not found");

    // Ensure state and data objects exist
    if (!context.state) {
        context.state = { data: {} };
    }
    if (!context.state.data.userPreferences) {
        context.state.data.userPreferences = {};
    }

    // Modify the state
    context.state.data.userPreferences.language = newLanguage;
    Logger.info(`Agent state modified (language to ${newLanguage}), but not yet saved.`);

    // To persist this change, we MUST call setAgentState:
    await stateManager.setAgentState(threadId, context.state);
    Logger.info(`Agent state explicitly saved for thread ${threadId}.`);

    // If PESAgent calls stateManager.saveStateIfModified(threadId) later,
    // it will be a no-op for this AgentState change because the strategy is 'explicit'.
}
```

## Example: Agent Logic with `'implicit'` Strategy

```typescript
// Conceptual agent logic
// ArtInstanceConfig.stateSavingStrategy = 'implicit';

async function updateUserLastTask(threadId: string, taskSummary: string) {
    const context = await stateManager.loadThreadContext(threadId); // Loads and caches state, snapshots original
    if (!context) throw new Error("Context not found");

    // Ensure state and data objects exist
    if (!context.state) {
        context.state = { data: {} };
    }

    // Modify the state object received from loadThreadContext
    context.state.data.lastTaskSummary = taskSummary;
    Logger.info(`Agent state modified (lastTaskSummary to "${taskSummary}"). Will be saved implicitly if different.`);

    // NO explicit call to stateManager.setAgentState() is strictly needed here
    // for this particular change to be saved.

    // Later, when (for example) PESAgent calls stateManager.saveStateIfModified(threadId):
    // The StateManager will compare the current context.state.data.lastTaskSummary
    // with the snapshot taken during loadThreadContext. If it changed, it saves.
}

// If you still want to force an immediate save within the turn in implicit mode:
async function forceSaveNow(threadId: string, updatedState: AgentState) {
    await stateManager.setAgentState(threadId, updatedState);
    // This also updates the StateManager's internal snapshot, so saveStateIfModified
    // won't try to save it again unless it's modified further *after* this call.
    Logger.info(`Agent state explicitly saved (even in implicit mode) for thread ${threadId}.`);
}
```

## Important Considerations for `'implicit'` Strategy:

*   **Object Modification:** For implicit saving to work, your agent logic **must modify the `state` object that was part of the `ThreadContext` returned by `loadThreadContext()`**. If you create a completely new state object and assign it to `context.state` (e.g., `context.state = { data: { newStuff: true } };`), this new object reference will be detected as a change.
*   **Deep Cloning:** `StateManager` deep clones the context upon loading in implicit mode and when `setAgentState` is called in implicit mode to update the cache. This ensures that the snapshot comparison is reliable and that the agent is working with a mutable copy.
*   **Null State:** If `context.state` is initially non-null and your agent sets `context.state = null;`, `saveStateIfModified` in `'implicit'` mode will detect this as a change. However, the current `StateRepository.setAgentState` does not allow saving `null` directly (it expects an `AgentState` object or will set state to null if passed null in its own `setAgentState` method). For implicit "clearing" of state by setting it to `null`, the `StateManager` currently logs a warning and doesn't persist the `null` state via `setAgentState` to avoid this error. To clear state, it's better to set `context.state = { data: null, version: newVersionIfApplicable };` or use `stateManager.setAgentState` explicitly with such an object.

Choose the `StateSavingStrategy` that best fits your agent's complexity and your preferences for state persistence control.