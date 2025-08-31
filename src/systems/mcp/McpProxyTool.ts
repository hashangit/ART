import { IToolExecutor } from '../../core/interfaces';
import { ToolSchema, ToolResult, ExecutionContext } from '../../types';
import { Logger } from '../../utils/logger';
import { McpManager } from './McpManager';
import { McpServerConfig, McpToolDefinition } from './types';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * A proxy tool that wraps an MCP server tool and implements the IToolExecutor interface.
 * This allows MCP server tools to be used seamlessly within the ART Framework.
 */
export class McpProxyTool implements IToolExecutor {
  public readonly schema: ToolSchema;
  
  private card: McpServerConfig;
  private toolDefinition: McpToolDefinition;
  private mcpManager: McpManager;

  /**
   * Creates a new MCP proxy tool.
   * @param card - Configuration for the MCP server hosting this tool
   * @param toolDefinition - The tool definition from the MCP server
   * @param mcpManager - The MCP manager for managing connections
   */
  constructor(card: McpServerConfig, toolDefinition: McpToolDefinition, mcpManager: McpManager) {
    this.card = card;
    this.toolDefinition = toolDefinition;
    this.mcpManager = mcpManager;

    // Convert MCP tool definition to ART ToolSchema
    this.schema = {
      name: `mcp_${card.id}_${toolDefinition.name}`,
      description: toolDefinition.description || `Tool ${toolDefinition.name} from ${card.displayName || card.id}`,
      inputSchema: toolDefinition.inputSchema,
      outputSchema: toolDefinition.outputSchema
    };

    Logger.debug(`McpProxyTool: Created proxy for tool "${toolDefinition.name}" from server "${card.displayName}"`);
  }

  /**
   * Executes the tool by making a request to the MCP server.
   * @param input - Validated input arguments for the tool
   * @param context - Execution context containing threadId, traceId, etc.
   * @returns Promise resolving to the tool result
   */
  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      Logger.debug(`McpProxyTool: Execution requested for "${this.schema.name}". Getting or creating connection...`);
      const client = await this.mcpManager.getOrCreateConnection(this.card.id);

      Logger.debug(`McpProxyTool: Connection ready. Executing tool "${this.toolDefinition.name}" on server "${this.card.displayName}"`);
      const response = await client.callTool(this.toolDefinition.name, input);
      
      const duration = Date.now() - startTime;
      
      // Adapt the response to the ToolResult format
      // This is a generic adaptation, specific tools might require more tailored logic
      // based on the shape of their response.
      const output = typeof response === 'object' && response !== null ? response : { value: response };

      return {
        callId: context.traceId || 'unknown',
        toolName: this.schema.name,
        status: 'success',
        output: [output], // Assuming the output should be wrapped in an array
        metadata: { 
          executionTime: duration, 
          mcpServer: { id: this.card.id, name: this.card.displayName },
          rawResponse: response 
        }
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error(`McpProxyTool: Failed to execute tool "${this.toolDefinition.name}": ${error.message}`);
      return {
        callId: context.traceId || 'unknown',
        toolName: this.schema.name,
        status: 'error',
        error: `MCP execution failed: ${error.message}`,
        metadata: { executionTime: duration, mcpServer: { id: this.card.id, name: this.card.displayName }, originalError: error instanceof Error ? error.stack : String(error) }
      };
    }
  }

  /**
   * Gets the original tool name from the MCP server.
   * @returns The original tool name
   */
  getOriginalToolName(): string {
    return this.toolDefinition.name;
  }

  /**
   * Gets the MCP server configuration.
   * @returns The server configuration
   */
  getServerConfig(): McpServerConfig {
    return { ...this.card };
  }

  /**
   * Gets the MCP tool definition.
   * @returns The tool definition
   */
  getToolDefinition(): McpToolDefinition {
    return { ...this.toolDefinition };
  }
} 