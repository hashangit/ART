// src/systems/tool/ToolRegistry.ts
import { ToolRegistry as IToolRegistry, IToolExecutor } from '../../core/interfaces';
import { ToolSchema } from '../../types';
import { Logger } from '../../utils/logger';

/**
 * A simple in-memory implementation of the `ToolRegistry` interface.
 * Stores tool executors in a Map, keyed by the tool's unique name.
 */
export class ToolRegistry implements IToolRegistry {
  private executors: Map<string, IToolExecutor> = new Map();

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
   * **Note:** This basic implementation ignores the `filter` parameter, specifically the `enabledForThreadId` option.
   * A more advanced implementation could integrate with the `StateManager` to filter tools based on thread configuration.
   * @param filter - Optional filter criteria (currently ignored).
   * @returns A promise resolving to an array containing the `ToolSchema` of all registered tools.
   */
  async getAvailableTools(filter?: { enabledForThreadId?: string }): Promise<ToolSchema[]> {
     if (filter?.enabledForThreadId) {
        Logger.warn('ToolRegistry: Filtering by enabledForThreadId is not implemented in the basic ToolRegistry. Returning all tools.');
        // In a real scenario, this might interact with StateManager
     }
    const schemas = Array.from(this.executors.values()).map(executor => executor.schema);
    Logger.debug(`ToolRegistry: Returning ${schemas.length} available tool schemas.`);
    return schemas;
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
}