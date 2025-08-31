// src/systems/ui/llm-stream-socket.ts
import { TypedSocket } from './typed-socket';
import { StreamEvent } from '@/types';
import { Logger } from '@/utils/logger';

// Define the type for the filter used in this specific socket
type StreamEventTypeFilter = StreamEvent['type'] | Array<StreamEvent['type']>;

/**
 * A dedicated socket for broadcasting LLM stream events (`StreamEvent`) to UI subscribers.
 * Extends the generic TypedSocket and implements filtering based on `StreamEvent.type`.
 */
export class LLMStreamSocket extends TypedSocket<StreamEvent, StreamEventTypeFilter> {

  constructor() {
    super(); // Call base constructor
    Logger.debug('LLMStreamSocket initialized.');
  }

  /**
   * Notifies subscribers about a new LLM stream event.
   * Filters based on event type if a filter is provided during subscription.
   * @param event - The StreamEvent data.
   */
  notifyStreamEvent(event: StreamEvent): void {
    Logger.debug(`Notifying LLMStreamEvent: ${event.type} for thread ${event.threadId}, trace ${event.traceId}`);
    super.notify(
      event,
      { targetThreadId: event.threadId, targetSessionId: event.sessionId },
      // Filter check function: Matches if no filter or if event type matches filter
      (data, filter) => {
        if (!filter) return true; // No filter, always notify
        if (Array.isArray(filter)) {
          return filter.includes(data.type); // Check if type is in the array
        }
        return data.type === filter; // Check for single type match
      }
    );
  }

  // getHistory is not applicable for transient stream events, so we don't implement it.
  // The base class provides an empty implementation with a warning if called.
}