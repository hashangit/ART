// src/systems/tool/ToolRegistry.ts
import { ToolRegistry as IToolRegistry, IToolExecutor } from '../../core/interfaces';
import { ToolSchema } from '../../types';
import { Logger } from '../../utils/logger';

export class ToolRegistry implements IToolRegistry {
  private executors: Map<string, IToolExecutor> = new Map();

  /**
   * Registers a tool executor. Overwrites if a tool with the same name exists.
   * @param executor The tool executor instance.
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
   * Retrieves a tool executor by its name.
   * @param toolName The unique name of the tool.
   * @returns The executor instance or undefined if not found.
   */
  async getToolExecutor(toolName: string): Promise<IToolExecutor | undefined> {
    const executor = this.executors.get(toolName);
    if (!executor) {
        Logger.debug(`ToolRegistry: Tool "${toolName}" not found.`);
    }
    return executor;
  }

  /**
   * Retrieves the schemas of all registered tools.
   * Note: The filter parameter is ignored in this basic in-memory implementation.
   *       A more complex registry might use it (e.g., to check against StateManager).
   * @param filter Optional criteria (ignored in this implementation).
   * @returns An array of tool schemas.
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
   * Clears all registered tools. Useful for testing.
   */
  async clearAllTools(): Promise<void> {
      this.executors.clear();
      Logger.debug('ToolRegistry: Cleared all registered tools.');
  }
}