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
     * Loads the full context (config + state) for a given thread from the repository.
     * Throws an error if the context is not found.
     * @param threadId The ID of the thread.
     * @param _userId Optional user ID (currently unused, for future access control).
     * @returns The thread context.
     * @throws {Error} If the thread context is not found.
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
     * Checks if a specific tool is enabled for the given thread based on its config.
     * Loads the context first.
     * @param threadId The ID of the thread.
     * @param toolName The name of the tool.
     * @returns True if the tool is enabled, false otherwise.
     * @throws {Error} If the thread context cannot be loaded.
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
     * Retrieves a specific configuration value for the thread.
     * Loads the context first. Supports only top-level keys.
     * @param threadId The ID of the thread.
     * @param key The configuration key (e.g., 'historyLimit', 'systemPrompt').
     * @returns The configuration value or undefined if not found.
     * @throws {Error} If the thread context cannot be loaded.
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
     * Saves the thread's state if it has been modified during execution.
     * NOTE: For v1.0, this is a placeholder (no-op). State must be saved explicitly.
     * @param threadId The ID of the thread.
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
       * Sets or updates the configuration for a specific thread.
       * Delegates the call to the state repository.
       * @param threadId The ID of the thread.
       * @param config The complete configuration object to set.
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