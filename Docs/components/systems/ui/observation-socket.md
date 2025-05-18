# Deep Dive: `ObservationSocket`

The `ObservationSocket` is a specialized `TypedSocket` within ART's UI System, designed for broadcasting `Observation` objects. As the agent executes its tasks, various components record observations using the `ObservationManager`. The `ObservationManager`, in turn, uses the `ObservationSocket` to notify any interested subscribers (like UI components or logging services) about these newly recorded observations in real-time.

*   **Source:** `src/systems/ui/observation-socket.ts`
*   **Extends:** `TypedSocket<Observation, ObservationType | ObservationType[]>`
    *   `DataType` is `Observation`.
    *   `FilterType` is a single `ObservationType` enum value (e.g., `ObservationType.PLAN`) or an array of such types.

## Constructor

```typescript
constructor(observationRepository?: IObservationRepository)
```

*   `observationRepository?: IObservationRepository` (Optional): An instance of `IObservationRepository`.
    *   If provided, the `ObservationSocket` can use this repository to fulfill requests to its `getHistory()` method, allowing subscribers to fetch past observations.
    *   If not provided, `getHistory()` will log a warning and return an empty array.

## Key Methods

1.  **`subscribe(callback: (data: Observation) => void, filter?: ObservationType | ObservationType[], options?: { threadId?: string }): UnsubscribeFunction`**
    *   Inherited from `TypedSocket`.
    *   Registers a `callback` function to be invoked when a new `Observation` is notified that matches the optional `filter` and `options`.
    *   **`filter?: ObservationType | ObservationType[]`:**
        *   If provided, the callback will only be triggered if the `type` of the notified `Observation` matches the specified `ObservationType` (if a single type is given) or is one of the types in the array (if an array of types is given).
        *   If `undefined`, the callback receives observations of any type (subject to `options.threadId` filtering).
    *   **`options?: { threadId?: string }`:**
        *   If `options.threadId` is provided, the callback will only be triggered for observations belonging to that specific `threadId`.
        *   The `notifyObservation` method uses `targetThreadId` from the observation itself for this comparison.
    *   Returns an `UnsubscribeFunction` to remove the subscription.

2.  **`notifyObservation(observation: Observation): void`**
    *   This is a convenience method specific to `ObservationSocket` (internally calls `super.notify()`).
    *   **Purpose:** To broadcast a new `Observation` to all relevant subscribers.
    *   **Process:**
        1.  Logs the notification attempt, including observation ID, type, and threadId.
        2.  Calls `super.notify(observation, { targetThreadId: observation.threadId }, filterCheckFn)`.
            *   `targetThreadId: observation.threadId` ensures that only subscribers interested in this specific thread (or all threads) are considered.
            *   The `filterCheckFn` is an internal function passed to `super.notify` that implements the logic for matching the observation's `type` against the subscriber's `ObservationType` filter.

3.  **`async getHistory(filter?: ObservationType | ObservationType[], options?: { threadId?: string; limit?: number }): Promise<Observation[]>`**
    *   Overrides the optional `getHistory` method from `TypedSocket`.
    *   **Purpose:** To retrieve historical `Observation`s for a specific thread, potentially filtered by type.
    *   **Process:**
        1.  Checks if an `observationRepository` was configured. If not, logs a warning and returns `[]`.
        2.  Checks if `options.threadId` is provided. If not, logs a warning and returns `[]`.
        3.  Constructs an `ObservationFilter` object for the repository call:
            *   If `filter` (an `ObservationType` or array of types) is provided, it sets `observationFilter.types`.
            *   The `options.limit` is **not directly part of `ObservationFilter`** in `v0.2.7`. The `IObservationRepository.getObservations` method is expected to handle limiting if its underlying `StorageAdapter.query` supports it, or the repository itself might apply a limit. The socket logs a debug message if a limit is requested, reminding that repository implementation handles it.
        4.  Calls `await this.observationRepository.getObservations(options.threadId, observationFilter)`.
        5.  Returns the fetched observations.
    *   **Error Handling:** Catches errors from the repository, logs them, and returns an empty array.

## Usage Scenario

The `ObservationManager` is the primary component that calls `observationSocket.notifyObservation()`. When `ObservationManager.record()` successfully saves a new observation, it then notifies the `ObservationSocket`.

**Frontend/UI Integration (Conceptual):**

A UI component designed to display an agent's "thought process" or a log of its actions would:

1.  Obtain an instance of `ObservationSocket` (e.g., via `artInstance.uiSystem.getObservationSocket()`).
2.  When a specific agent interaction or thread is being monitored:
    *   Optionally, call `observationSocket.getHistory(undefined, { threadId: currentThreadId, limit: 20 })` to load some recent observations for display.
    *   Call `observationSocket.subscribe(newObservation => { /* Add newObservation to UI log */ }, [ObservationType.PLAN, ObservationType.TOOL_CALL, ObservationType.TOOL_EXECUTION, ObservationType.ERROR], { threadId: currentThreadId })` to listen for specific types of new observations in real-time for that thread.
    *   Store the returned `unsubscribe` function to call it when the UI component is unmounted or no longer needs updates for that thread.

This allows the UI to provide users with insights into the agent's internal workings and progress as it processes requests.