# UI System Guide (v0.2.4)

## Overview

The UI System in the Agent Runtime (ART) Framework provides a clean and efficient mechanism for decoupling the framework's internal events from the application's user interface (UI). Instead of directly manipulating UI elements, ART components (like the `ObservationManager` and `ConversationManager`) notify the UI System, which then broadcasts these events through **typed sockets**.

This approach offers several advantages:

*   **Decoupling:** The core framework logic remains independent of any specific UI library (React, Vue, Svelte, etc.).
*   **Reactivity:** UI components can subscribe to specific event streams and update reactively as the agent operates.
*   **Efficiency:** Subscriptions can be filtered by event type (e.g., `ObservationType`, `MessageRole`) and `threadId`, ensuring UI components only receive relevant updates.
*   **Type Safety:** Sockets are strongly typed, providing better developer experience and reducing runtime errors.

## Core Components

1.  **`UISystem`**:
    *   **Purpose:** Acts as a provider or container for the different types of sockets.
    *   **Key Role:** Provides methods like `getObservationSocket()` and `getConversationSocket()` for other parts of the application (usually the UI layer) to access the specific sockets they need to subscribe to. It's typically instantiated once by `createArtInstance`.

2.  **`TypedSocket<DataType, FilterType>`**:
    *   **Purpose:** A generic interface and base implementation for the publish/subscribe pattern used by the UI System.
    *   **Key Role:** Defines the core methods:
        *   `subscribe(callback, filter?, options?)`: Allows UI components to register a callback function to receive data. It supports optional filtering based on `FilterType` (e.g., `ObservationType`) and `options` (e.g., `{ threadId }`). Returns an `unsubscribe` function.
        *   `notify(data, options?)`: Used internally by ART components (like Managers) to broadcast new data (`DataType`) to relevant subscribers. Can target specific threads using `options.targetThreadId`.
        *   `getHistory?(filter?, options?)`: Optional method to retrieve recent historical data matching the filter criteria.

3.  **`ObservationSocket`**:
    *   **Purpose:** A specific implementation of `TypedSocket` for broadcasting `Observation` objects.
    *   **`DataType`**: `Observation`
    *   **`FilterType`**: `ObservationType` (enum like `INTENT`, `PLAN`, `THOUGHTS`, `TOOL_EXECUTION`, `ERROR`) or an array of types.
    *   **Notifier:** Primarily notified by the `ObservationManager` when `record()` is called.

4.  **`ConversationSocket`**:
    *   **Purpose:** A specific implementation of `TypedSocket` for broadcasting `ConversationMessage` objects.
    *   **`DataType`**: `ConversationMessage`
    *   **`FilterType`**: `MessageRole` (enum: `USER` or `AI`) or an array of roles.
    *   **Notifier:** Primarily notified by the `ConversationManager` (or Agent Core) when new messages are added via `addMessages()`.

## How It Works: Publish/Subscribe Flow

1.  **Initialization:** The `UISystem` and its sockets (`ObservationSocket`, `ConversationSocket`) are created when `createArtInstance` is called.
2.  **Subscription (UI Layer):** Your UI components (e.g., a chat window, an observation panel) access the required socket via the `artInstance.uiSystem` and call the `subscribe` method. They provide a callback function and optional filters (`ObservationType`, `MessageRole`, `threadId`).
3.  **Event Occurs (Framework Layer):** During agent execution, an event happens (e.g., `ObservationManager.record` is called, `ConversationManager.addMessages` is called).
4.  **Notification (Framework Layer):** The relevant manager (e.g., `ObservationManager`) calls the `notify` method on the corresponding socket (e.g., `ObservationSocket`), passing the new data object (`Observation` or `ConversationMessage`).
5.  **Broadcasting (UI System Layer):** The socket implementation iterates through its active subscriptions.
6.  **Filtering (UI System Layer):** For each subscription, it checks if the new data matches the subscriber's filter criteria (type and `threadId`).
7.  **Callback Execution (UI Layer):** If the filters match, the socket invokes the subscriber's callback function, passing the new data object.
8.  **UI Update (UI Layer):** The callback function in the UI component updates the component's state, causing the UI to re-render with the new information.

## Using the Sockets

Here's how you typically interact with the sockets in your application code:

```typescript
import { 
  ArtClient, // Assuming ArtClient is the type returned by createArtInstance
  ObservationType, 
  MessageRole,
  Observation,
  ConversationMessage 
} from 'art-framework';

// Assume 'art' is your initialized ArtClient instance
// Assume 'currentThreadId' holds the ID of the conversation being displayed

// --- Example: Displaying AI Messages in a Chat UI ---

function ChatWindow({ art, currentThreadId }) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  useEffect(() => {
    const conversationSocket = art.uiSystem.getConversationSocket();

    // Subscribe only to AI messages for the current thread
    const unsubscribe = conversationSocket.subscribe(
      (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
      },
      MessageRole.AI, // Filter: Only AI messages
      { threadId: currentThreadId } // Filter: Only this thread
    );

    // Optional: Fetch initial history for this thread
    conversationSocket.getHistory?.(MessageRole.AI, { threadId: currentThreadId, limit: 50 })
      .then(initialMessages => setMessages(initialMessages.reverse())); // Reverse to show oldest first

    // Cleanup subscription on component unmount
    return unsubscribe; 
  }, [art, currentThreadId]);

  // Render the 'messages' state in your UI...
  return (/* ... chat UI rendering messages ... */);
}


// --- Example: Displaying Agent Thoughts/Steps ---

function AgentActivityMonitor({ art, currentThreadId }) {
  const [activities, setActivities] = useState<Observation[]>([]);

  useEffect(() => {
    const observationSocket = art.uiSystem.getObservationSocket();

    // Subscribe to THOUGHTS and TOOL_EXECUTION observations for the current thread
    const unsubscribe = observationSocket.subscribe(
      (observation) => {
        setActivities(prev => [...prev, observation]); 
        // Could update UI to show "Thinking..." or "Used Calculator"
      },
      [ObservationType.THOUGHTS, ObservationType.TOOL_EXECUTION], // Filter by types
      { threadId: currentThreadId } // Filter by thread
    );

    // Cleanup
    return unsubscribe;
  }, [art, currentThreadId]);

  // Render the 'activities' state...
  return (/* ... UI showing agent steps ... */);
}
```

**Key Points for Usage:**

*   **Get Sockets:** Access sockets via `artInstance.uiSystem.getObservationSocket()` or `artInstance.uiSystem.getConversationSocket()`.
*   **Subscribe:** Call `.subscribe()` with your callback and filters.
*   **Filter:** Use the `filter` argument (e.g., `ObservationType.PLAN`, `MessageRole.AI`) and the `options.threadId` to receive only relevant updates. Pass `null` as the filter to receive all types for the specified thread.
*   **Unsubscribe:** **Crucially**, store the returned `unsubscribe` function and call it when your UI component unmounts to prevent memory leaks.
*   **Get History:** Use the optional `getHistory` method on sockets to fetch recent data upon component mount.

## Related Guides

*   [Observation System Guide](./ObservationSystem.md)
*   [Context System Guide](./ContextSystem.md) (specifically `ConversationManager`)
*   [Basic Usage Tutorial](../BasicUsage.md) (shows simple socket subscription examples)