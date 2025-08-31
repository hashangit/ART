// src/systems/tool/ToolRegistry.ts
import { ToolRegistry as IToolRegistry, IToolExecutor, StateManager } from '@/core/interfaces'; // Added StateManager import
import { ToolSchema } from '@/types';
import { Logger } from '@/utils/logger';

/**
 * A simple in-memory implementation of the `ToolRegistry` interface.
 * Stores tool executors in a Map, keyed by the tool's unique name.
 */
export class ToolRegistry implements IToolRegistry {
  private executors: Map<string, IToolExecutor> = new Map();
  private stateManager: StateManager | undefined; // Added stateManager property

  /**
   * Creates an instance of ToolRegistry.
   * @param stateManager - Optional StateManager instance for advanced filtering.
   */
   constructor(stateManager?: StateManager) {
       this.stateManager = stateManager;
       Logger.debug(`ToolRegistry initialized ${stateManager ? 'with' : 'without'} StateManager.`);
   }

  /**
   * Registers a tool executor instance, making it available for lookup via `getToolExecutor`.
   * If a tool with the same name (from `executor.schema.name`) already exists, it will be overwritten, and a warning will be logged.
   * @param executor - The instance of the class implementing `IToolExecutor`. Must have a valid schema with a name.
   * @returns A promise that resolves when the tool is registered.
   * @throws {Error} If the provided executor or its schema is invalid.
   */
  async registerTool(executor: IToolExecutor): Promise<void> {
    if (!executor || !executor.schema || !executor.schema.name) {
      Logger.error('ToolRegistry: Attempted to register an invalid tool executor.');
      throw new Error('Invalid tool executor provided for registration.');
    }
    const toolName = executor.schema.name;
    if (this.executors.has(toolName)) {
      Logger.warn(`ToolRegistry: Overwriting existing tool registration for "${toolName}".`);
    }
    this.executors.set(toolName, executor);
    Logger.debug(`ToolRegistry: Registered tool "${toolName}".`);
  }

  /**
   * Retrieves a registered tool executor instance by its unique name.
   * @param toolName - The `name` property defined in the tool's schema.
   * @returns A promise resolving to the `IToolExecutor` instance, or `undefined` if no tool with that name is registered.
   */
  async getToolExecutor(toolName: string): Promise<IToolExecutor | undefined> {
    const executor = this.executors.get(toolName);
    if (!executor) {
        Logger.debug(`ToolRegistry: Tool "${toolName}" not found.`);
    }
    return executor;
  }

  /**
   * Retrieves the schemas of all currently registered tools.
   * Retrieves the schemas of available tools, optionally filtering by those enabled for a specific thread.
   * If `filter.enabledForThreadId` is provided and a `StateManager` was injected, it attempts to load the thread's configuration
   * and return only the schemas for tools listed in `enabledTools`. Otherwise, it returns all registered tool schemas.
   * @param filter - Optional filter criteria. `enabledForThreadId` triggers filtering based on thread config.
   * @returns A promise resolving to an array containing the `ToolSchema` of the available tools based on the filter.
   */
   async getAvailableTools(filter?: { enabledForThreadId?: string }): Promise<ToolSchema[]> {
    const allExecutors = Array.from(this.executors.values());
    const allSchemas = allExecutors.map(executor => executor.schema);

    if (filter?.enabledForThreadId && this.stateManager) {
      const threadId = filter.enabledForThreadId;
      Logger.debug(`ToolRegistry: Attempting to filter tools for threadId: ${threadId}`);
      try {
        // Assuming loadThreadContext returns null/undefined if not found or lacks config
        const threadContext = await this.stateManager.loadThreadContext(threadId);
        const enabledToolNames = threadContext?.config?.enabledTools;

        if (enabledToolNames && Array.isArray(enabledToolNames)) {
          Logger.debug(`ToolRegistry: Found enabled tools for thread ${threadId}: ${enabledToolNames.join(', ')}`);
          const enabledExecutors = allExecutors.filter(executor =>
            enabledToolNames.includes(executor.schema.name)
          );
          const enabledSchemas = enabledExecutors.map(executor => executor.schema);
          Logger.debug(`ToolRegistry: Returning ${enabledSchemas.length} enabled tool schemas for thread ${threadId}.`);
          return enabledSchemas;
        } else {
          Logger.warn(`ToolRegistry: No specific enabledTools found for thread ${threadId} or config missing. Returning all tools.`);
        }
      } catch (error: any) {
        Logger.error(`ToolRegistry: Error loading thread config for ${threadId}: ${error.message}. Returning all tools.`);
        // Fallback to returning all tools in case of error loading config
      }
    } else if (filter?.enabledForThreadId && !this.stateManager) {
        Logger.warn('ToolRegistry: Filtering by enabledForThreadId requested, but StateManager was not provided. Returning all tools.');
    }

    // Default: return all schemas if no filtering is applied or possible
    Logger.debug(`ToolRegistry: Returning all ${allSchemas.length} registered tool schemas.`);
    return allSchemas;
  }

  /**
   * Removes all registered tool executors from the registry.
   * Primarily useful for resetting state during testing or specific application scenarios.
   * @returns A promise that resolves when all tools have been cleared.
   */
  async clearAllTools(): Promise<void> {
      this.executors.clear();
      Logger.debug('ToolRegistry: Cleared all registered tools.');
  }

  /**
   * Unregister a single tool by name.
   */
  async unregisterTool(toolName: string): Promise<void> {
    if (this.executors.delete(toolName)) {
      Logger.debug(`ToolRegistry: Unregistered tool "${toolName}".`);
    }
  }

  /**
   * Unregister tools matching a predicate; returns count removed.
   */
  async unregisterTools(predicate: (schema: ToolSchema) => boolean): Promise<number> {
    let removed = 0;
    for (const [name, exec] of Array.from(this.executors.entries())) {
      try {
        if (predicate(exec.schema)) {
          this.executors.delete(name);
          removed++;
        }
      } catch {
        // ignore predicate errors
      }
    }
    if (removed > 0) {
      Logger.debug(`ToolRegistry: Unregistered ${removed} tool(s) via predicate.`);
    }
    return removed;
  }
}