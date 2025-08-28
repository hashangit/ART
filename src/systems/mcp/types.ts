// src/systems/mcp/types.ts
// --- Public, Configurable Definitions ---
export interface StreamableHttpConnection {
  url: string;
  headers?: Record<string, string>;
  authStrategyId?: string;
  /** Optional OAuth configuration for automatic PKCE setup per server */
  oauth?: {
    type: 'pkce';
    /** OAuth 2.1 Authorization Endpoint */
    authorizationEndpoint: string;
    /** OAuth 2.1 Token Endpoint */
    tokenEndpoint: string;
    /** Public client ID */
    clientId: string;
    /** Space-delimited scopes */
    scopes: string;
    /** Redirect URI that will handle the callback */
    redirectUri: string;
    /** Optional audience/resource parameter */
    resource?: string;
    /** Open login in a new tab (default true if omitted) */
    openInNewTab?: boolean;
    /** Optional BroadcastChannel name for token delivery */
    channelName?: string;
  };
}
export interface McpToolDefinition { name: string; description?: string; inputSchema: any; outputSchema?: any; }
export interface McpResource { uri: string; name: string; mimeType?: string; description?: string; }
export interface McpResourceTemplate { uriTemplate: string; name: string; description?: string; mimeType?: string; }

/**
 * The MCPCard structure. This is the format for each server entry in art_mcp_config.json.
 * It contains all information needed for discovery, installation, and connection.
 */
export type McpServerConfig = {
    id: string;
    type: 'streamable-http';
    enabled: boolean;
    displayName?: string;
    description?: string;
    connection: StreamableHttpConnection;
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
// McpClientConfig is no longer needed as the new McpClient takes a simpler config.