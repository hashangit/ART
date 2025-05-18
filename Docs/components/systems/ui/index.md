# UI System Overview

The UI System in the ART Framework provides the mechanisms for an ART agent's backend to communicate real-time updates to a user interface or other subscribed services. It's designed around a publish/subscribe pattern using specialized "sockets."

## Purpose

The primary goal of the UI System is to decouple the agent's core logic from the specifics of how information is presented to or consumed by a UI. Instead of the agent directly manipulating UI elements, it emits events through dedicated sockets, and the UI (or other listeners) can subscribe to these events to react accordingly.

This enables:

*   **Real-time Updates:** UIs can display information as it happens (e.g., LLM tokens streaming in, observations about the agent's plan).
*   **Decoupling:** Agent backend logic doesn't need to know about the UI's structure or technology.
*   **Multiple Subscribers:** Different parts of a UI, or even different external services, can subscribe to the same event streams.
*   **Testability:** Easier to test agent logic without a full UI, and UI components can be tested by mocking socket events.

## Key Components

1.  **`UISystem` (`src/systems/ui/ui-system.ts`):**
    *   **Role:** A central service that instantiates and provides access to the various specialized sockets.
    *   It's initialized by the `AgentFactory` and injected into components like `AgentFactory` (for `ArtInstance`) and potentially directly into the agent core if needed.
    *   **Key Methods:**
        *   `getObservationSocket(): ObservationSocket`
        *   `getConversationSocket(): ConversationSocket`
        *   `getLLMStreamSocket(): LLMStreamSocket`

2.  **`TypedSocket<DataType, FilterType>` (`src/systems/ui/typed-socket.ts`):**
    *   **Role:** A generic base class for creating publish/subscribe channels with filtering capabilities. It's not typically used directly by applications but is extended by the specialized sockets.
    *   **Key Methods:**
        *   `subscribe(callback, filter?, options?)`: Allows a listener to register a callback function. Returns an unsubscribe function.
        *   `notify(data, options?, filterCheck?)`: Pushes data to relevant subscribers.
        *   `getHistory?(...)` (optional): A base method that subclasses can override to provide historical data.
        *   `clearAllSubscriptions()`: Removes all current subscriptions.

3.  **Specialized Sockets (extending `TypedSocket`):**
    *   **[`LLMStreamSocket`](./llm-stream-socket.md):**
        *   For broadcasting `StreamEvent` objects (`TOKEN`, `METADATA`, `ERROR`, `END`) generated during LLM interactions.
        *   Allows filtering by `StreamEvent.type`.
    *   **[`ObservationSocket`](./observation-socket.md):**
        *   For broadcasting `Observation` objects as they are recorded by the `ObservationManager`.
        *   Allows filtering by `ObservationType`.
        *   Can fetch historical observations if an `IObservationRepository` is provided to its constructor.
    *   **[`ConversationSocket`](./conversation-socket.md):**
        *   For broadcasting new `ConversationMessage` objects when they are added to a thread's history by the `ConversationManager`.
        *   Allows filtering by `MessageRole`.
        *   Can fetch historical messages if an `IConversationRepository` is provided to its constructor.

## How It Works

1.  **Initialization:**
    *   During `createArtInstance`, the `AgentFactory` instantiates `UISystem`.
    *   `UISystem` in turn instantiates `LLMStreamSocket`, `ObservationSocket` (with `IObservationRepository`), and `ConversationSocket` (with `IConversationRepository`).

2.  **Notification (Backend):**
    *   **`LLMStreamSocket`:** The `PESAgent` (or other agent logic consuming `ReasoningEngine.call()`'s output) receives `StreamEvent`s and calls `llmStreamSocket.notify(event, ...)` for each one.
    *   **`ObservationSocket`:** The `ObservationManager.record()` method, after saving an observation, calls `observationSocket.notify(observation, ...)`.
    *   **`ConversationSocket`:** The `ConversationManager.addMessages()` method, after saving messages, calls `conversationSocket.notify(message, ...)` for each new message.

3.  **Subscription (Frontend/Client):**
    *   A UI component (or any other service) would obtain references to these socket instances (typically through an application-specific layer that bridges the ART backend with the frontend, e.g., via WebSockets, an event bus, or direct function calls if in the same process).
    *   It then calls `socket.subscribe(myCallbackFunction, myFilter, myOptions)` to register interest in specific events.
        *   `myCallbackFunction` will be invoked when a matching event is notified.
        *   `myFilter` (e.g., `ObservationType.PLAN` or `MessageRole.AI`) restricts which events trigger the callback.
        *   `myOptions` (e.g., `{ threadId: 'current-thread' }`) further refines which notifications are received.

**Example Scenario (Conceptual UI):**

A chat interface might:

*   Subscribe to `ConversationSocket` to display new user and AI messages for the active thread.
*   Subscribe to `LLMStreamSocket` (type `TOKEN`, `tokenType: 'FINAL_SYNTHESIS_LLM_RESPONSE'`) to stream the AI's final response token by token.
*   Subscribe to `ObservationSocket` (type `TOOL_EXECUTION`) to show "Agent is using tool X..." messages.

The UI System provides a flexible and powerful way to build dynamic and informative interfaces for ART agents.