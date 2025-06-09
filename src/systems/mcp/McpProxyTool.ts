import { IToolExecutor } from '../../core/interfaces';
import { ToolSchema, ToolResult, ExecutionContext, ARTError, ErrorCode } from '../../types';
import { Logger } from '../../utils/logger';
import { AuthManager } from '../../systems/auth/AuthManager';
import {
  McpServerConfig,
  McpToolDefinition,
  McpToolExecutionRequest,
  McpToolExecutionResponse
} from './types';

/**
 * A proxy tool that wraps an MCP server tool and implements the IToolExecutor interface.
 * This allows MCP server tools to be used seamlessly within the ART Framework.
 */
export class McpProxyTool implements IToolExecutor {
  public readonly schema: ToolSchema;
  
  private serverConfig: McpServerConfig;
  private toolDefinition: McpToolDefinition;
  private authManager?: AuthManager;

  /**
   * Creates a new MCP proxy tool.
   * @param serverConfig - Configuration for the MCP server hosting this tool
   * @param toolDefinition - The tool definition from the MCP server
   * @param authManager - Optional auth manager for securing requests
   */
  constructor(
    serverConfig: McpServerConfig,
    toolDefinition: McpToolDefinition,
    authManager?: AuthManager
  ) {
    this.serverConfig = serverConfig;
    this.toolDefinition = toolDefinition;
    this.authManager = authManager;

    // Convert MCP tool definition to ART ToolSchema
    this.schema = {
      name: `mcp_${serverConfig.id}_${toolDefinition.name}`,
      description: toolDefinition.description,
      inputSchema: toolDefinition.inputSchema,
      outputSchema: toolDefinition.outputSchema
    };

    Logger.debug(`McpProxyTool: Created proxy for tool "${toolDefinition.name}" from server "${serverConfig.name}"`);
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
      Logger.debug(`McpProxyTool: Executing tool "${this.toolDefinition.name}" on server "${this.serverConfig.name}"`);

      // Prepare the execution request
      const request: McpToolExecutionRequest = {
        toolName: this.toolDefinition.name,
        input,
        context: {
          threadId: context.threadId,
          traceId: context.traceId,
          userId: context.userId
        }
      };

      // Execute the tool on the MCP server
      const response = await this._executeOnServer(request);
      const duration = Date.now() - startTime;

      if (response.success) {
        Logger.debug(`McpProxyTool: Tool "${this.toolDefinition.name}" executed successfully in ${duration}ms`);
        
        return {
          callId: context.traceId || 'unknown',
          toolName: this.schema.name,
          status: 'success',
          output: response.output,
          metadata: {
            ...response.metadata,
            executionTime: duration,
            mcpServer: {
              id: this.serverConfig.id,
              name: this.serverConfig.name
            }
          }
        };
      } else {
        Logger.error(`McpProxyTool: Tool "${this.toolDefinition.name}" failed: ${response.error}`);
        
        return {
          callId: context.traceId || 'unknown',
          toolName: this.schema.name,
          status: 'error',
          error: response.error || 'Unknown error from MCP server',
          metadata: {
            ...response.metadata,
            executionTime: duration,
            mcpServer: {
              id: this.serverConfig.id,
              name: this.serverConfig.name
            }
          }
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error(`McpProxyTool: Failed to execute tool "${this.toolDefinition.name}": ${error.message}`);
      
      return {
        callId: context.traceId || 'unknown',
        toolName: this.schema.name,
        status: 'error',
        error: `MCP execution failed: ${error.message}`,
        metadata: {
          executionTime: duration,
          mcpServer: {
            id: this.serverConfig.id,
            name: this.serverConfig.name
          },
          originalError: error.message
        }
      };
    }
  }

  /**
   * Executes the tool request on the MCP server.
   * @private
   */
  private async _executeOnServer(request: McpToolExecutionRequest): Promise<McpToolExecutionResponse> {
    const url = `${this.serverConfig.url}/tools/${this.toolDefinition.name}/execute`;
    const timeout = this.serverConfig.timeout || 30000; // 30 second default

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.serverConfig.headers
    };

    // Add authentication headers if auth strategy is configured
    if (this.serverConfig.authStrategyId && this.authManager) {
      try {
        const authHeaders = await this.authManager.getHeaders(this.serverConfig.authStrategyId);
        Object.assign(headers, authHeaders);
        Logger.debug(`McpProxyTool: Added authentication headers for server "${this.serverConfig.name}"`);
      } catch (error: any) {
        Logger.error(`McpProxyTool: Authentication failed for server "${this.serverConfig.name}": ${error.message}`);
        throw new ARTError(
          `Failed to authenticate with MCP server: ${error.message}`,
          ErrorCode.TOOL_EXECUTION_ERROR,
          error
        );
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      Logger.debug(`McpProxyTool: Making request to ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      Logger.debug(`McpProxyTool: Received response from server "${this.serverConfig.name}"`);
      
      return responseData as McpToolExecutionResponse;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ARTError(
          `MCP server request timed out after ${timeout}ms`,
          ErrorCode.NETWORK_ERROR
        );
      }
      
      throw new ARTError(
        `Failed to communicate with MCP server: ${error.message}`,
        ErrorCode.NETWORK_ERROR,
        error instanceof Error ? error : new Error(String(error))
      );
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
    return { ...this.serverConfig };
  }

  /**
   * Gets the MCP tool definition.
   * @returns The tool definition
   */
  getToolDefinition(): McpToolDefinition {
    return { ...this.toolDefinition };
  }
} 