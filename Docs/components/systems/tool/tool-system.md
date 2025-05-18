# Deep Dive: `ToolSystem`

The `ToolSystem` is a critical component of ART's Tool System. Its primary function is to orchestrate the execution of one or more tool calls that have been identified by the agent's planning phase (typically parsed by the `OutputParser` into `ParsedToolCall` objects). It manages the entire lifecycle of a tool call, from verification and input validation to execution and result recording.

*   **Source:** `src/systems/tool/ToolSystem.ts`
*   **Implements:** `ToolSystem` interface from `src/core/interfaces.ts`
*   **Dependencies:** `ToolRegistry`, `StateManager`, `ObservationManager`.

## Constructor

```typescript
constructor(
    toolRegistry: ToolRegistry,
    stateManager: StateManager,
    observationManager: ObservationManager
)
```

*   `toolRegistry`: An instance of `ToolRegistry` used to look up and retrieve `IToolExecutor` instances by name.
*   `stateManager`: An instance of `StateManager` used to verify if a requested tool is enabled for the current conversation thread.
*   `observationManager`: An instance of `ObservationManager` used to record `TOOL_EXECUTION` observations for each tool call attempt.
*   The constructor throws an error if any of these dependencies are missing.

## Core Method: `executeTools`

*   **`async executeTools(toolCalls: ParsedToolCall[], threadId: string, traceId?: string): Promise<ToolResult[]>`**
    *   **Purpose:** To process an array of `ParsedToolCall` objects, execute each valid call, and return their results.
    *   **Parameters:**
        *   `toolCalls: ParsedToolCall[]`: An array of tool call requests. Each object contains `callId` (from the LLM plan, uniquely identifying this request), `toolName`, and `arguments` (the input for the tool as suggested by the LLM).
        *   `threadId: string`: The ID of the current conversation thread.
        *   `traceId?: string`: An optional trace ID for correlating observations.
    *   **Process (for each `ParsedToolCall` in the array):**
        1.  **Log Start:** Logs the intention to execute the tool.
        2.  **Check Enablement:** Calls `this.stateManager.isToolEnabled(threadId, toolName)`.
            *   If the tool is not enabled for the thread, an error `ToolResult` (status: 'error', error message: "Tool ... is not enabled...") is immediately generated for this call, and processing for this specific call stops.
        3.  **Get Executor:** If enabled, calls `this.toolRegistry.getToolExecutor(toolName)`.
            *   If the tool executor is not found in the registry, an error `ToolResult` (status: 'error', error message: "Tool ... not found in registry.") is generated.
        4.  **Validate Arguments:** If an executor is found:
            *   Calls `validateJsonSchema(executor.schema.inputSchema, call.arguments)` (from `src/utils/validation.ts`) to validate the `arguments` provided in the `ParsedToolCall` against the tool's defined `inputSchema`.
            *   If validation fails, an error `ToolResult` (status: 'error', error message: "Invalid arguments for tool...: [validation error details]") is generated.
        5.  **Execute Tool:** If arguments are valid:
            *   Creates an `ExecutionContext` object containing `threadId` and `traceId`.
            *   Calls `await executor.execute(call.arguments, executionContext)`.
            *   The `IToolExecutor`'s `execute` method performs the tool's actual logic and returns a `ToolResult` (which should include `status`, `output` or `error`).
            *   The `ToolSystem` ensures that the `callId` and `toolName` from the original `ParsedToolCall` are correctly set on the final `ToolResult` object returned by `executeTools`, as the executor itself might not be aware of the planning-phase `callId`.
        6.  **Handle Execution Errors:** If `executor.execute()` throws an exception, it's caught, and an error `ToolResult` is generated with the error message.
        7.  **Record Observation:** Regardless of success or failure of the individual tool call, a `ToolResult` object is formulated. This `ToolResult` is then passed to `this.observationManager.record()` with `type: ObservationType.TOOL_EXECUTION`. This ensures every tool attempt is logged.
        8.  **Collect Result:** The `ToolResult` for the current call is added to an array of results.
    *   **Return Value:** After processing all `ParsedToolCall`s in the input array, the method returns `Promise<ToolResult[]>`, containing a `ToolResult` for each attempted call. This array will include both success and error results.
    *   **Sequential Execution:** Tool calls are executed sequentially in the order they appear in the `toolCalls` array. The `ToolSystem` awaits the completion of one tool execution before starting the next.

## Error Handling

*   The `executeTools` method itself is designed to be robust and generally **does not throw an error** if an *individual tool call* fails (e.g., tool not found, invalid args, executor throws). Instead, it captures the error within the corresponding `ToolResult` object (e.g., `status: 'error'`, `error: 'message'`).
*   It will only throw an error if a critical internal issue occurs within the `ToolSystem` itself (which is unlikely given its current structure) or if a dependency like `StateManager.isToolEnabled` throws an unexpected error that isn't caught.
*   The responsibility of handling individual tool failures (e.g., deciding whether to retry, inform the user, or try an alternative approach) lies with the agent core logic (like `PESAgent`) that consumes the array of `ToolResult`s.

## Interaction with Other Systems

*   **`PESAgent`:** After the planning phase, if the `OutputParser` extracts `ParsedToolCall`s, the `PESAgent` passes this array to `toolSystem.executeTools()`. The returned `ToolResult`s are then used to inform the synthesis phase.
*   **`ToolRegistry`:** Used to look up `IToolExecutor` instances based on `toolName`.
*   **`StateManager`:** Used to check if a tool is enabled for the current `threadId` via `ThreadConfig.enabledTools`.
*   **`ObservationManager`:** Used to record every `TOOL_EXECUTION` attempt and its outcome.
*   **`IToolExecutor` Implementations:** The `ToolSystem` invokes the `execute` method of these concrete tool classes.

The `ToolSystem` plays a crucial role in making agent tool use reliable and observable by centralizing the logic for verification, validation, execution, and logging of tool interactions.