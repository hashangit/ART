// src/systems/ui/typed-socket.ts
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@/utils/logger'; // Assuming logger exists

export type UnsubscribeFunction = () => void;

export interface Subscription<DataType, FilterType> {
  id: string;
  callback: (data: DataType) => void;
  filter?: FilterType;
  options?: { threadId?: string };
}

/**
 * A generic class for implementing a publish/subscribe pattern with filtering capabilities.
 * Designed for decoupling components, particularly UI updates from backend events.
 */
export class TypedSocket<DataType, FilterType = any> {
  protected subscriptions: Map<string, Subscription<DataType, FilterType>> = new Map();
  // Removed logger instance property

  constructor() {
    // No logger instantiation needed
  }

  /**
   * Subscribes a callback function to receive notifications.
   * @param callback - The function to call when new data is notified.
   * @param filter - An optional filter to only receive specific types of data.
   * @param options - Optional configuration, like a threadId for filtering.
   * @returns An unsubscribe function.
   */
  subscribe(
    callback: (data: DataType) => void,
    filter?: FilterType,
    options?: { threadId?: string }
  ): UnsubscribeFunction {
    const id = uuidv4();
    const subscription: Subscription<DataType, FilterType> = { id, callback, filter, options };
    this.subscriptions.set(id, subscription);
    Logger.debug(`New subscription added: ${id}, Filter: ${JSON.stringify(filter)}, Options: ${JSON.stringify(options)}`); // Use static Logger

    return () => {
      this.subscriptions.delete(id);
      Logger.debug(`Subscription removed: ${id}`); // Use static Logger
    };
  }

  /**
   * Notifies all relevant subscribers with new data.
   * @param data - The data payload to send to subscribers.
   * @param options - Optional targeting options (e.g., targetThreadId).
   * @param filterCheck - A function to check if a subscription's filter matches the data.
   */
  notify(
    data: DataType,
    options?: { targetThreadId?: string; targetSessionId?: string }, // targetSessionId might be useful later
    filterCheck?: (data: DataType, filter?: FilterType) => boolean
  ): void {
    // ADD THIS LOG: Identify the socket instance being notified
    const socketType = this.constructor.name; // Get class name (e.g., 'LLMStreamSocket', 'ObservationSocket')
    Logger.debug(`[${socketType}] notify() called. Data type: ${typeof data}, Sub count: ${this.subscriptions.size}, Options: ${JSON.stringify(options)}`);

    Logger.debug(`Notifying ${this.subscriptions.size} subscribers. Data: ${JSON.stringify(data).substring(0, 100)}..., Options: ${JSON.stringify(options)}`); // Use static Logger
    this.subscriptions.forEach((sub) => {
      try {
        // 1. Check threadId if provided in both subscription options and notification options
        if (sub.options?.threadId && options?.targetThreadId && sub.options.threadId !== options.targetThreadId) {
          return; // Skip if thread IDs don't match
        }

        // 2. Check filter if provided and a filterCheck function exists
        if (filterCheck && sub.filter !== undefined && !filterCheck(data, sub.filter)) {
          return; // Skip if filter doesn't match
        }

        // If checks pass, invoke the callback
        Logger.debug(`Checks passed for sub ${sub.id}. Invoking callback.`); // Add log before callback
        sub.callback(data);
      } catch (error) {
        Logger.error(`Error executing subscription callback ${sub.id}:`, error); // Use static Logger
        // Decide if we should remove the faulty subscription? For now, just log.
      }
    });
  }

  /**
   * Optional: Retrieves historical data. This base implementation is empty.
   * Subclasses might implement this by interacting with repositories.
   */
  async getHistory?(_filter?: FilterType, _options?: { threadId?: string; limit?: number }): Promise<DataType[]> { // Prefix unused vars
    Logger.warn('getHistory is not implemented in the base TypedSocket.'); // Use static Logger
    return [];
  }

   /**
   * Clears all subscriptions. Useful for cleanup.
   */
  clearAllSubscriptions(): void {
    this.subscriptions.clear();
    Logger.debug('All subscriptions cleared.'); // Use static Logger
  }
}