import { ConversationManager as IConversationManager, IConversationRepository } from '../../../core/interfaces';
import { ConversationMessage, MessageOptions } from '../../../types';

/**
 * Manages conversation history for different threads using an underlying repository.
 */
export class ConversationManager implements IConversationManager {
    private repository: IConversationRepository;

    constructor(conversationRepository: IConversationRepository) {
        this.repository = conversationRepository;
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
        // Potential place to emit events (e.g., via ConversationSocket) in later phases.
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