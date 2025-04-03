import { IStateRepository, StorageAdapter } from '../../../core/interfaces';
import { ThreadContext, ThreadConfig, AgentState } from '../../../types';

// Define the structure of the data as stored, including the 'id' field (threadId)
type StoredThreadContext = ThreadContext & { id: string };

/**
 * Repository for managing ThreadContext (ThreadConfig and AgentState) using a StorageAdapter.
 * Stores one context object per threadId in the 'state' collection.
 */
export class StateRepository implements IStateRepository {
  private adapter: StorageAdapter;
  private readonly collectionName = 'state'; // Define the collection name

  constructor(storageAdapter: StorageAdapter) {
    this.adapter = storageAdapter;
    // Adapter initialization should happen at application setup.
  }

  /**
   * Retrieves the full ThreadContext for a given threadId.
   * @param threadId The ID of the thread.
   * @returns The ThreadContext object or null if not found.
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
   * Saves the full ThreadContext for a given threadId.
   * This will overwrite any existing context for the thread.
   * @param threadId The ID of the thread.
   * @param context The ThreadContext object to save.
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
   * Retrieves only the ThreadConfig for a given threadId.
   * @param threadId The ID of the thread.
   * @returns The ThreadConfig object or null if not found.
   */
  async getThreadConfig(threadId: string): Promise<ThreadConfig | null> {
    const context = await this.getThreadContext(threadId);
    return context?.config ?? null;
  }

  /**
   * Saves only the ThreadConfig for a given threadId.
   * Retrieves the existing context, updates the config part, and saves it back.
   * If no context exists, creates a new one with the provided config and null state.
   * @param threadId The ID of the thread.
   * @param config The ThreadConfig object to save.
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
   * Retrieves only the AgentState for a given threadId.
   * @param threadId The ID of the thread.
   * @returns The AgentState object or null if not found or not set.
   */
  async getAgentState(threadId: string): Promise<AgentState | null> {
    const context = await this.getThreadContext(threadId);
    return context?.state ?? null;
  }

  /**
   * Saves only the AgentState for a given threadId.
   * Retrieves the existing context, updates the state part, and saves it back.
   * Throws an error if no configuration context exists for the thread,
   * as state typically depends on an existing configuration.
   * @param threadId The ID of the thread.
   * @param state The AgentState object to save.
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