// src/systems/mcp/types.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// --- Public, Configurable Definitions ---
export interface StdioConnection { command: string; args?: string[]; cwd?: string; env?: Record<string, string>; }
export interface SseConnection { url: string; headers?: Record<string, string>; authStrategyId?: string; }
export interface McpToolDefinition { name: string; description?: string; inputSchema: any; outputSchema?: any; }
export interface McpResource { uri: string; name: string; mimeType?: string; description?: string; }
export interface McpResourceTemplate { uriTemplate: string; name: string; description?: string; mimeType?: string; }

/**
 * The MCPCard structure. This is the format for each server entry in art_mcp_config.json.
 * It contains all information needed for discovery, installation, and connection.
 */
export type McpServerConfig = {
    id: string;
    type: 'stdio' | 'sse';
    enabled: boolean;
    displayName?: string;
    description?: string;
    connection: StdioConnection | SseConnection;
    installation?: { source: 'git' | 'npm' | 'manual'; [key: string]: any; };
    timeout?: number;
    // The server's capabilities are now part of the card itself
    tools: McpToolDefinition[];
    resources: McpResource[];
    resourceTemplates: McpResourceTemplate[];
};

/**
 * The root structure of the art_mcp_config.json file.
 */
export interface ArtMcpConfig {
    mcpServers: Record<string, McpServerConfig>; // The key is the serverId
}

// --- Internal State Management Types (Not for public config) ---
export interface McpConnection {
    server: McpServerStatus;
    client: Client;
    transport: StdioClientTransport | SSEClientTransport;
}
export interface McpServerStatus {
    id: string;
    status: 'connected' | 'disconnected' | 'error' | 'connecting';
    lastConnected?: Date;
    lastError?: string;
    toolCount: number;
}

/**
 * Configuration for MCP Manager 2.0
 */
export interface McpManagerConfig {
  /** Whether to enable MCP functionality. Defaults to false. */
  enabled: boolean;
  /** Optional endpoint URL for discovering MCP servers from Zyntopia. Defaults to Zyntopia's API. */
  discoveryEndpoint?: string;
}

/**
 * Configuration for creating an MCP client connection
 */
export interface McpClientConfig {
  /** Server configuration */
  server: McpServerConfig;
  /** Transport configuration for the connection */
  transport: {
    type: 'stdio' | 'sse' | 'http';
    // For stdio transport
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    // For SSE/HTTP transport
    url?: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
} 