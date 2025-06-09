/**
 * Configuration for connecting to an MCP server
 */
export interface McpServerConfig {
  /** Unique identifier for this MCP server */
  id: string;
  /** Human-readable name for the server */
  name: string;
  /** URL endpoint for the MCP server */
  url: string;
  /** Authentication strategy ID to use for this server */
  authStrategyId?: string;
  /** Additional headers to send with requests */
  headers?: Record<string, string>;
  /** Timeout for connections (in milliseconds) */
  timeout?: number;
  /** Whether this server is currently enabled */
  enabled: boolean;
  /** Custom metadata for this server */
  metadata?: Record<string, any>;
}

/**
 * Response from MCP server tool discovery
 */
export interface McpToolDiscoveryResponse {
  /** Array of tools available on this server */
  tools: McpToolDefinition[];
  /** Server metadata */
  server: {
    name: string;
    version: string;
    capabilities?: string[];
  };
}

/**
 * Definition of a tool from an MCP server
 */
export interface McpToolDefinition {
  /** Tool name (must be unique) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Input schema (JSON Schema) */
  inputSchema: any;
  /** Output schema (JSON Schema) */
  outputSchema?: any;
  /** Additional metadata about the tool */
  metadata?: Record<string, any>;
}

/**
 * Request to execute a tool on an MCP server
 */
export interface McpToolExecutionRequest {
  /** Name of the tool to execute */
  toolName: string;
  /** Input arguments for the tool */
  input: any;
  /** Execution context */
  context: {
    threadId: string;
    traceId?: string;
    userId?: string;
  };
}

/**
 * Response from MCP server tool execution
 */
export interface McpToolExecutionResponse {
  /** Whether the execution was successful */
  success: boolean;
  /** Tool output data (if successful) */
  output?: any;
  /** Error message (if unsuccessful) */
  error?: string;
  /** Additional metadata about the execution */
  metadata?: Record<string, any>;
}

/**
 * Status of an MCP server connection
 */
export interface McpServerStatus {
  /** Server ID */
  id: string;
  /** Connection status */
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  /** Last successful connection timestamp */
  lastConnected?: Date;
  /** Last error message if status is 'error' */
  lastError?: string;
  /** Number of available tools */
  toolCount: number;
  /** Health check response time (in ms) */
  responseTime?: number;
}

/**
 * Configuration for MCP Manager
 */
export interface McpManagerConfig {
  /** List of MCP servers to connect to */
  servers: McpServerConfig[];
  /** Default timeout for all operations (in milliseconds) */
  defaultTimeout: number;
  /** Whether to automatically retry failed connections */
  autoRetry: boolean;
  /** Retry interval in milliseconds */
  retryInterval: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Whether to automatically refresh tool discovery */
  autoRefresh: boolean;
  /** Tool discovery refresh interval in milliseconds */
  refreshInterval: number;
} 