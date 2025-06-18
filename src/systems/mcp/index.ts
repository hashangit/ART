// src/systems/mcp/index.ts

// Core MCP 2.0 Architecture
export { McpManager } from './McpManager';
export { McpProxyTool } from './McpProxyTool';
export { ConfigManager } from './ConfigManager';
export { McpInstaller } from './McpInstaller';

// Type Definitions
export type {
  // Public config types
  ArtMcpConfig,
  McpServerConfig,
  StdioConnection,
  SseConnection,
  McpToolDefinition,
  McpResource,
  McpResourceTemplate,
  
  // Internal state types
  McpConnection,
  McpServerStatus
} from './types'; 