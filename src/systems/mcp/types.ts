/**
 * @module systems/mcp/types
 * @description This module defines the public and internal types used for configuring
 * and managing the MCP (Model-Connector Protocol) system within the ART framework.
 * These types are essential for defining server configurations, tool definitions,
 * and managing the internal state of MCP connections.
 */

/**
 * @interface StreamableHttpConnection
 * @description Defines the connection details for a streamable HTTP-based MCP server.
 * This is the primary transport mechanism for browser-based MCP communication.
 */
export interface StreamableHttpConnection {
  /** The base URL of the MCP server. */
  url: string;
  /** Optional headers to include in every request to the server. */
  headers?: Record<string, string>;
  /** The ID of an authentication strategy to use for this connection. */
  authStrategyId?: string;
  /** 
   * Optional OAuth configuration for automatic PKCE setup per server.
   * This enables secure, per-server authentication without manual token handling.
   */
  oauth?: {
    /** The type of OAuth flow, currently supporting 'pkce'. */
    type: 'pkce';
    /** The OAuth 2.1 Authorization Endpoint URL. */
    authorizationEndpoint: string;
    /** The OAuth 2.1 Token Endpoint URL. */
    tokenEndpoint: string;
    /** The public client ID for the OAuth application. */
    clientId: string;
    /** A space-delimited string of OAuth scopes to request. */
    scopes: string;
    /** The redirect URI that will handle the OAuth callback. */
    redirectUri: string;
    /** Optional 'resource' parameter for OAuth 2.1, often used as an audience identifier. */
    resource?: string;
    /** 
     * Determines whether to open the login page in a new tab. 
     * Defaults to true if omitted.
     */
    openInNewTab?: boolean;
    /** 
     * An optional BroadcastChannel name for delivering tokens, useful in multi-window scenarios.
     */
    channelName?: string;
  };
}

/**
 * @interface McpToolDefinition
 * @description Defines the schema for a tool provided by an MCP server.
 */
export interface McpToolDefinition {
  /** The name of the tool. */
  name: string;
  /** A description of what the tool does. */
  description?: string;
  /** The JSON schema for the tool's input. */
  inputSchema: any;
  /** The JSON schema for the tool's output. */
  outputSchema?: any;
}

/**
 * @interface McpResource
 * @description Defines a static resource provided by an MCP server.
 */
export interface McpResource {
  /** The URI of the resource. */
  uri: string;
  /** The name of the resource. */
  name: string;
  /** The MIME type of the resource. */
  mimeType?: string;
  /** A description of the resource. */
  description?: string;
}

/**
 * @interface McpResourceTemplate
 * @description Defines a template for a resource provided by an MCP server.
 */
export interface McpResourceTemplate {
  /** The URI template for the resource. */
  uriTemplate: string;
  /** The name of the resource template. */
  name: string;
  /** A description of the resource template. */
  description?: string;
  /** The MIME type of the resource. */
  mimeType?: string;
}

/**
 * @typedef McpServerConfig
 * @description Represents the configuration for a single MCP server.
 * This is the format for each server entry in the `art_mcp_config.json` file.
 * It contains all the necessary information for discovering, installing, and connecting to an MCP server.
 */
export type McpServerConfig = {
    /** A unique identifier for the server. */
    id: string;
    /** The transport type for the server, currently only 'streamable-http' is supported. */
    type: 'streamable-http';
    /** Whether the server is enabled and should be connected to. */
    enabled: boolean;
    /** A user-friendly name for the server. */
    displayName?: string;
    /** A description of the server and its capabilities. */
    description?: string;
    /** The connection details for the server. */
    connection: StreamableHttpConnection;
    /** Information about how the server was installed (e.g., 'git', 'npm', 'manual'). */
    installation?: { source: 'git' | 'npm' | 'manual'; [key: string]: any; };
    /** The timeout in milliseconds for requests to the server. */
    timeout?: number;
    /** The tools provided by the server. */
    tools: McpToolDefinition[];
    /** The static resources provided by the server. */
    resources: McpResource[];
    /** The resource templates provided by the server. */
    resourceTemplates: McpResourceTemplate[];
};

/**
 * @interface ArtMcpConfig
 * @description Defines the root structure of the `art_mcp_config.json` file.
 */
export interface ArtMcpConfig {
    /** A record of MCP server configurations, where the key is the server ID. */
    mcpServers: Record<string, McpServerConfig>;
}

/**
 * @interface McpServerStatus
 * @description Represents the internal status of an MCP server connection.
 * This is not part of the public configuration.
 */
export interface McpServerStatus {
    /** The unique identifier for the server. */
    id: string;
    /** The current connection status of the server. */
    status: 'connected' | 'disconnected' | 'error' | 'connecting';
    /** The timestamp of the last successful connection. */
    lastConnected?: Date;
    /** The last error message received from the server. */
    lastError?: string;
    /** The number of tools registered from this server. */
    toolCount: number;
}

/**
 * @interface McpManagerConfig
 * @description Defines the configuration for the McpManager.
 */
export interface McpManagerConfig {
  /** Whether to enable MCP functionality. Defaults to false. */
  enabled: boolean;
  /** 
   * An optional endpoint URL for discovering MCP servers.
   * Defaults to the Zyntopia API if not provided.
   */
  discoveryEndpoint?: string;
}

// McpClientConfig is no longer needed as the new McpClient takes a simpler config.