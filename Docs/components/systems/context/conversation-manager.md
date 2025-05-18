# Deep Dive: `ConversationManager`

The `ConversationManager` is a key component of ART's Context System, responsible for managing the history of `ConversationMessage`s within a specific thread. It acts as an intermediary between the agent core (like `PESAgent`) and the `ConversationRepository`, which handles the actual data persistence.

*   **Source:** `src/systems/context/managers/ConversationManager.ts`
*   **Implements:** `ConversationManager` interface from `src/core/interfaces.ts`
*   **Dependencies:** `IConversationRepository`, `ConversationSocket` (from `UISystem`).

## Constructor

```typescript
constructor(
    conversationRepository: IConversationRepository,
    conversationSocket: ConversationSocket
)
```

*   `conversationRepository`: An instance implementing `IConversationRepository` (typically `ConversationRepository`). This is used to save new messages and retrieve historical messages.
*   `conversationSocket`: An instance of `ConversationSocket`. The manager uses this to `notify` subscribers (e.g., the UI) whenever new messages are added to a thread.

## Core Responsibilities & Methods

1.  **Adding Messages to History:**
    *   **`async addMessages(threadId: string, messages: ConversationMessage[]): Promise<void>`**
        *   **Purpose:** To append one or more `ConversationMessage` objects to the history of a specified `threadId`.
        *   **Process:**
            1.  Performs basic validation:
                *   Ensures `threadId` is not empty (rejects with an error if it is).
                *   If `messages` array is null or empty, it resolves immediately without further action.
            2.  Calls `this.repository.addMessages(threadId, messages)` to persist the messages using the underlying `ConversationRepository`.
            3.  After the messages are successfully saved to the repository, it iterates through each message in the `messages` array.
            4.  For each `message`, it calls `this.conversationSocket.notify(message, { targetThreadId: threadId })`. This broadcasts the new message to any UI components or other services subscribed to the `ConversationSocket` for that particular thread.
        *   **Error Handling:**
            *   Errors from `repository.addMessages()` (e.g., storage adapter failure) will propagate and cause the promise to reject. If this happens, socket notifications are typically not sent.
            *   Errors during `conversationSocket.notify()` are caught and logged by the manager, but they generally do not cause the `addMessages` promise itself to reject, ensuring that a notification failure doesn't prevent the overall message addition process from being considered complete from the repository's perspective.

2.  **Retrieving Messages from History:**
    *   **`async getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]>`**
        *   **Purpose:** To fetch historical `ConversationMessage`s for a given `threadId`.
        *   **Process:**
            1.  Performs basic validation: Ensures `threadId` is not empty (rejects with an error if it is).
            2.  Calls `this.repository.getMessages(threadId, options)` to retrieve messages from the `ConversationRepository`.
            3.  The `options` parameter (`MessageOptions`) can include:
                *   `limit?: number`: Maximum number of messages to retrieve.
                *   `beforeTimestamp?: number`: Retrieve messages created before this timestamp.
                *   `afterTimestamp?: number`: Retrieve messages created after this timestamp.
                *   `roles?: MessageRole[]`: (Note: While `MessageOptions` defines this, the `ConversationRepository` in `v0.2.7` primarily handles limit and timestamp filtering; role filtering might be client-side within the repository or not fully implemented at the storage query level.)
            4.  Returns the array of `ConversationMessage` objects fetched by the repository. The repository typically sorts these messages chronologically.
        *   **Error Handling:** Errors from `repository.getMessages()` will propagate.

## Interaction with `PESAgent`

The `PESAgent` typically uses the `ConversationManager` in two main scenarios:

1.  **Beginning of `process()`:**
    *   It calls `conversationManager.getMessages(threadId, { limit: historyLimitFromConfig })` to fetch the recent conversation history. This history is then formatted and included in the prompts sent to the LLM for both planning and synthesis phases, providing context for the current interaction.

2.  **End of `process()` (Finalization):**
    *   After the LLM has generated its final response, the `PESAgent` creates two `ConversationMessage` objects:
        *   One for the user's initial query (`role: MessageRole.USER`).
        *   One for the AI's final synthesized response (`role: MessageRole.AI`).
    *   It then calls `conversationManager.addMessages(threadId, [userQueryMessage, aiResponseMessage])` to save these new messages to the history and notify the UI.

The `ConversationManager` provides a clean abstraction for handling conversation history, separating the agent's core logic from the specifics of data storage and UI updates.
```

```markdown
docs/components/systems/context/conversation-repository.md
```
```markdown
# Deep Dive: `ConversationRepository`

The `ConversationRepository` is responsible for the persistence and retrieval of `ConversationMessage` objects. It implements the `IConversationRepository` interface and uses an injected `StorageAdapter` to interact with the actual storage backend (like `InMemoryStorageAdapter` or `IndexedDBStorageAdapter`).

*   **Source:** `src/systems/context/repositories/ConversationRepository.ts`
*   **Implements:** `IConversationRepository` from `src/core/interfaces.ts`
*   **Dependencies:** `StorageAdapter`.

## Constructor

```typescript
constructor(storageAdapter: StorageAdapter)
```

*   `storageAdapter`: An instance of a class that implements the `StorageAdapter` interface. This adapter will be used for all underlying storage operations.
    *   The constructor throws an error if no `storageAdapter` is provided.
    *   It assumes the `storageAdapter` has been (or will be) initialized separately (e.g., by `AgentFactory`).

## Core Responsibilities & Methods

The `ConversationRepository` typically uses a specific collection name (e.g., `"conversations"`) within the `StorageAdapter` to store messages.

1.  **Adding Messages:**
    *   **`async addMessages(threadId: string, messages: ConversationMessage[]): Promise<void>`**
        *   **Purpose:** To save one or more `ConversationMessage` objects to the storage.
        *   **Process:**
            1.  If the `messages` array is null or empty, the method returns immediately.
            2.  It iterates through each `message` in the input array.
            3.  **ID Handling:** For compatibility with `StorageAdapter`s that use a common `keyPath` like `'id'`, the repository creates a `StoredConversationMessage` object. This object includes all properties of the original `ConversationMessage` plus an `id` property that is explicitly set to the value of `message.messageId`.
                ```typescript
                // Internal structure used for storage
                type StoredConversationMessage = ConversationMessage & { id: string };
                // ...
                const messageToStore: StoredConversationMessage = {
                    ...message,
                    id: message.messageId // message.messageId becomes the primary key for storage
                };
                ```
            4.  Calls `this.adapter.set<StoredConversationMessage>(this.collectionName, messageToStore.id, messageToStore)` for each message. This uses the `messageId` (now also `messageToStore.id`) as the key for the `set` operation.
            5.  If a message's `message.threadId` does not match the `threadId` parameter passed to `addMessages`, a warning is logged, but the message is still typically added under its own `messageId` (the `threadId` parameter to `addMessages` is primarily for context and potential future validation, not for altering the `message.threadId` itself during storage by this method).
        *   **Error Handling:** Propagates errors from the `storageAdapter.set()` calls.

2.  **Retrieving Messages:**
    *   **`async getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]>`**
        *   **Purpose:** To fetch `ConversationMessage`s for a specific `threadId`, with optional filtering and limiting.
        *   **Process:**
            1.  **Initial Fetch:** Calls `this.adapter.query<StoredConversationMessage>(this.collectionName, { filter: { threadId: threadId } })`. This attempts to retrieve all messages from the `"conversations"` collection where the `threadId` property matches the provided `threadId`.
            2.  **Client-Side Sorting:** The results from the adapter (`queryResults`) are **sorted by `timestamp` in ascending order** (oldest first). This is crucial for maintaining the correct chronological sequence of the conversation.
            3.  **Client-Side Timestamp Filtering:**
                *   If `options.beforeTimestamp` is provided, messages with `timestamp >= options.beforeTimestamp` are filtered out.
                *   If `options.afterTimestamp` is provided, messages with `timestamp <= options.afterTimestamp` are filtered out.
            4.  **Client-Side Limiting:**
                *   If `options.limit` is provided and is greater than 0, the sorted and filtered list is sliced to return only the **most recent 'N' messages** (due to the ascending sort, `slice(-options.limit)` is used).
                *   If `options.limit` is 0, an empty array is returned.
                *   If `options.limit` is negative, the behavior of `slice` might be unexpected (e.g., `slice(-(-1))` becomes `slice(1)`), potentially returning all but the first 'N' items. The current implementation tests this behavior.
            5.  **Data Cleaning:** Before returning, the internal `id` property (which was a copy of `messageId`) is removed from each message object to ensure the returned objects strictly conform to the `ConversationMessage` interface.
        *   **Error Handling:** Propagates errors from the `storageAdapter.query()` call.

**Note on Querying and Performance:**

The `ConversationRepository` in ART `v0.2.7` performs significant parts of filtering (timestamps) and limiting **client-side** after fetching potentially all messages for a thread that match the `threadId` filter. While this works for many scenarios, for applications with extremely large conversation histories per thread, this approach could become less performant. Future optimizations might involve pushing more of the querying logic (especially sorting and complex filtering) down into the `StorageAdapter` implementations if the underlying storage backends support it efficiently (e.g., using database indexes).

The `ConversationRepository` provides the necessary abstraction for the `ConversationManager` and, by extension, the agent core, to interact with conversation history without being concerned about the specifics of how or where that history is stored.