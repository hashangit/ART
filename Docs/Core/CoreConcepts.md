# ART Framework: Core Concepts

This document explains fundamental concepts within the ART framework that are essential for understanding how agents are built and operate.

## Threads (`threadId`)

A **Thread** represents a single, continuous conversation or task execution context within the ART framework. Every interaction processed by `art.process()` **must** be associated with a unique `threadId`.

**Why are Threads important?**

*   **Context Management:** The `threadId` is the primary key used by the **Context System** to manage:
    *   **Conversation History:** Retrieving past messages relevant only to that specific thread.
    *   **State:** Loading and saving persistent agent state (like user preferences) associated with the thread.
    *   **Configuration:** Applying thread-specific settings (e.g., which LLM to use, which tools are enabled, system prompts).
*   **Isolation:** Threads ensure that different conversations or agent tasks do not interfere with each other's history, state, or configuration.
*   **Persistence:** The **Storage System** uses the `threadId` to store and retrieve all relevant data, allowing conversations to be paused and resumed across sessions (when using persistent adapters like `IndexedDBStorageAdapter`).

You typically generate a unique `threadId` when starting a new conversation or task and reuse the same `threadId` for subsequent interactions within that context.

## Observations

The **Observation System (OS)** provides transparency into the agent's internal operations. It generates structured records, called **Observations**, at key points during the execution flow.

**Key Aspects:**

*   **Purpose:** Debugging, monitoring, logging, providing real-time feedback to the UI.
*   **Structure:** Each `Observation` typically includes:
    *   `id`: A unique identifier for the observation.
    *   `threadId`: The thread this observation belongs to.
    *   `timestamp`: When the observation occurred.
    *   `type`: An `ObservationType` enum value indicating the kind of event.
    *   `title`: A human-readable summary.
    *   `content`: Structured data specific to the observation type (e.g., the plan text, tool results, error details).
    *   `metadata`: Additional context (e.g., the source phase like 'planning' or 'synthesis', the tool name).
*   **Persistence:** Observations are saved via the **Storage System** (`ObservationRepository`).
*   **Notification:** New observations are broadcast via the **UI System** (`ObservationSocket`).

**Common `ObservationType` Values (v1.0):**

*   `INTENT`: The agent's interpreted understanding of the user's goal (generated during planning).
*   `PLAN`: The step-by-step plan formulated by the agent (generated during planning).
*   `THOUGHTS`: Intermediate reasoning steps or "chain-of-thought" streamed from the LLM during planning or synthesis.
*   `TOOL_EXECUTION`: Records the input, output (or error), status, and metadata of a specific tool call.
*   `ERROR`: Captures errors that occur during any stage of the agent's execution.

## Execution Patterns (PES Focus)

ART decouples the high-level strategy an agent uses (the "execution pattern") from the underlying mechanics. This allows for flexibility in how agents approach tasks.

The default pattern in v1.0 is **Plan-Execute-Synthesize (PES)**. It involves a structured, multi-stage process:

1.  **Initiation & Config:** The request is received, and the `StateManager` loads the configuration (`ThreadConfig`) and state (`AgentState`) specific to the `threadId`. Traceability IDs (`traceId`) are established.
2.  **Planning Context Assembly:** The necessary information *for planning* is gathered: conversation history (`ConversationManager`), enabled tool schemas (`ToolRegistry`), and the system prompt (`StateManager`).
3.  **Planning Call (1st LLM Call):** The `ReasoningSystem` (using `PromptManager`, `ReasoningEngine`, `OutputParser`) interacts with the LLM to generate an `intent`, a `plan`, and a list of `toolCalls` based on the planning context. `INTENT`, `PLAN`, and `THOUGHTS` observations are recorded.
4.  **Tool Execution:** The `ToolSystem` executes the `toolCalls` from the plan sequentially. It verifies each tool is enabled (`StateManager`), validates arguments against the schema, runs the tool's `execute` method, and captures the `ToolResult`. `TOOL_EXECUTION` observations (or `ERROR`) are recorded for each call.
5.  **Synthesis Call (2nd LLM Call):** The `ReasoningSystem` interacts with the LLM again. The prompt includes the original query, planning results (intent, plan), and the actual `toolResults` from the execution phase. The goal is to generate the final, user-facing response. `THOUGHTS` observations are recorded.
6.  **Finalization:** The final User and AI `ConversationMessage` objects are created with metadata. The `ConversationManager` saves them to storage. The `StateManager` saves any modified state. The `ConversationSocket` notifies the UI, and the final `AgentFinalResponse` is returned.

While PES is the default, the architecture allows for other patterns like ReAct or custom flows to be implemented by creating different Agent Core implementations.

## Adapters (Storage & Reasoning)

ART uses the **Adapter pattern** to decouple core system logic from specific external implementations, particularly for storage and LLM interactions.

*   **Storage Adapters:** Implement the `StorageAdapter` interface, providing methods for CRUD operations (`get`, `set`, `delete`, `query`). This allows the framework to work with different persistence backends without changing the core Context or Observation systems.
    *   *v1.0 Implementations:* `InMemoryStorageAdapter` (for testing, non-persistent), `IndexedDBStorageAdapter` (for browser persistence).
*   **Reasoning Adapters (Provider Adapters):** Implement the `ProviderAdapter` interface (which extends `ReasoningEngine`), handling the specifics of communicating with a particular LLM API (e.g., OpenAI, Anthropic) or a local model (e.g., via WASM). This allows the Reasoning System to support various LLMs.
    *   *v1.0 Implementations:* `OpenAIAdapter`, `GeminiAdapter`, `AnthropicAdapter`, `DeepSeekAdapter`, `OpenRouterAdapter`.

This pattern makes ART highly extensible, allowing developers to easily add support for new databases or LLM providers.

## UI Sockets

The **UI System** provides a clean way for frontend applications to react to agent events without being tightly coupled to the framework's internal workings. It uses a publish/subscribe model based on **Typed Sockets**.

*   **`TypedSocket<DataType, FilterType>`:** A generic interface defining `subscribe` (with optional filtering), `notify`, and `getHistory` methods.
*   **`ObservationSocket`:** An implementation of `TypedSocket` specifically for `Observation` data. UI components can subscribe to:
    *   All observations for a thread.
    *   Observations of specific `ObservationType`(s) (e.g., only `THOUGHTS` or `TOOL_EXECUTION`).
*   **`ConversationSocket`:** An implementation of `TypedSocket` for `ConversationMessage` data. UI components can subscribe to:
    *   All messages for a thread.
    *   Messages with a specific `MessageRole` (e.g., only `AI` messages or only `USER` messages).

Subscriptions can typically be filtered by `threadId` as well, allowing UIs that manage multiple conversations to listen only to relevant events.

## Configuration (`StateManager`)

Agent behavior is often configured on a per-thread basis. The **Context System's `StateManager`** is the central component responsible for managing this configuration.

*   **Loading:** When `art.process` is called, the `StateManager` loads the `ThreadContext` (which includes `ThreadConfig` and `AgentState`) for the given `threadId` from the `StateRepository`.
*   **Access:** Other components (like Agent Core, Reasoning Engine, Tool System) query the `StateManager` to get thread-specific settings during execution (e.g., `stateManager.getThreadConfigValue(threadId, 'reasoning')` or `stateManager.isToolEnabled(threadId, 'CalculatorTool')`).
*   **Persistence:** The `StateManager` tracks if the `AgentState` has been modified during execution and saves changes back via the `StateRepository` during the Finalization stage.

This centralized approach ensures that configuration is consistently applied throughout an agent's execution cycle for a specific thread.