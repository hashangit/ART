import { IConversationRepository, StorageAdapter } from '../../../core/interfaces';
import { ConversationMessage, MessageOptions } from '../../../types';

// Define the structure of the data as stored, including the 'id' field
type StoredConversationMessage = ConversationMessage & { id: string };

/**
 * Repository for managing ConversationMessages using a StorageAdapter.
 */
export class ConversationRepository implements IConversationRepository {
  private adapter: StorageAdapter;
  private readonly collectionName = 'conversations'; // Define the collection name

  constructor(storageAdapter: StorageAdapter) {
    this.adapter = storageAdapter;
    // Ensure the adapter is initialized (though init might be called elsewhere)
    // It's generally better to ensure init is called at the application setup level.
    // this.adapter.init?.();
  }

  /**
   * Adds multiple messages to the storage for a specific thread.
   * @param threadId The ID of the thread (used for potential indexing/querying, though not strictly needed if messages have it).
   * @param messages An array of ConversationMessage objects to add.
   */
  async addMessages(threadId: string, messages: ConversationMessage[]): Promise<void> {
    if (!messages || messages.length === 0) {
      return Promise.resolve();
    }

    // Use Promise.all to handle multiple async set operations concurrently
    const setPromises = messages.map(message => {
      if (message.threadId !== threadId) {
         console.warn(`ConversationRepository: Message ${message.messageId} has mismatching threadId (${message.threadId}) for repository operation on thread ${threadId}.`);
         // Decide on handling: throw error, skip message, or proceed? For now, proceed but log.
      }
      // Add the 'id' field mirroring 'messageId' for compatibility with keyPath='id' adapters
      const messageToStore: StoredConversationMessage = {
          ...message,
          id: message.messageId
      };
      return this.adapter.set<StoredConversationMessage>(this.collectionName, messageToStore.id, messageToStore);
    });

    await Promise.all(setPromises);
  }

  /**
   * Retrieves messages for a specific thread, with optional filtering and limiting.
   * Note: Timestamp filtering and sorting are currently handled client-side after retrieval.
   * @param threadId The ID of the thread to retrieve messages for.
   * @param options Optional parameters like limit and timestamp filters.
   * @returns A promise resolving to an array of ConversationMessages.
   */
  async getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]> {
    // Query the adapter for all messages matching the threadId
    const queryResults = await this.adapter.query<StoredConversationMessage>(this.collectionName, {
      filter: { threadId: threadId },
      // Add sorting at the adapter level if supported and efficient, otherwise sort client-side
      // sort: { timestamp: 'asc' } // Example if adapter supported it well
    });

    // Client-side filtering and sorting
    let filteredMessages = queryResults;

    // Sort by timestamp (ascending) - essential for correct history order
    filteredMessages.sort((a, b) => a.timestamp - b.timestamp);

    // Apply timestamp filters client-side
    if (options?.beforeTimestamp !== undefined) {
      filteredMessages = filteredMessages.filter(m => m.timestamp < options.beforeTimestamp!);
    }
    if (options?.afterTimestamp !== undefined) {
      filteredMessages = filteredMessages.filter(m => m.timestamp > options.afterTimestamp!);
    }

    // Apply limit client-side (usually applied last, after sorting/filtering)
    // If sorting descending, limit needs care. Assuming ascending sort for history.
    if (options?.limit !== undefined && options.limit > 0) {
      // Get the last 'limit' messages after sorting ascending
      filteredMessages = filteredMessages.slice(-options.limit);
    }

    // Remove the 'id' field before returning to match the ConversationMessage interface
    // Prefix 'id' with '_' because it's unused in the destructuring assignment.
    const finalMessages: ConversationMessage[] = filteredMessages.map(({ id: _id, ...rest }) => rest);

    return finalMessages;
  }
}