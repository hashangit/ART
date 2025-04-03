// src/systems/ui/model-socket.ts
import { TypedSocket } from '../../core/interfaces'; // Corrected import path
import { ModelCapability } from '../reasoning/model-registry';
import { Logger } from '../../utils/logger'; // Optional: for logging socket events

// Define the structure for model-related events
export interface ModelEvent {
  type: 'MODEL_CAPABILITY_MISMATCH' | 'MODEL_SELECTION_CHANGED' | 'MODEL_ERROR';
  originalModel?: string; // e.g., "openai/gpt-3.5-turbo"
  requiredCapabilities?: ModelCapability[];
  suggestedModel?: string; // e.g., "openai/gpt-4o"
  selectedModel?: string; // For MODEL_SELECTION_CHANGED
  error?: string; // For MODEL_ERROR
  metadata?: Record<string, any>;
  threadId?: string; // Optional thread context
}

// Filter type for ModelSocket (could be ModelEvent['type'] or more complex)
export type ModelEventFilter = ModelEvent['type'] | ModelEvent['type'][];

// Define subscriber structure
interface Subscriber<DataType, FilterType> {
    callback: (data: DataType) => void;
    filter?: FilterType;
    options?: { threadId?: string };
}

export class ModelSocket implements TypedSocket<ModelEvent, ModelEventFilter> { // Changed extends to implements
    private subscribers: Subscriber<ModelEvent, ModelEventFilter>[] = [];

    constructor() {
        // No super() call needed when implementing an interface
        Logger.debug('ModelSocket initialized.');
    }

    subscribe(
        callback: (data: ModelEvent) => void,
        filter?: ModelEventFilter,
        options?: { threadId?: string }
    ): () => void {
        const subscriber: Subscriber<ModelEvent, ModelEventFilter> = { callback, filter, options };
        this.subscribers.push(subscriber);
        Logger.debug(`New subscription to ModelSocket`, { filter, options, count: this.subscribers.length });

        // Return unsubscribe function
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== subscriber);
            Logger.debug(`Unsubscribed from ModelSocket`, { count: this.subscribers.length });
        };
    }

    notify(data: ModelEvent, options?: { targetThreadId?: string; targetSessionId?: string }): void {
        Logger.debug(`Notifying ModelSocket: ${data.type}`, { data, options, subscriberCount: this.subscribers.length });
        this.subscribers.forEach(sub => {
            // Basic filtering logic (can be expanded)
            const threadMatch = !sub.options?.threadId || sub.options.threadId === options?.targetThreadId || sub.options.threadId === data.threadId;
            const typeFilter = sub.filter;
            let typeMatch = true;
            if (typeFilter) {
                if (Array.isArray(typeFilter)) {
                    typeMatch = typeFilter.includes(data.type);
                } else {
                    typeMatch = typeFilter === data.type;
                }
            }

            if (threadMatch && typeMatch) {
                try {
                    sub.callback(data);
                } catch (error: any) {
                    Logger.error(`Error in ModelSocket subscriber callback: ${error.message}`, { error, data });
                }
            }
        });
    }

    // getHistory implementation would depend on whether model events are persisted
    // For v1.0, likely not persisted, so getHistory might return empty or throw.
    async getHistory(
        _filter?: ModelEventFilter, // Prefixed with underscore
        _options?: { threadId?: string; limit?: number } // Prefixed with underscore
    ): Promise<ModelEvent[]> {
        Logger.warn('ModelSocket getHistory is not implemented as model events are not persisted.');
        return [];
    }
}