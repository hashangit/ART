# Deep Dive: `ConversationSocket`

The `ConversationSocket` is a specialized `TypedSocket` within ART's UI System, designed specifically for broadcasting new `ConversationMessage` objects. It allows UI components or other services to subscribe to and receive real-time updates as messages are added to conversation threads.

*   **Source:** `src/systems/ui/conversation-socket.ts`
*   **Extends:** `TypedSocket<ConversationMessage, MessageRole | MessageRole[]>`

## Constructor

```typescript
constructor(conversationRepository?: IConversationRepository)
```

*   `conversationRepository?: IConversationRepository` (Optional): An instance of `IConversationRepository`.
    *   If provided, the `ConversationSocket` can use this repository to fulfill requests to its `getHistory()` method, allowing subscribers to fetch past messages.
    *   If not provided, `getHistory()` will log a warning and return an empty array.

## Key Methods

1.  **`subscribe(callback: (data: ConversationMessage) => void, filter?: MessageRole | MessageRole[], options?: { threadId?: string }): UnsubscribeFunction`**
    *   Inherited from `TypedSocket`.
    *   Registers a `callback` function to be invoked when a new `ConversationMessage` is notified that matches the optional `filter` and `options`.
    *   **`filter?: MessageRole | MessageRole[]`:**
        *   If provided, the callback will only be triggered if the `role` of the notified `ConversationMessage` matches the specified `MessageRole` (if a single role is given) or is one of the roles in the array (if an array of roles is given).
        *   If `undefined`, the callback receives messages of any role (subject to `options.threadId` filtering).
    *   **`options?: { threadId?: string }`:**
        *   If `options.threadId` is provided, the callback will only be triggered for messages belonging to that specific `threadId`.
        *   The `notifyMessage` method uses `targetThreadId` from the message itself for this comparison.
    *   Returns an `UnsubscribeFunction` to remove the subscription.

2.  **`notifyMessage(message: ConversationMessage): void`**
    *   This is a convenience method specific to `ConversationSocket` (though it internally calls the base `super.notify()`).
    *   **Purpose:** To broadcast a new `ConversationMessage` to all relevant subscribers.
    *   **Process:**
        1.  Logs the notification attempt.
        2.  Calls `super.notify(message, { targetThreadId: message.threadId }, filterCheckFn)`.
            *   `targetThreadId: message.threadId` ensures that only subscribers interested in this specific thread (or all threads) are considered.
            *   The `filterCheckFn` is an internal function passed to `super.notify` that implements the logic for matching the message's `role` against the subscriber's `MessageRole` filter.

3.  **`async getHistory(filter?: MessageRole | MessageRole[], options?: { threadId?: string; limit?: number }): Promise<ConversationMessage[]>`**
    *   Overrides the optional `getHistory` method from `TypedSocket`.
    *   **Purpose:** To retrieve historical `ConversationMessage`s for a specific thread, potentially filtered by role (though role filtering is currently a client-side aspect within the repository or not fully supported at the query level).
    *   **Process:**
        1.  Checks if a `conversationRepository` was configured during construction. If not, logs a warning and returns `[]`.
        2.  Checks if `options.threadId` is provided. If not, logs a warning and returns `[]`.
        3.  Constructs `MessageOptions` for the repository call, primarily using `options.limit`.
        4.  **Role Filtering Note:** If `filter` (a `MessageRole` or array of roles) is provided, it logs a warning. The current `IConversationRepository.getMessages` interface and its typical implementations (`ConversationRepository`) primarily filter by `threadId` and apply `limit` and timestamp filters at the repository/storage level. Filtering by `MessageRole` is not a standard feature of `getMessages` in `v0.2.7`. The `ConversationSocket.getHistory` method will fetch messages based on `threadId` and `limit`, and any role filtering would need to be done by the caller on the returned array if strictly required.
        5.  Calls `await this.conversationRepository.getMessages(options.threadId, messageOptions)`.
        6.  Returns the fetched messages.
    *   **Error Handling:** Catches errors from the repository, logs them, and returns an empty array.

## Usage Scenario

The `ConversationManager` is the primary component that calls `conversationSocket.notifyMessage()`. When the `ConversationManager.addMessages()` method successfully saves new messages to the `ConversationRepository`, it then notifies the `ConversationSocket` for each added message.

**Frontend/UI Integration (Conceptual):**

A UI component responsible for displaying a chat conversation would:

1.  Obtain an instance of `ConversationSocket` (e.g., via `artInstance.uiSystem.getConversationSocket()`).
2.  When a specific chat thread is opened in the UI:
    *   Call `conversationSocket.getHistory(undefined, { threadId: currentThreadId, limit: 50 })` to load recent messages.
    *   Call `conversationSocket.subscribe(newMessage => { /* Add newMessage to UI */ }, undefined, { threadId: currentThreadId })` to listen for new messages in real-time for that thread.
    *   Store the returned `unsubscribe` function to call it when the chat thread UI is closed or the component is unmounted, to prevent memory leaks.

This setup allows the UI to be dynamically updated as new messages (both from the user and the AI) are processed and saved by the ART backend.