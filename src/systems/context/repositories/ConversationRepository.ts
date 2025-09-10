import { IConversationRepository, StorageAdapter } from '@/core/interfaces';
import { ConversationMessage, MessageOptions } from '@/types';

// Define the structure of the data as stored, including the 'id' field
type StoredConversationMessage = ConversationMessage & { id: string };

/**
 * Implements the `IConversationRepository` interface, providing methods to
 * manage `ConversationMessage` objects using an underlying `StorageAdapter`.
 * Handles adding and retrieving conversation history for specific threads.
 *
 * It abstracts the underlying storage mechanism through the `StorageAdapter` interface,
 * allowing for different storage backends (e.g., in-memory, IndexedDB, Supabase)
 * to be used interchangeably.
 *
 * @see {@link IConversationRepository} for the interface it implements.
 * @see {@link StorageAdapter} for the storage backend interface.
 */
export class ConversationRepository implements IConversationRepository {
  private adapter: StorageAdapter;
  private readonly collectionName = 'conversations'; // Define the collection name

  /**
   * Creates an instance of ConversationRepository.
   * @param {StorageAdapter} storageAdapter - The configured `StorageAdapter` instance that will be used for persistence.
   */
  constructor(storageAdapter: StorageAdapter) {
    if (!storageAdapter) {
      throw new Error("ConversationRepository requires a valid StorageAdapter instance.");
    }
    this.adapter = storageAdapter;
    // Note: Initialization of the adapter (adapter.init()) should be handled
    // at the application setup level (e.g., within AgentFactory or createArtInstance)
    // before the repository is used.
  }

  /**
   * Adds one or more `ConversationMessage` objects to the storage for a specific thread.
   * It uses the `messageId` as the primary key for storage, assuming the adapter's collection uses 'id' as keyPath.
   * @param {string} threadId - The ID of the thread these messages belong to. Used for potential filtering/querying and validation.
   * @param {ConversationMessage[]} messages - An array of `ConversationMessage` objects to add. Each message should have a unique `messageId`.
   * @returns {Promise<void>} A promise that resolves when all messages have been attempted to be saved.
   * @throws {Error} Propagates errors from the storage adapter's `set` method.
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
   * Retrieves messages for a specific thread from the storage adapter.
   * This implementation fetches all messages for the thread and then applies
   * sorting, filtering (by timestamp), and limiting client-side.
   * For performance with very large histories, adapter-level querying/indexing would be preferable.
   * @param {string} threadId - The ID of the thread whose messages are to be retrieved.
   * @param {MessageOptions} [options] - Optional `MessageOptions` to control retrieval (limit, timestamp filters).
   * @returns {Promise<ConversationMessage[]>} A promise resolving to an array of `ConversationMessage` objects, sorted chronologically (ascending timestamp).
   * @throws {Error} Propagates errors from the storage adapter's `query` method.
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