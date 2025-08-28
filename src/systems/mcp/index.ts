// src/systems/mcp/index.ts

// Core MCP 2.0 Architecture
export { McpManager } from './McpManager';
export { McpProxyTool } from './McpProxyTool';
export { ConfigManager } from './ConfigManager';
export { CORSAccessManager } from './web/CORSAccessManager';
// McpInstaller is removed as it is not applicable in a browser-only environment.

// Type Definitions
export type {
  // Public config types
  ArtMcpConfig,
  McpServerConfig,
  StreamableHttpConnection,
  McpToolDefinition,
  McpResource,
  McpResourceTemplate,
  
  // Internal state types
  McpServerStatus
} from './types';