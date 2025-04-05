# Agent Core Guide (v0.2.4)

## Overview

The Agent Core is the central orchestrator within the Agent Runtime (ART) Framework. Its primary responsibility is to manage the overall execution flow of the agent based on a chosen reasoning pattern. It coordinates the interactions between all other subsystems (Reasoning, Tool, Context, Observation, Storage, UI) to process a user query and generate a final response.

In ART v0.2.4, the default and primary implementation of the Agent Core follows the **Plan-Execute-Synthesize (PES)** pattern.

## The Plan-Execute-Synthesize (PES) Pattern

The PES pattern provides a structured and robust approach to agent execution by breaking down the process into distinct phases:

1.  **Plan:** Understand the user's request and create a step-by-step plan, potentially involving tool usage.
2.  **Execute:** Carry out the steps defined in the plan, primarily executing tool calls.
3.  **Synthesize:** Generate a final, coherent response based on the original query, the plan, and the results of the execution phase.

This separation makes the agent's behavior more predictable, observable, and easier to debug compared to more interleaved patterns like ReAct.

## PES Agent Core Implementation (`PESAgent`)

The `PESAgent` class implements the `IAgentCore` interface and orchestrates the 6-stage PES flow.

### Core Interface (`IAgentCore`)

```typescript
import { AgentProps, AgentFinalResponse } from 'art-framework';

interface IAgentCore {
  /**
   * Processes the user query according to the implemented reasoning pattern.
   * @param props - Input properties including query, threadId, and dependencies.
   * @returns A promise resolving to the final agent response and metadata.
   */
  process(props: AgentProps): Promise<AgentFinalResponse>;
}
```

### Input (`AgentProps`)

The `process` method takes a single `AgentProps` object containing:

*   `query`: The user's input string.
*   `threadId`: **Mandatory** identifier for the conversation thread. Used for retrieving history, state, and configuration.
*   `sessionId`, `userId`, `traceId`: Optional identifiers for UI session tracking, user context, and end-to-end tracing.
*   `options`: Optional runtime overrides for this specific call.
*   **Injected Dependencies:** Instances of all necessary managers and systems (`StateManager`, `ConversationManager`, `ToolRegistry`, `PromptManager`, `ReasoningEngine`, `OutputParser`, `ObservationManager`, `ToolSystem`), typically provided by the `AgentFactory`.

### Output (`AgentFinalResponse`)

The `process` method returns an `AgentFinalResponse`:

*   `response`: The final `ConversationMessage` object representing the AI's response.
*   `metadata`: An `ExecutionMetadata` object containing details about the execution (status, duration, IDs, potential errors).

### The 6 Stages of PES Execution

The `PESAgent.process` method executes the following stages sequentially. Refer to the [Detailed Execution Flow Diagram](../../../ART-Concept/ART-Execution-Flow-v0.2.4.html) for a visual representation.

1.  **Initiation & Configuration Loading:**
    *   Receives `AgentProps`.
    *   Uses `StateManager` to load the `ThreadConfig` (LLM settings, enabled tools, system prompt) and `AgentState` associated with the `threadId`.
    *   Establishes `traceId` for observability.

2.  **Planning Context Assembly:**
    *   Uses `ConversationManager` to retrieve recent message history for the `threadId`.
    *   Uses `StateManager` to get the list of `enabledTools` for the thread.
    *   Uses `ToolRegistry` to fetch the `ToolSchema` definitions for only the enabled tools.
    *   Uses `StateManager` to retrieve the `systemPrompt`.
    *   **Note:** In standard PES, dynamic context (like RAG results) is typically gathered *before* the Synthesis stage, not during Planning Context assembly.

3.  **Planning Call (1st LLM Call):**
    *   Uses `PromptManager` to construct the planning prompt (including query, history, system prompt, enabled tool schemas).
    *   Uses `ReasoningEngine` (configured via `StateManager`) to call the LLM.
    *   Streams intermediate thoughts (`THOUGHTS` observations) via the `onThought` callback to `ObservationManager`.
    *   Uses `OutputParser` to extract structured `intent`, `plan`, and `toolCalls` from the LLM response.
    *   Uses `ObservationManager` to record `INTENT` and `PLAN` observations (or `ERROR` if parsing fails).
    *   Observations are persisted via `ObservationRepository` and notified to the UI via `ObservationSocket`.

4.  **Tool Execution Phase:**
    *   Passes the `toolCalls` array to the `ToolSystem`.
    *   `ToolSystem` iterates through each `toolCall`:
        *   Verifies the tool is enabled for the `threadId` (`StateManager`).
        *   Retrieves the `IToolExecutor` (`ToolRegistry`).
        *   Validates the planned arguments against the tool's input schema.
        *   Executes the `IToolExecutor.execute` method securely (with timeouts).
        *   Captures the `ToolResult` (success/error, output).
        *   Uses `ObservationManager` to record a `TOOL_EXECUTION` observation (or `ERROR`).
        *   Persists the observation and notifies the UI.
    *   `ToolSystem` returns an array of `ToolResult` objects to the Agent Core.

5.  **Synthesis Call (2nd LLM Call):**
    *   Uses `PromptManager` to construct the synthesis prompt (using original query, intent, plan, the collected `toolResults`, history, and system prompt).
    *   Uses `ReasoningEngine` to call the LLM again.
    *   Streams intermediate thoughts (`THOUGHTS` observations) to `ObservationManager`.
    *   Uses `OutputParser` to extract the final user-facing response content.
    *   Uses `ObservationManager` to record synthesis `THOUGHTS` (or `ERROR` if parsing fails).
    *   Persists observations and notifies the UI.

6.  **Finalization & Response Delivery:**
    *   Formats the final `UserMessage` (from the input query) and `AgentMessage` (with the synthesized content), including unique IDs, `threadId`, timestamps, and rich metadata (linking to trace, tool calls, observations).
    *   Uses `ConversationManager` to save both messages to the history (via `ConversationRepository`).
    *   Uses `StateManager` to save any modified `AgentState` (via `StateRepository`).
    *   Notifies the UI via `ConversationSocket` about the new User and AI messages.
    *   Resolves the `process` promise with the `AgentFinalResponse` object.

## Configuration

While the `PESAgent` itself doesn't have many direct configuration options, its behavior is heavily influenced by the configuration managed by the `StateManager` for the specific `threadId`, including:

*   Which LLM provider and model to use (`reasoning` config).
*   Which tools are enabled (`enabledTools` config).
*   The base system prompt (`systemPrompt` config).
*   History length limits (`historyLimit` config).

These configurations are loaded during Stage 1 (Initiation).

## Error Handling

The `PESAgent` includes error handling at various points:

*   **Initialization:** Errors during config loading are caught.
*   **Planning Call:** LLM API errors or parsing failures result in an `ERROR` observation and may halt execution.
*   **Tool Execution:** Errors during tool validation or execution are captured in the `ToolResult` and recorded as `TOOL_EXECUTION` observations with `status: 'error'`. The flow typically continues to Synthesis even if some tools fail, allowing the agent to report the errors.
*   **Synthesis Call:** LLM API errors or parsing failures result in an `ERROR` observation.
*   **Top-Level:** The main `process` method has a top-level try/catch to handle unexpected errors during orchestration, returning an `AgentFinalResponse` with `status: 'error'`.

Error details are captured in `ERROR` type observations, providing context for debugging.

## Instantiation (`AgentFactory`)

You typically don't instantiate `PESAgent` directly. Instead, you use the `createArtInstance` function (which acts as the `AgentFactory`). This factory is responsible for:

1.  Instantiating all the necessary subsystems (Managers, Repositories, Adapters).
2.  Instantiating the chosen `AgentCore` implementation (e.g., `PESAgent`).
3.  Injecting all required dependencies into the `AgentCore` and other components.

See the [Basic Usage Tutorial](../BasicUsage.md) for an example of using `createArtInstance`.

## Next Steps

*   Review the [Detailed Execution Flow Diagram](../../../ART-Concept/ART-Execution-Flow-v0.2.4.html).
*   Explore the guides for the systems the Agent Core interacts with, such as the [Reasoning System Guide](./ReasoningSystem.md) and [Tool System Guide](./ToolSystem.md).