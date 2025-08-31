/**
 * @module systems/mcp
 * @description This module exports the core components of the MCP 2.0 architecture,
 * including the McpManager, McpProxyTool, and ConfigManager. It also exports
 * various type definitions related to MCP configuration and state.
 * Note: McpInstaller is intentionally not exported as it is not applicable
 * in a browser-only environment.
 */

// Core MCP 2.0 Architecture
export { McpManager } from './McpManager';
export { McpProxyTool } from './McpProxyTool';
export { ConfigManager } from './ConfigManager';
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