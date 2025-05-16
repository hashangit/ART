import { StateManager as IStateManager, IStateRepository } from '../../../core/interfaces';
import { ThreadContext, ThreadConfig, AgentState, StateSavingStrategy } from '../../../types';

// Helper for deep cloning, as structuredClone might not be available in all environments
// or might not handle all types perfectly (e.g., functions, though not expected in AgentState).
// For simple JSON-like objects, JSON.parse(JSON.stringify(obj)) is a common approach.
function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // For Date objects
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }
    // For Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as any;
    }
    // For Objects
    const clonedObj = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}


/**
 * Manages thread-specific configuration (ThreadConfig) and state (AgentState)
 * using an underlying StateRepository. Supports explicit and implicit state saving strategies.
 */
export class StateManager implements IStateManager {
    private repository: IStateRepository;
    private strategy: StateSavingStrategy;
    private contextCache: Map<string, { originalStateSnapshot: string | null, context: ThreadContext }>;

    constructor(
        stateRepository: IStateRepository,
        strategy: StateSavingStrategy = 'explicit' // Default to explicit
    ) {
        this.repository = stateRepository;
        this.strategy = strategy;
        this.contextCache = new Map();
    }

    /**
     * Loads the complete context (`ThreadConfig` and `AgentState`) for a specific thread.
     * If in 'implicit' state saving strategy, it caches the loaded context and a snapshot
     * of its AgentState for later comparison in `saveStateIfModified`.
     * @param threadId - The unique identifier for the thread.
     * @param _userId - Optional user identifier (currently unused).
     * @returns A promise resolving to the `ThreadContext` object.
     * @throws {Error} If `threadId` is empty or if the repository fails to find the context.
     */
    async loadThreadContext(threadId: string, _userId?: string): Promise<ThreadContext> {
        if (!threadId) {
            throw new Error("StateManager: threadId cannot be empty for loadThreadContext.");
        }

        // If in implicit mode and context is already cached for this cycle, return cached version.
        // This ensures the agent operates on the same object instance that will be checked for modifications.
        if (this.strategy === 'implicit' && this.contextCache.has(threadId)) {
            // console.debug(`StateManager (implicit): Returning cached context for ${threadId}`);
            return this.contextCache.get(threadId)!.context;
        }
        
        const contextFromRepo = await this.repository.getThreadContext(threadId);
        if (!contextFromRepo) {
            throw new Error(`StateManager: Thread context not found for threadId '${threadId}'. Application should call setThreadConfig first for new threads.`);
        }

        if (this.strategy === 'implicit') {
            // console.debug(`StateManager (implicit): Caching context for ${threadId}`);
            // Deep clone the context to prevent modifications to the repository's object if it's not already a clone.
            // The agent will modify this cloned object.
            const cachedContext = deepClone(contextFromRepo);
            const originalStateSnapshot = cachedContext.state ? JSON.stringify(cachedContext.state) : null;
            this.contextCache.set(threadId, { originalStateSnapshot, context: cachedContext });
            return cachedContext;
        } else {
            // In explicit mode, return the context directly. Agent is responsible for all saves.
            return contextFromRepo;
        }
    }

    /**
     * Checks if a specific tool is permitted for use within a given thread.
     * It loads the thread's context and checks the `enabledTools` array in the configuration.
     * @param threadId - The ID of the thread.
     * @param toolName - The name of the tool to check.
     * @returns A promise resolving to `true` if the tool is listed in the thread's `enabledTools` config, `false` otherwise or if the context/config cannot be loaded.
     */
    async isToolEnabled(threadId: string, toolName: string): Promise<boolean> {
        try {
            const context = await this.loadThreadContext(threadId); // Will use cache if implicit
            return context.config?.enabledTools?.includes(toolName) ?? false;
        } catch (error) {
             console.warn(`StateManager: Could not check if tool '${toolName}' is enabled for thread '${threadId}' because context failed to load: ${error}`);
             return false;
        }
    }

    /**
     * Retrieves a specific value from the thread's configuration (`ThreadConfig`).
     * Loads the context first (which might come from cache in implicit mode).
     * @template T - The expected type of the configuration value.
     * @param threadId - The ID of the thread.
     * @param key - The top-level configuration key.
     * @returns A promise resolving to the configuration value, or `undefined`.
     */
    async getThreadConfigValue<T>(threadId: string, key: string): Promise<T | undefined> {
         const context = await this.loadThreadContext(threadId); // Will use cache if implicit

         if (!context.config) {
             return undefined;
         }
         if (key in context.config) {
            return (context.config as any)[key] as T | undefined;
         } else {
             return undefined;
         }
    }

    /**
     * Persists the thread's `AgentState` if it has been modified.
     * Behavior depends on the `stateSavingStrategy`:
     * - 'explicit': This method is a no-op for `AgentState` persistence and logs a warning.
     * - 'implicit': Compares the current `AgentState` (from the cached `ThreadContext` modified by the agent)
     *               with the snapshot taken during `loadThreadContext`. If different, saves the state
     *               to the repository and updates the snapshot.
     * @param threadId - The ID of the thread whose state might need saving.
     */
    async saveStateIfModified(threadId: string): Promise<void> {
        if (!threadId) {
            throw new Error("StateManager: threadId cannot be empty for saveStateIfModified.");
        }

        if (this.strategy === 'explicit') {
            console.warn(`StateManager (explicit): saveStateIfModified called for thread ${threadId}. AgentState must be saved explicitly using setAgentState(). This method is a no-op for AgentState in explicit mode.`);
            return Promise.resolve();
        }

        // Implicit strategy
        const cachedData = this.contextCache.get(threadId);
        if (!cachedData) {
            console.warn(`StateManager (implicit): saveStateIfModified called for thread ${threadId}, but context was not loaded or cached in this StateManager instance for this cycle. State will not be saved implicitly.`);
            return Promise.resolve();
        }

        const currentState = cachedData.context.state; // This is the potentially modified state
        const currentStateSnapshot = currentState ? JSON.stringify(currentState) : null;

        if (currentStateSnapshot !== cachedData.originalStateSnapshot) {
            // console.debug(`StateManager (implicit): AgentState for thread ${threadId} has changed. Saving...`);
            if (currentState === null) {
                // This case should ideally be handled by setAgentState(threadId, null) if we want to allow nulling out state.
                // For now, if it becomes null and was not null, we treat it as a change.
                // The repository's setAgentState should handle null appropriately if it's allowed.
                // However, our setAgentState currently throws if state is null.
                // This implies that if an agent wants to clear state, it should set it to an empty object or similar.
                // For implicit, if it becomes null, we might need to decide if repository.deleteAgentState is a thing.
                // For now, we'll assume if it's null, it means "remove it" or "set to null".
                // Let's assume repository.setAgentState can handle null to clear.
                console.warn(`StateManager (implicit): AgentState for thread ${threadId} became null. Attempting to save null state.`);
            }
             if (currentState !== null) { // Only save if not null, as our setAgentState doesn't allow null
                await this.repository.setAgentState(threadId, currentState);
                cachedData.originalStateSnapshot = currentStateSnapshot; // Update snapshot after successful save
                // console.debug(`StateManager (implicit): AgentState for thread ${threadId} saved and snapshot updated.`);
            } else {
                // If current state is null, and original was not, this is a change.
                // However, our current setAgentState throws on null.
                // This indicates a design consideration: how should "clearing" state be handled implicitly?
                // For now, we won't call repository.setAgentState with null to avoid the error.
                // This means if an agent sets context.state = null in implicit mode, it won't be persisted by saveStateIfModified.
                // They would need to use setAgentState with a non-null value (e.g., { data: null, version: ... }).
                console.warn(`StateManager (implicit): AgentState for thread ${threadId} is null. Implicit save will not persist null state due to setAgentState constraints. Use setAgentState with a valid object to clear or update.`);
            }
        } else {
            // console.debug(`StateManager (implicit): No changes detected in AgentState for thread ${threadId}.`);
        }
        return Promise.resolve();
    }
    
      /**
        * Sets or completely replaces the configuration (`ThreadConfig`) for a specific thread
        * by calling the underlying state repository. This also clears any cached context for the thread.
        * @param threadId - The ID of the thread.
        * @param config - The complete `ThreadConfig` object.
        */
      async setThreadConfig(threadId: string, config: ThreadConfig): Promise<void> {
        if (!threadId || !config) {
          throw new Error("StateManager: threadId and config are required for setThreadConfig.");
        }
        await this.repository.setThreadConfig(threadId, config);
        // If context was cached, it's now potentially stale regarding config.
        // And its originalStateSnapshot might be based on a context that no longer fully matches repo.
        // For simplicity, clear it. Next loadThreadContext will re-fetch and re-cache if implicit.
        if (this.contextCache.has(threadId)) {
            this.contextCache.delete(threadId);
            // console.debug(`StateManager: Cleared cached context for ${threadId} after setThreadConfig.`);
        }
      }

    /**
     * Explicitly sets or updates the AgentState for a specific thread by calling the underlying state repository.
     * If in 'implicit' mode, this also updates the cached snapshot to prevent `saveStateIfModified`
     * from re-saving the same state immediately.
     * @param threadId - The unique identifier of the thread.
     * @param state - The AgentState object to save. Must not be undefined or null.
     * @throws {Error} If threadId or state is undefined/null, or if the repository fails.
     */
    async setAgentState(threadId: string, state: AgentState): Promise<void> {
      if (!threadId) {
        throw new Error("StateManager: threadId cannot be empty for setAgentState.");
      }
      if (typeof state === 'undefined' || state === null) {
        throw new Error("StateManager: state cannot be undefined or null for setAgentState.");
      }
      
      await this.repository.setAgentState(threadId, state);
      // console.debug(`StateManager: Explicitly set agent state for ${threadId} in repository.`);

      if (this.strategy === 'implicit') {
        const cachedData = this.contextCache.get(threadId);
        if (cachedData) {
            // Update the cached context's state and its snapshot
            cachedData.context.state = deepClone(state); // Ensure cache has a clone
            cachedData.originalStateSnapshot = JSON.stringify(state);
            // console.debug(`StateManager (implicit): Updated cached context and snapshot for ${threadId} after explicit setAgentState.`);
        } else {
            // If not in cache, it means loadThreadContext wasn't called for this thread in this cycle,
            // or it's explicit mode. For implicit, if setAgentState is called without prior load,
            // there's no "original" snapshot to compare against for saveStateIfModified later in this cycle.
            // However, the state *is* saved in the repo. Next loadThreadContext will pick it up.
            // console.debug(`StateManager (implicit): setAgentState called for ${threadId} which was not in cache. State saved to repo.`);
        }
      }
    }
    
    /**
     * Clears the internal context cache. Useful if the underlying storage is manipulated externally
     * during an agent's processing cycle, though this is generally not recommended.
     * Or for testing purposes.
     */
    public clearCache(): void {
        this.contextCache.clear();
        // console.debug("StateManager: Internal context cache cleared.");
    }

      // Potential future methods:
      // async updateThreadConfig(threadId: string, updates: Partial<ThreadConfig>): Promise<void> { ... }
      // async updateAgentState(threadId: string, updates: Partial<AgentState>): Promise<void> { ... }
    }