# Deep Dive: `ObservationManager`

The `ObservationManager` is the central service within ART's Observation System. Its primary role is to facilitate the creation, persistence, and real-time broadcasting of `Observation` records. These observations capture significant events and data points that occur during an agent's execution cycle, providing crucial insights for debugging, monitoring, and UI updates.

*   **Source:** `src/systems/observation/observation-manager.ts`
*   **Implements:** `ObservationManager` interface from `src/core/interfaces.ts`
*   **Dependencies:** `IObservationRepository`, `ObservationSocket` (from `UISystem`).

## Constructor

```typescript
constructor(
    observationRepository: IObservationRepository,
    observationSocket: ObservationSocket
)
```

*   `observationRepository`: An instance implementing `IObservationRepository` (typically `ObservationRepository`). This is used to save new `Observation` objects to the configured storage.
*   `observationSocket`: An instance of `ObservationSocket`. The manager uses this to `notify` subscribers (e.g., the UI) whenever a new observation is recorded.

## Core Responsibilities & Methods

1.  **Recording Observations:**
    *   **`async record(observationData: Omit<Observation, 'id' | 'timestamp' | 'title'>): Promise<void>`**
        *   **Purpose:** This is the main method used by various ART components (like `PESAgent`, `ToolSystem`) to log an event.
        *   **Process:**
            1.  **Enrichment:** Takes `observationData` (which includes `threadId`, `type`, `content`, and optional `traceId`, `metadata`) and enriches it by:
                *   Generating a unique `id` for the observation using `generateUUID()`.
                *   Setting the current `timestamp` using `Date.now()`.
                *   Creating a default `title` string, typically in the format "`<ObservationType>` Recorded" (e.g., "PLAN Recorded", "TOOL_EXECUTION Recorded").
            2.  **Persistence:** Calls `this.observationRepository.addObservation(fullObservation)` to save the complete `Observation` object using the underlying repository.
            3.  **Notification:** After successful persistence, it calls `this.observationSocket.notify(fullObservation, { targetThreadId: fullObservation.threadId })`. This broadcasts the newly recorded observation to any subscribers listening on the `ObservationSocket`, filtered by `threadId`.
        *   **Error Handling:**
            *   If `observationRepository.addObservation()` fails (e.g., due to a storage adapter error), the error is re-thrown, and the socket notification will not occur.
            *   If `observationSocket.notify()` fails, an error is logged to the console, and the method re-throws the error. This means a notification failure can cause the `record` operation to be perceived as failed by the caller. (This behavior could be adjusted if notifications are considered non-critical for the success of recording itself).

2.  **Retrieving Observations:**
    *   **`async getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]>`**
        *   **Purpose:** To fetch historical `Observation`s for a given `threadId`.
        *   **Process:**
            1.  Delegates directly to `this.observationRepository.getObservations(threadId, filter)`.
            2.  The `filter` parameter (`ObservationFilter`) can be used to specify:
                *   `types?: ObservationType[]`: An array of `ObservationType`s to include.
                *   `beforeTimestamp?: number`: Retrieve observations recorded before this time.
                *   `afterTimestamp?: number`: Retrieve observations recorded after this time.
            3.  Returns the array of `Observation` objects fetched by the repository. The repository typically sorts these chronologically by timestamp.
        *   **Error Handling:** Propagates errors from the `observationRepository.getObservations()` call.

## How Observations are Created and Used

*   **Agent Core (`PESAgent`):** Records observations at various stages of its Plan-Execute-Synthesize cycle:
    *   `PLAN`: When starting the planning LLM call.
    *   `INTENT`, `PLAN` (details), `TOOL_CALL`: After parsing the planning LLM's output.
    *   `SYNTHESIS`: When starting the synthesis LLM call.
    *   `FINAL_RESPONSE`: After the final AI message is generated and saved.
    *   `ERROR`: If an error occurs during a specific phase (e.g., planning, synthesis).
    *   `LLM_STREAM_START`, `LLM_STREAM_METADATA`, `LLM_STREAM_ERROR`, `LLM_STREAM_END`: When consuming `StreamEvent`s from the `ReasoningEngine`.
*   **`ToolSystem`:** Records `TOOL_EXECUTION` observations for each tool call attempt, capturing the `ToolResult` (success or error, input, output).
*   **Other Components:** Any other custom component within ART could potentially use the `ObservationManager` to record significant events.

**Benefits of this System:**

*   **Decoupling:** Components that generate events don't need to know about specific logging mechanisms or UI update protocols. They just call `observationManager.record()`.
*   **Centralization:** Provides a single point for managing how observations are handled.
*   **Real-time Monitoring:** Through the `ObservationSocket`, UIs or other monitoring tools can get immediate updates.
*   **Debugging & Auditing:** Persisted observations provide a valuable trail for understanding agent behavior, diagnosing issues, and auditing past interactions.

The `ObservationManager`, in conjunction with its repository and socket, forms a comprehensive system for capturing and utilizing runtime information about the agent's operations.