import { IStateRepository, StorageAdapter } from '../../../core/interfaces';
import { ThreadContext, ThreadConfig, AgentState } from '../../../types';

// Define the structure of the data as stored, including the 'id' field (threadId)
type StoredThreadContext = ThreadContext & { id: string };

/**
 * Implements the `IStateRepository` interface, providing methods to manage
 * `ThreadContext` (which includes `ThreadConfig` and `AgentState`) using an
 * underlying `StorageAdapter`. It stores the entire context object for each thread
 * under a key equal to the `threadId` within a designated collection (default: 'state').
 *
 * @implements {IStateRepository}
 */
export class StateRepository implements IStateRepository {
  private adapter: StorageAdapter;
  private readonly collectionName = 'state'; // Define the collection name

  /**
   * Creates an instance of StateRepository.
   * @param storageAdapter - The configured `StorageAdapter` instance used for persistence.
   */
  constructor(storageAdapter: StorageAdapter) {
     if (!storageAdapter) {
      throw new Error("StateRepository requires a valid StorageAdapter instance.");
    }
    this.adapter = storageAdapter;
    // Note: Adapter initialization (adapter.init()) should be handled externally.
  }

  /**
   /**
    * Retrieves the complete `ThreadContext` (config and state) for a specific thread ID.
    * @param threadId - The unique identifier of the thread.
    * @returns A promise resolving to the `ThreadContext` object if found, or `null` otherwise.
    * @throws {Error} Propagates errors from the storage adapter's `get` method.
    */
  async getThreadContext(threadId: string): Promise<ThreadContext | null> {
    const storedContext = await this.adapter.get<StoredThreadContext>(this.collectionName, threadId);
    if (!storedContext) {
      return null;
    }
    // Remove the internal 'id' field before returning
    // Create a copy and delete the 'id' property to avoid ESLint unused var rule
    const context = { ...storedContext };
    delete (context as Partial<StoredThreadContext>).id; // Cast to allow deletion
    return context as ThreadContext; // Cast back to the expected return type
  }

  /**
   /**
    * Saves (or overwrites) the complete `ThreadContext` for a specific thread ID.
    * Ensures the context object includes the `threadId` as the `id` property for storage.
    * @param threadId - The unique identifier of the thread.
   * @param context - The `ThreadContext` object to save. Must contain at least the `config` property.
   * @returns A promise that resolves when the context is successfully saved.
   * @throws {Error} If the context is missing the required `config` property or if the storage adapter fails.
   */
  async setThreadContext(threadId: string, context: ThreadContext): Promise<void> {
    if (!context || typeof context.config === 'undefined') {
        // Enforce that context must have at least a config part.
        return Promise.reject(new Error("StateRepository: ThreadContext must contain a 'config' property."));
    }
    const contextToStore: StoredThreadContext = {
      ...context,
      id: threadId, // Use threadId as the 'id' for storage keyPath
    };
    await this.adapter.set<StoredThreadContext>(this.collectionName, threadId, contextToStore);
  }

  /**
   /**
    * Retrieves only the `ThreadConfig` part of the context for a specific thread ID.
    * @param threadId - The unique identifier of the thread.
    * @returns A promise resolving to the `ThreadConfig` object if found, or `null` otherwise.
    * @throws {Error} Propagates errors from the underlying `getThreadContext` call.
    */
  async getThreadConfig(threadId: string): Promise<ThreadConfig | null> {
    const context = await this.getThreadContext(threadId);
    return context?.config ?? null;
  }

  /**
   /**
    * Sets or updates only the `ThreadConfig` part of the context for a specific thread ID.
    * It fetches the existing context, replaces the `config` field, preserves the existing `state` (or sets it to null if none existed),
    * and then saves the entire updated `ThreadContext` back to storage.
    * @param threadId - The unique identifier of the thread.
    * @param config - The `ThreadConfig` object to save.
    * @returns A promise that resolves when the updated context is saved.
    * @throws {Error} Propagates errors from the underlying `getThreadContext` or `setThreadContext` calls.
    */
  async setThreadConfig(threadId: string, config: ThreadConfig): Promise<void> {
    const currentContext = await this.getThreadContext(threadId);
    const newContext: ThreadContext = {
      config: config,
      state: currentContext?.state ?? null, // Preserve existing state or set to null
    };
    await this.setThreadContext(threadId, newContext);
  }

  /**
   /**
    * Retrieves only the `AgentState` part of the context for a specific thread ID.
    * @param threadId - The unique identifier of the thread.
    * @returns A promise resolving to the `AgentState` object if found and not null, or `null` otherwise.
    * @throws {Error} Propagates errors from the underlying `getThreadContext` call.
    */
  async getAgentState(threadId: string): Promise<AgentState | null> {
    const context = await this.getThreadContext(threadId);
    return context?.state ?? null;
  }

  /**
   /**
    * Sets or updates only the `AgentState` part of the context for a specific thread ID.
    * It fetches the existing context, replaces the `state` field, preserves the existing `config`,
    * and then saves the entire updated `ThreadContext` back to storage.
    * **Important:** This method requires that a `ThreadConfig` already exists for the thread.
    * Attempting to set state for a thread without prior configuration will result in an error.
    * @param threadId - The unique identifier of the thread.
   * @param state - The `AgentState` object to save.
   * @returns A promise that resolves when the updated context is saved.
   * @throws {Error} If no `ThreadConfig` exists for the `threadId`, or if errors occur during context retrieval or saving.
   */
  async setAgentState(threadId: string, state: AgentState): Promise<void> {
    const currentContext = await this.getThreadContext(threadId);
    if (!currentContext || !currentContext.config) {
      // Require config to exist before setting state.
      return Promise.reject(new Error(`StateRepository: Cannot set AgentState for thread '${threadId}' because no ThreadConfig exists. Set config first.`));
    }
    const newContext: ThreadContext = {
      config: currentContext.config, // Preserve existing config
      state: state,
    };
    await this.setThreadContext(threadId, newContext);
  }
}