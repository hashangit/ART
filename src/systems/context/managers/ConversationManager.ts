import { ConversationManager as IConversationManager, IConversationRepository } from '@/core/interfaces';
import { ConversationSocket } from '@/systems/ui/conversation-socket'; // Import the class
import { ConversationMessage, MessageOptions } from '@/types';

/**
 * Manages the retrieval and addition of `ConversationMessage` objects for different threads,
 * interacting with an underlying `IConversationRepository` for persistence and notifying
 * the `ConversationSocket` of new messages.
 */
export class ConversationManager implements IConversationManager {
    private repository: IConversationRepository;
    private conversationSocket: ConversationSocket; // Add socket property

    /**
     * Creates an instance of ConversationManager.
     * @param {IConversationRepository} conversationRepository - The repository responsible for persisting conversation messages.
     * @param {ConversationSocket} conversationSocket - The socket instance used to notify the UI of new messages.
     */
    constructor(
        conversationRepository: IConversationRepository,
        conversationSocket: ConversationSocket
    ) {
        this.repository = conversationRepository;
        this.conversationSocket = conversationSocket;
    }

    /**
     * Adds one or more messages to a specific thread's history using the repository
     * and notifies the `ConversationSocket` for each added message.
     * @param {string} threadId - The ID of the thread to add messages to. Must not be empty.
     * @param {ConversationMessage[]} messages - An array of `ConversationMessage` objects to add.
     * @returns {Promise<void>} A promise that resolves when messages are saved and notifications are sent (or attempted).
     * @throws {Error} If `threadId` is empty. Repository errors might also propagate.
     */
    async addMessages(threadId: string, messages: ConversationMessage[]): Promise<void> {
        // Basic validation or preprocessing could happen here if needed.
        if (!threadId) {
            return Promise.reject(new Error("ConversationManager: threadId cannot be empty."));
        }
        if (!messages || messages.length === 0) {
            return Promise.resolve(); // Nothing to add
        }
        // Delegate to the repository
        await this.repository.addMessages(threadId, messages);

        // Notify socket for each added message
        messages.forEach(message => {
            // Assuming ConversationSocket has a method like notifyMessage or just notify
            // Use notify as per the TypedSocket interface
            try {
                 this.conversationSocket.notify(message, { targetThreadId: threadId });
            } catch (error) {
                // Log error but don't let notification failure stop the flow
                console.error(`ConversationManager: Failed to notify message ${message.messageId} via socket for thread ${threadId}`, error);
            }
        });
    }

    /**
     * Retrieves messages from a specific thread's history using the repository.
     * @param {string} threadId - The ID of the thread whose history is needed. Must not be empty.
     * @param {MessageOptions} [options] - Optional parameters (`MessageOptions`) to control retrieval (e.g., limit, timestamp filters).
     * @returns {Promise<ConversationMessage[]>} A promise resolving to an array of `ConversationMessage` objects, typically ordered newest first by the repository.
     * @throws {Error} If `threadId` is empty. Repository errors might also propagate.
     */
    async getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]> {
         if (!threadId) {
            return Promise.reject(new Error("ConversationManager: threadId cannot be empty."));
        }
        // Delegate to the repository
        const messages = await this.repository.getMessages(threadId, options);
        return messages;
    }

    // Optional future methods:
    // async clearHistory(threadId: string): Promise<void> { ... }
    // async deleteMessage(threadId: string, messageId: string): Promise<void> { ... }
}