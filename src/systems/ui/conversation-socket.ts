// src/systems/ui/conversation-socket.ts
import { TypedSocket } from './typed-socket';
import { ConversationMessage, MessageRole } from '../../types';
import { Logger } from '../../utils/logger';
import { IConversationRepository } from '../../core/interfaces'; // Assuming this exists

/**
 * A specialized TypedSocket for handling ConversationMessage data.
 * Allows filtering by MessageRole.
 * Can optionally fetch historical messages from a repository.
 */
export class ConversationSocket extends TypedSocket<ConversationMessage, MessageRole | MessageRole[]> {
  private conversationRepository?: IConversationRepository;

  constructor(conversationRepository?: IConversationRepository) {
    super(); // No logger instance needed
    this.conversationRepository = conversationRepository;
    Logger.debug('ConversationSocket initialized.');
  }

  /**
   * Notifies subscribers about a new conversation message.
   * @param message - The conversation message data.
   */
  notifyMessage(message: ConversationMessage): void {
    Logger.debug(`Notifying Message: ${message.messageId} (${message.role}) for thread ${message.threadId}`);
    super.notify(
      message,
      { targetThreadId: message.threadId },
      (data, filter) => {
        if (!filter) return true; // No filter, always notify
        if (Array.isArray(filter)) {
          return filter.includes(data.role); // Check if role is in the array
        }
        return data.role === filter; // Check for single role match
      }
    );
  }

  /**
   * Retrieves historical messages, optionally filtered by role and thread.
   * Requires a ConversationRepository to be configured.
   * @param filter - Optional MessageRole or array of roles to filter by.
   * @param options - Optional threadId and limit.
   * @returns A promise resolving to an array of messages.
   */
  async getHistory(
    filter?: MessageRole | MessageRole[],
    options?: { threadId?: string; limit?: number } // Add other MessageOptions if needed
  ): Promise<ConversationMessage[]> {
    if (!this.conversationRepository) {
      Logger.warn('Cannot getHistory for ConversationSocket: ConversationRepository not configured.');
      return [];
    }
    if (!options?.threadId) {
      Logger.warn('Cannot getHistory for ConversationSocket: threadId is required.');
      return [];
    }

    Logger.debug(`Getting history for ConversationSocket: Thread ${options.threadId}, Filter: ${JSON.stringify(filter)}, Limit: ${options.limit}`);

    // Construct the MessageOptions for the repository method
    // Note: The IConversationRepository.getMessages interface uses MessageOptions,
    // which currently only defines limit and timestamps. Filtering by role needs
    // to be handled either within the repository implementation or client-side after fetching.
    // For now, we pass limit and assume the repository handles it. Role filtering is omitted here.
    const messageOptions: { limit?: number } = {};
    if (options.limit !== undefined) {
      messageOptions.limit = options.limit;
    }

    // TODO: If role filtering is crucial, the IConversationRepository interface
    // and its implementations might need updating to support filtering by role.
    if (filter) {
        Logger.warn(`Role filtering requested for ConversationSocket.getHistory, but not directly supported by IConversationRepository.getMessages. Fetching all roles up to limit.`);
    }

    try {
      const messages = await this.conversationRepository.getMessages(
        options.threadId,
        messageOptions
      );
      // Messages are typically returned in chronological order (oldest first).
      return messages;
    } catch (error) {
      Logger.error(`Error fetching message history for thread ${options.threadId}:`, error);
      return [];
    }
  }
}