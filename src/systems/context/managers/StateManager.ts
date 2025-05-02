import { StateManager as IStateManager, IStateRepository } from '../../../core/interfaces';
import { ThreadContext, ThreadConfig } from '../../../types'; // Import ThreadConfig

/**
 * Manages thread-specific configuration (ThreadConfig) and state (AgentState)
 * using an underlying StateRepository.
 */
export class StateManager implements IStateManager {
    private repository: IStateRepository;

    constructor(stateRepository: IStateRepository) {
        this.repository = stateRepository;
    }

    /**
     * Loads the complete context (`ThreadConfig` and `AgentState`) for a specific thread
     * by calling the underlying state repository.
     * @param threadId - The unique identifier for the thread.
     * @param _userId - Optional user identifier (currently unused in this implementation, intended for future access control).
     * @returns A promise resolving to the `ThreadContext` object.
     * @throws {Error} If `threadId` is empty or if the repository fails to find the context (e.g., `THREAD_NOT_FOUND` error).
     */
    // Changed return type to Promise<ThreadContext> to match interface
    async loadThreadContext(threadId: string, _userId?: string): Promise<ThreadContext> {
        if (!threadId) {
            throw new Error("StateManager: threadId cannot be empty.");
        }
        const context = await this.repository.getThreadContext(threadId);
        if (!context) {
            // Throw error if context is not found, as per interface contract
            throw new Error(`StateManager: Thread context not found for threadId '${threadId}'.`);
        }
        return context;
    }

    /**
     * Checks if a specific tool is permitted for use within a given thread.
     * It loads the thread's context and checks the `enabledTools` array in the configuration.
     * @param threadId - The ID of the thread.
     * @param toolName - The name of the tool to check.
     * @returns A promise resolving to `true` if the tool is listed in the thread's `enabledTools` config, `false` otherwise or if the context/config cannot be loaded.
     */
    async isToolEnabled(threadId: string, toolName: string): Promise<boolean> {
        // loadThreadContext now throws if not found, simplifying checks here
        try {
            const context = await this.loadThreadContext(threadId);
            // If config or enabledTools is missing/null/undefined, it defaults to false
            return context.config?.enabledTools?.includes(toolName) ?? false;
        } catch (error) {
             // If context loading failed, treat as tool not enabled (or rethrow?)
             // For now, return false if context doesn't exist.
             console.warn(`StateManager: Could not check if tool '${toolName}' is enabled for thread '${threadId}' because context failed to load: ${error}`);
             return false;
        }
    }

    /**
     * Retrieves a specific value from the thread's configuration (`ThreadConfig`).
     * Loads the context first. Currently supports retrieving top-level keys only.
     * @template T - The expected type of the configuration value.
     * @param threadId - The ID of the thread.
     * @param key - The top-level configuration key (e.g., 'historyLimit', 'systemPrompt', 'reasoning').
     * @returns A promise resolving to the configuration value cast to type `T`, or `undefined` if the key doesn't exist, the config is missing, or the context fails to load.
     */
    // Changed key type to string to match interface
    async getThreadConfigValue<T>(threadId: string, key: string): Promise<T | undefined> {
         // loadThreadContext now throws if not found
         const context = await this.loadThreadContext(threadId);

         if (!context.config) {
             return undefined; // No config part in the context
         }

         // Check if the key exists directly on the config object
         // Use 'key in obj' for safer property access check than hasOwnProperty for potential prototype issues
         if (key in context.config) {
            // Cast to T, assuming the caller knows the expected type.
            // Need to cast config to 'any' or use index signature to allow string key access.
            return (context.config as any)[key] as T | undefined;
         } else {
             return undefined; // Key doesn't exist on the config object
         }
    }

    /**
     * Persists the thread's `AgentState` *if* it has been modified.
     * **Note:** In ART v0.2.4, this method is a **placeholder** and does not automatically track or save state changes.
     * State modifications must be explicitly saved using repository methods if persistence is required.
     * This method primarily serves as a point in the lifecycle where automatic state saving *could* occur in future versions.
     * @param threadId - The ID of the thread whose state might need saving.
     * @returns A promise that resolves immediately (as it's currently a no-op).
     */
    async saveStateIfModified(threadId: string): Promise<void> {
         if (!threadId) {
            return Promise.reject(new Error("StateManager: threadId cannot be empty for saveStateIfModified."));
        }
        // No-op in this v1.0 implementation.
        console.warn(`StateManager: saveStateIfModified called for thread ${threadId}, but state modification tracking/saving is not implemented in this version. State must be saved explicitly via repository methods.`);
        return Promise.resolve();
      }
    
      /**
       /**
        * Sets or completely replaces the configuration (`ThreadConfig`) for a specific thread
        * by calling the underlying state repository.
        * @param threadId - The ID of the thread whose configuration is being set.
        * @param config - The complete `ThreadConfig` object to save.
        * @returns A promise that resolves when the configuration has been saved by the repository.
        * @throws {Error} If `threadId` or `config` is missing, or if the repository fails.
        */
      async setThreadConfig(threadId: string, config: ThreadConfig): Promise<void> {
        if (!threadId || !config) {
          throw new Error("StateManager: threadId and config are required for setThreadConfig.");
        }
        // Logger.debug(`StateManager: Setting thread config for ${threadId}`); // Assuming Logger is available
        // Assuming IStateRepository has a setThreadConfig method
        await this.repository.setThreadConfig(threadId, config);
      }
    
      // Potential future methods:
      // async updateThreadConfig(threadId: string, updates: Partial<ThreadConfig>): Promise<void> { ... }
      // async updateAgentState(threadId: string, updates: Partial<AgentState>): Promise<void> { ... }
    }