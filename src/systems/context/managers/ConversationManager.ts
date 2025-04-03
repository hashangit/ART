import { ConversationManager as IConversationManager, IConversationRepository } from '../../../core/interfaces';
import { ConversationSocket } from '../../ui/conversation-socket'; // Import the class
import { ConversationMessage, MessageOptions } from '../../../types';

/**
 * Manages conversation history for different threads using an underlying repository.
 */
export class ConversationManager implements IConversationManager {
    private repository: IConversationRepository;
    private conversationSocket: ConversationSocket; // Add socket property

    constructor(
        conversationRepository: IConversationRepository,
        conversationSocket: ConversationSocket // Add socket to constructor
    ) {
        this.repository = conversationRepository;
        this.conversationSocket = conversationSocket; // Assign socket
    }

    /**
     * Adds one or more messages to a thread's history via the repository.
     * @param threadId The ID of the thread.
     * @param messages An array of messages to add.
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
            try {
                this.conversationSocket.notifyMessage(message);
            } catch (error) {
                // Log error but don't let notification failure stop the flow
                console.error(`ConversationManager: Failed to notify message ${message.messageId} via socket`, error);
            }
        });
    }

    /**
     * Retrieves messages from a thread's history via the repository.
     * @param threadId The ID of the thread.
     * @param options Filtering and pagination options.
     * @returns An array of conversation messages.
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