# Observations in ART

Observations are a critical part of the ART Framework, providing a mechanism for introspection, debugging, and real-time monitoring of an agent's execution. They allow developers and systems to understand what the agent is doing, why it's making certain decisions, and how it's progressing through its tasks.

## Key Components

1.  **`Observation` Interface (`src/types/index.ts`):**
    This interface defines the structure of a single observation record:
    ```typescript
    export interface Observation {
      id: string;          // Unique ID for the observation
      threadId: string;    // ID of the conversation thread
      traceId?: string;     // Optional trace ID for the execution cycle
      timestamp: number;   // When the observation was recorded (Unix ms)
      type: ObservationType; // The category of the event
      title: string;       // Human-readable summary
      content: any;        // Payload, structure depends on 'type'
      metadata?: Record<string, any>; // Additional context
    }
    ```

2.  **`ObservationType` Enum (`src/types/index.ts`):**
    This enum categorizes the different kinds of events that can be observed:
    *   `INTENT`: The agent's understanding of the user's goal.
    *   `PLAN`: The step-by-step plan formulated by the agent.
    *   `THOUGHTS`: Internal reasoning or "thinking" steps of the LLM (often extracted from `<think>` tags).
    *   `TOOL_CALL`: The agent's decision to call one or more tools.
    *   `TOOL_EXECUTION`: The attempt and result of executing a specific tool.
    *   `SYNTHESIS`: Events related to the final response generation phase.
    *   `ERROR`: An error encountered during execution.
    *   `FINAL_RESPONSE`: The final AI message generated.
    *   `STATE_UPDATE`: Changes made to the agent's persistent state.
    *   `LLM_STREAM_START`: Marks the beginning of consuming an LLM stream for a phase (e.g., planning, synthesis).
    *   `LLM_STREAM_METADATA`: When an LLM stream yields metadata (e.g., token counts).
    *   `LLM_STREAM_END`: Marks the successful end of an LLM stream.
    *   `LLM_STREAM_ERROR`: When an error occurs within an LLM stream.

3.  **`ObservationManager` (`src/systems/observation/observation-manager.ts`):**
    *   **Role:** The central service responsible for creating, persisting, and broadcasting observations.
    *   **Key Method: `record(observationData: Omit<Observation, 'id' | 'timestamp' | 'title'>)`:**
        *   Takes the core data for an observation.
        *   Automatically generates a unique `id`, sets the `timestamp`, and creates a default `title` (e.g., "`<TYPE>` Recorded").
        *   Uses an injected `IObservationRepository` to save the observation.
        *   Uses an injected `ObservationSocket` (from `UISystem`) to notify any subscribers (like a UI) about the new observation.
    *   **Key Method: `getObservations(threadId: string, filter?: ObservationFilter)`:**
        *   Retrieves historical observations for a thread from the `IObservationRepository`, optionally applying filters.

4.  **`IObservationRepository` (`src/core/interfaces.ts`):**
    *   An interface defining how `Observation` objects are stored and retrieved.
    *   Implemented by `ObservationRepository` (`src/systems/context/repositories/ObservationRepository.ts`), which uses a generic `StorageAdapter` for persistence.

5.  **`ObservationSocket` (`src/systems/ui/observation-socket.ts`):**
    *   A `TypedSocket` specialized for `Observation` data.
    *   Allows UI components or other services to `subscribe` to new observations, optionally filtering by `ObservationType` or `threadId`.
    *   The `ObservationManager` calls `notify()` on this socket.

## How Observations are Used

*   **Debugging:** Developers can inspect the stream of observations to trace the agent's execution path, understand its decisions at each step (intent, plan, tool calls), see tool inputs/outputs, and identify where errors occur.
*   **Real-time UI Updates:** A user interface can subscribe to the `ObservationSocket` to display:
    *   The agent's current "thought process" (e.g., "Planning...", "Calling tool: get_weather...").
    *   Results of tool executions.
    *   Errors as they happen.
    *   The final response as it's being synthesized (if combined with `LLMStreamSocket`).
*   **Monitoring & Analytics:** In production, observations can be logged to a central system for monitoring agent performance, identifying common failure points, or analyzing usage patterns.
*   **Agent Self-Correction (Advanced):** Future agent designs might even use their own observation history to reflect on past actions and improve future performance, though this is not a primary focus of ART `v0.2.7`.

## Example Flow with Observations (`PESAgent`)

Consider the `PESAgent` processing a query that involves a tool:

1.  **User Query:** "What's the weather in Paris?"
2.  `PESAgent.process()` starts.
3.  **Planning Phase:**
    *   `ObservationManager.record({ type: ObservationType.PLAN, content: { message: "Preparing for planning LLM call." } })` (simplified).
    *   `PESAgent` calls `ReasoningEngine` for planning.
    *   `ObservationManager.record({ type: ObservationType.LLM_STREAM_START, content: { phase: 'planning' } })`.
    *   LLM stream events are processed.
    *   `ObservationManager.record({ type: ObservationType.LLM_STREAM_END, content: { phase: 'planning' } })`.
    *   `OutputParser` extracts intent, plan, and tool calls.
    *   `ObservationManager.record({ type: ObservationType.INTENT, content: { intent: "Find weather in Paris" } })`.
    *   `ObservationManager.record({ type: ObservationType.PLAN, content: { plan: "Use get_weather tool for Paris.", rawOutput: "..." } })`.
    *   `ObservationManager.record({ type: ObservationType.TOOL_CALL, content: { toolCalls: [{ callId: "c1", toolName: "get_weather", args: {location: "Paris"} }] } })`.
4.  **Execution Phase:**
    *   `ToolSystem.executeTools()` is called.
    *   For the "get_weather" tool call:
        *   `ObservationManager.record({ type: ObservationType.TOOL_EXECUTION, content: { callId: "c1", toolName: "get_weather", status: "success", output: { temp: "12°C" } } })`. (This is recorded by `ToolSystem`).
5.  **Synthesis Phase:**
    *   `ObservationManager.record({ type: ObservationType.SYNTHESIS, content: { message: "Preparing for synthesis LLM call." } })`.
    *   `PESAgent` calls `ReasoningEngine` for synthesis.
    *   `ObservationManager.record({ type: ObservationType.LLM_STREAM_START, content: { phase: 'synthesis' } })`.
    *   LLM stream events for the final answer are processed.
    *   `ObservationManager.record({ type: ObservationType.LLM_STREAM_END, content: { phase: 'synthesis' } })`.
6.  **Finalization:**
    *   The final AI message is created.
    *   `ObservationManager.record({ type: ObservationType.FINAL_RESPONSE, content: { message: { role: "AI", content: "The weather in Paris is 12°C." } } })`.

Throughout this process, each call to `ObservationManager.record()` would also trigger a notification on the `ObservationSocket`, allowing a connected UI to display these events as they occur. If any step resulted in an error, an `ObservationType.ERROR` would be recorded.