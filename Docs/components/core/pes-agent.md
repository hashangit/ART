# Deep Dive: `PESAgent`

The `PESAgent` (Plan-Execute-Synthesize Agent) is the default agent core implementation provided by the ART Framework. It follows a structured, three-stage process to handle user queries, making it a robust foundation for many AI agent applications.

*   **Source:** `src/core/agents/pes-agent.ts`
*   **Implements:** `IAgentCore`

## The PES Flow

When `PESAgent.process(props: AgentProps)` is called, it orchestrates the following flow:

<!-- Placeholder for PESAgent.process() Sequence Diagram -->
<!-- Diagram should show:
    1. Input: AgentProps
    2. Load Context (StateManager, ConversationManager)
    3. Planning:
        - Construct ArtStandardPrompt (planning)
        - Call ReasoningEngine.call() -> StreamEvents
        - Consume StreamEvents, buffer text
        - Call OutputParser.parsePlanningOutput() -> intent, plan, toolCalls
        - Record INTENT, PLAN, TOOL_CALL Observations
    4. Execution (if toolCalls exist):
        - Call ToolSystem.executeTools(toolCalls) -> ToolResults
        - ToolSystem records TOOL_EXECUTION Observations
    5. Synthesis:
        - Construct ArtStandardPrompt (synthesis, including toolResults)
        - Call ReasoningEngine.call() -> StreamEvents
        - Consume StreamEvents, buffer final response text
        - Record SYNTHESIS Observation
    6. Finalization:
        - Save final AI message (ConversationManager)
        - Save state if modified (StateManager based on StateSavingStrategy)
        - Record FINAL_RESPONSE Observation
    7. Output: AgentFinalResponse
-->

1.  **Stage 1: Initiation & Configuration Loading**
    *   Loads the `ThreadContext` (which includes `ThreadConfig` and `AgentState`) for the current `props.threadId` using the injected `StateManager`. This provides thread-specific settings like enabled tools, LLM provider preferences for the thread, history limits, and any persistent agent state.
    *   Retrieves the `systemPrompt` from the `ThreadConfig` or falls back to an internal default system prompt (`DEFAULT_PES_SYSTEM_PROMPT`).
    *   Determines the `RuntimeProviderConfig` to be used for LLM calls, prioritizing `props.options.providerConfig` if present, otherwise using `threadContext.config.providerConfig`.

2.  **Stage 2: Planning Context Assembly**
    *   Fetches the recent conversation `history` for the thread using `ConversationManager`, respecting the `historyLimit` from `ThreadConfig`.
    *   Gets a list of `ToolSchema`s for tools available to this thread from `ToolRegistry` (which may consult `StateManager` if configured to do so).
    *   Formats the history into a structure suitable for the prompt.

3.  **Stage 3: Planning Prompt Construction & LLM Call**
    *   **Prompt Construction:** The `PESAgent` directly constructs an `ArtStandardPrompt` object (an array of `ArtStandardMessage` objects). This planning prompt typically includes:
        *   A `system` message with the resolved system prompt.
        *   `user` and `assistant` messages from the formatted conversation `history`.
        *   A final `user` message that includes:
            *   The current `props.query`.
            *   Descriptions of the `availableTools` (name, description, input schema stringified).
            *   Instructions for the LLM to identify intent, create a plan, and specify any `Tool Calls` in a specific JSON format.
            *   *(The `PESAgent` may use `PromptManager.getFragment()` to fetch parts of these instructions, but it assembles the final `ArtStandardPrompt` object itself.)*
    *   **LLM Call:**
        *   Calls `reasoningEngine.call(planningPrompt, callOptions)`.
        *   `callOptions` will include `stream: true` and `callContext: 'AGENT_THOUGHT'`, along with the determined `RuntimeProviderConfig`.
        *   The `PESAgent` then consumes the `AsyncIterable<StreamEvent>` returned by the `ReasoningEngine`.
        *   `TOKEN` events are buffered to accumulate the complete text output of the LLM's planning phase.
        *   `LLM_STREAM_START`, `LLM_STREAM_METADATA`, `LLM_STREAM_ERROR`, and `LLM_STREAM_END` observations are recorded via `ObservationManager`. UI sockets are notified.
    *   **Output Parsing:**
        *   The accumulated text from the planning LLM call is passed to `outputParser.parsePlanningOutput()`.
        *   This parser extracts the `intent`, `plan` description, and an array of `ParsedToolCall` objects. It also handles `<think>` tags via `XmlMatcher`.
    *   `INTENT`, `PLAN`, and `TOOL_CALL` `Observation`s are recorded.

4.  **Stage 4: Tool Execution**
    *   If `parsedPlanningOutput.toolCalls` is not empty, these calls are passed to `toolSystem.executeTools()`.
    *   The `ToolSystem` handles enabling checks, input validation, execution of each tool, and records `TOOL_EXECUTION` observations.
    *   It returns an array of `ToolResult` objects.
    *   If any tool execution results in an error, the overall status of the agent process might be marked as `'partial'`.

5.  **Stage 5: Synthesis Prompt Construction & LLM Call**
    *   **Prompt Construction:** A new `ArtStandardPrompt` is constructed for the synthesis phase. It typically includes:
        *   The `system` message.
        *   The formatted conversation `history`.
        *   A `user` message detailing:
            *   The original `props.query`.
            *   The `intent` and `plan` from the planning phase.
            *   The `ToolResult`s from the execution phase (including successes and errors, with outputs stringified).
            *   Instructions for the LLM to synthesize a final, user-facing response based on all this information.
    *   **LLM Call:**
        *   Calls `reasoningEngine.call(synthesisPrompt, callOptions)`.
        *   `callOptions` will include `stream: true` and `callContext: 'FINAL_SYNTHESIS'`, plus the `RuntimeProviderConfig`.
        *   The `PESAgent` consumes the `StreamEvent`s.
        *   `TOKEN` events (specifically those with `tokenType` indicating final synthesis, like `FINAL_SYNTHESIS_LLM_RESPONSE`) are buffered to form the final AI response content.
        *   Stream-related observations are recorded, and UI sockets are notified.
    *   The accumulated text from the synthesis LLM call becomes the agent's final textual response. No separate parsing step (`outputParser.parseSynthesisOutput`) is strictly needed for the content itself in `v0.2.7` as the raw stream output is used.

6.  **Stage 6: Finalization**
    *   A new `ConversationMessage` (with `role: MessageRole.AI`) is created containing the final synthesized response content.
    *   This AI message is saved to the conversation history using `conversationManager.addMessages()`.
    *   `FINAL_RESPONSE` observation is recorded.
    *   `stateManager.saveStateIfModified(props.threadId)` is called. Its behavior depends on the `StateSavingStrategy`:
        *   If `'implicit'`, it checks if `threadContext.state` was modified during the `process` call and saves it if necessary.
        *   If `'explicit'`, this call is a no-op for `AgentState` (state must be saved via explicit calls to `stateManager.setAgentState()`).
    *   An `AgentFinalResponse` object is constructed, containing the final AI message and `ExecutionMetadata` (status, duration, LLM/tool call counts, errors).

## Error Handling

*   Critical errors during planning or synthesis (e.g., LLM provider errors, prompt assembly failures) will typically cause the `process()` method to throw an `ARTError`.
*   Tool execution failures are generally caught by the `ToolSystem` and returned as error `ToolResult`s. The `PESAgent` then incorporates these error results into the synthesis prompt, allowing the LLM to potentially explain the tool failure to the user. The overall status in `ExecutionMetadata` might be set to `'partial'`.
*   If synthesis itself fails after tools have run, the status might also be `'partial'`, and the error message might become the content of the final AI response.

The `PESAgent` provides a well-defined and observable flow for agent operations, making it easier to build, debug, and extend complex AI agents.