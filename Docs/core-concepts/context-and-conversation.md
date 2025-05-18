# Context and Conversation Management

In the ART Framework, managing the context of an interaction and the history of a conversation is fundamental to building intelligent agents. This is handled by the **Context System**, primarily through the `ConversationManager` and its underlying `ConversationRepository`. The `ContextProvider` is also part of this system, though its role is more geared towards future enhancements like Retrieval-Augmented Generation (RAG).

## `ConversationManager`

*   **Source:** `src/systems/context/managers/ConversationManager.ts`
*   **Interface:** `IConversationManager` from `src/core/interfaces.ts`

The `ConversationManager` is responsible for:

1.  **Adding Messages:** Appending new `ConversationMessage` objects to a specific thread's history.
2.  **Retrieving Messages:** Fetching past messages from a thread's history, with options for limiting the number of messages.
3.  **UI Notification:** Notifying the `ConversationSocket` (obtained from `UISystem`) whenever new messages are added, allowing connected UIs to update in real-time.

**Key Methods:**

*   **`async addMessages(threadId: string, messages: ConversationMessage[]): Promise<void>`:**
    *   Takes a `threadId` and an array of `ConversationMessage` objects.
    *   Delegates the actual storage of these messages to the `ConversationRepository`.
    *   After successfully adding messages to the repository, it iterates through the added messages and calls `conversationSocket.notify(message, { targetThreadId: threadId })` for each one.
    *   Performs basic validation (e.g., `threadId` cannot be empty, `messages` array should not be null/empty).

*   **`async getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]>`:**
    *   Takes a `threadId` and optional `MessageOptions` (e.g., `limit`, `beforeTimestamp`, `afterTimestamp`).
    *   Delegates the retrieval to `ConversationRepository.getMessages()`.
    *   Returns the array of `ConversationMessage` objects fetched from the repository.

The `PESAgent` uses `ConversationManager`:
*   To fetch historical messages at the beginning of its `process` cycle to build context for the LLM.
*   To add the new user query and the final AI response to the history at the end of the `process` cycle.

## `ConversationRepository`

*   **Source:** `src/systems/context/repositories/ConversationRepository.ts`
*   **Interface:** `IConversationRepository` from `src/core/interfaces.ts`

The `ConversationRepository` is an abstraction layer over the chosen `StorageAdapter` (e.g., `InMemoryStorageAdapter` or `IndexedDBStorageAdapter`). It specializes in storing and retrieving `ConversationMessage` objects.

**Key Responsibilities & Implementation Details:**

*   **Storage Collection:** It typically stores messages in a dedicated collection/object store within the `StorageAdapter` (e.g., named `"conversations"`).
*   **Message ID as Key:** Each `ConversationMessage` has a `messageId`. The repository uses this `messageId` as the primary key when storing the message (e.g., by setting an `id` property on the stored object to `message.messageId` if the adapter uses `id` as `keyPath`).
*   **`addMessages` Implementation:**
    *   Iterates through the provided messages.
    *   For each message, it calls `storageAdapter.set(collectionName, message.messageId, messageWithInternalId)`.
*   **`getMessages` Implementation:**
    *   Calls `storageAdapter.query(collectionName, { filter: { threadId: threadId } })` to fetch all messages belonging to the specified thread.
    *   **Client-Side Sorting & Filtering:** After retrieving messages, it performs client-side sorting by `timestamp` (ascending by default to represent chronological order). It also applies any `beforeTimestamp`, `afterTimestamp`, and `limit` options from `MessageOptions` on the retrieved set.
    *   The `limit` option, when applied client-side after an ascending sort, effectively retrieves the *most recent* 'N' messages if the full history is first sorted chronologically.
    *   It ensures that the internal `id` field (used for storage keying) is removed from the messages before returning them, so they conform strictly to the `ConversationMessage` interface.

## `ContextProvider`

*   **Source:** `src/systems/context/ContextProvider.ts`

As noted in its source code comments, the `ContextProvider` in ART `v0.2.7` is primarily a **placeholder** for future capabilities, particularly for Retrieval-Augmented Generation (RAG).

**Current (v0.2.7) Behavior:**

*   **`constructor()`:** Logs an informational message about its placeholder status.
*   **`async getDynamicContext(_threadId: string, _query?: string): Promise<Record<string, any>>`:**
    *   This method is intended to fetch dynamic, relevant information from external sources (like vector databases, APIs, documents) based on the current query and conversation.
    *   In `v0.2.7`, it simply logs that it was called and returns an empty object (`Promise.resolve({})`).

**Future Role (RAG):**

In future versions, `ContextProvider` would be enhanced to:

1.  Analyze the user's query and potentially the recent conversation history.
2.  Formulate queries to one or more configured knowledge sources (e.g., a vector store containing embeddings of your documents).
3.  Retrieve relevant chunks of information from these sources.
4.  Format this retrieved information into a string or structured data.
5.  Return this dynamic context, which the Agent Core (e.g., `PESAgent`) would then inject into the LLM prompt, allowing the LLM to generate responses grounded in this external knowledge.

**In Summary:**

*   `ConversationManager` and `ConversationRepository` are the workhorses for managing and persisting explicit conversation history.
*   `ContextProvider` is currently a forward-looking component, laying the groundwork for more advanced dynamic context retrieval in future ART versions. For now, core context like history and thread configuration is handled directly by the agent via `ConversationManager` and `StateManager`.