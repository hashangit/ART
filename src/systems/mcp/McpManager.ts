import { ToolRegistry, StateManager } from '../../core/interfaces';
import { ARTError, ErrorCode } from '../../errors';
import { Logger } from '../../utils/logger';
import { AuthManager } from '../auth/AuthManager';
import { McpProxyTool } from './McpProxyTool';
import { ConfigManager } from './ConfigManager';
import { McpServerConfig, StreamableHttpConnection } from './types';
import { McpClient, McpTransportConfig } from './McpClient';

/**
 * Manages MCP (Model Context Protocol) server connections and tool registration.
 * 
 * The McpManager is responsible for:
 * - Connecting to configured MCP servers
 * - Discovering available tools from servers
 * - Creating proxy tools that wrap MCP server tools
 * - Registering proxy tools with the ToolRegistry
 * - Managing server health and status
 * - Thread-specific tool activation/deactivation
 * 
 * This enables dynamic tool loading from external MCP servers while maintaining
 * seamless integration with the ART Framework's tool system.
 */
export class McpManager {
  private configManager: ConfigManager;
  private toolRegistry: ToolRegistry;
  private authManager?: AuthManager;
  private activeConnections: Map<string, McpClient> = new Map();

  constructor(toolRegistry: ToolRegistry, _stateManager: StateManager, authManager?: AuthManager) {
    this.configManager = new ConfigManager();
    this.toolRegistry = toolRegistry;
    this.authManager = authManager;
    Logger.info(`McpManager: Hub initialized. Will load tools from config catalog.`);
  }

  async initialize(mcpConfig?: { enabled?: boolean; discoveryEndpoint?: string }): Promise<void> {
    if (!mcpConfig?.enabled) {
      Logger.info('McpManager: MCP is disabled. Skipping initialization.');
      return;
    }

    Logger.info('McpManager: Initializing from multiple sources...');
    
    // 1. Get local config MCPCards
    const localServerConfigs = this.configManager.getConfig().mcpServers;
    Logger.info(`McpManager: Found ${Object.keys(localServerConfigs).length} servers in local config`);
    
    // 2. Discover remote MCPCards from Zyntopia API
    let discoveredServerConfigs: McpServerConfig[] = [];
    try {
      discoveredServerConfigs = await this.discoverAvailableServers(mcpConfig.discoveryEndpoint);
      Logger.info(`McpManager: Discovered ${discoveredServerConfigs.length} servers from discovery API`);
    } catch (error: any) {
      Logger.warn(`McpManager: Discovery API failed, continuing with local config only: ${error.message}`);
    }
    
    // 3. Merge all server configurations (local + discovered)
    const allServerConfigs = new Map<string, McpServerConfig>();
    
    // Add local configs first
    for (const [serverId, config] of Object.entries(localServerConfigs)) {
      allServerConfigs.set(serverId, config);
    }
    
    // Add discovered configs (with conflict resolution)
    for (const discoveredConfig of discoveredServerConfigs) {
      if (allServerConfigs.has(discoveredConfig.id)) {
        Logger.info(`McpManager: Server "${discoveredConfig.id}" exists in both local config and discovery API. Using local config.`);
      } else {
        allServerConfigs.set(discoveredConfig.id, discoveredConfig);
        Logger.info(`McpManager: Added discovered server "${discoveredConfig.id}" to available servers`);
      }
    }
    
    // 4. Register proxy tools for all enabled servers
    let registeredToolCount = 0;
    for (const [, card] of allServerConfigs) {
        if (card.enabled) {
            // Defensive check: ensure tools array exists and is iterable
            if (card.tools && Array.isArray(card.tools)) {
                for (const toolDef of card.tools) {
                    const proxyTool = new McpProxyTool(card, toolDef, this);
                    await this.toolRegistry.registerTool(proxyTool);
                    registeredToolCount++;
                }
            }
        }
    }
    
    Logger.info(`McpManager: Initialization complete. Registered ${registeredToolCount} lazy proxy tools from ${allServerConfigs.size} total servers.`);
  }

  async shutdown(): Promise<void> {
    Logger.info('McpManager: Shutting down all active connections...');
    const disconnectionPromises = Array.from(this.activeConnections.values()).map(client => client.disconnect());
    await Promise.allSettled(disconnectionPromises);
    this.activeConnections.clear();
    Logger.info('McpManager: Shutdown complete.');
  }

  public async getOrCreateConnection(serverId: string): Promise<McpClient> {
    if (this.activeConnections.has(serverId)) {
      const existingClient = this.activeConnections.get(serverId)!;
      if (existingClient.isConnected()) {
        return existingClient;
      }
      // Attempt to reconnect if disconnected
      Logger.info(`McpManager: Reconnecting to server "${serverId}"...`);
      await existingClient.connect();
      return existingClient;
    }

    Logger.info(`McpManager: No active connection for "${serverId}". Creating one on-demand...`);
    const card = this.configManager.getConfig().mcpServers[serverId];
    if (!card) {
      throw new ARTError(`Configuration for server "${serverId}" not found.`, ErrorCode.SERVER_NOT_FOUND);
    }

    if (card.type !== 'streamable-http') {
      throw new ARTError(`Unsupported transport type "${card.type}" for server "${serverId}". Only 'streamable-http' is supported in the browser.`, ErrorCode.UNSUPPORTED_TRANSPORT);
    }

    const conn = card.connection as StreamableHttpConnection;
    const transportConfig: McpTransportConfig = {
      type: 'streamable-http',
      url: conn.url,
      headers: conn.headers,
      authStrategyId: conn.authStrategyId,
      timeout: card.timeout,
    };

    const client = new McpClient(transportConfig, this.authManager);

    client.on('disconnected', () => {
      Logger.warn(`McpManager: Connection for server "${serverId}" closed. It will be re-established on next use.`);
      this.activeConnections.delete(serverId);
    });

    await client.connect();
    this.activeConnections.set(serverId, client);
    Logger.info(`McpManager: On-demand connection for "${serverId}" established successfully.`);
    return client;
  }

  // --- Discovery & Installation (Future Implementation) ---

  /**
   * Searches a discovery service for available MCP servers.
   * @param discoveryEndpoint The URL of the discovery service.
   * @returns A promise resolving to an array of MCPCards.
   */
  async discoverAvailableServers(discoveryEndpoint?: string): Promise<McpServerConfig[]> {
    const url = discoveryEndpoint || 'http://localhost:4200/api/services'; // Default Zyntopia endpoint
    Logger.info(`McpManager: Discovering servers from ${url}...`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ART-Framework-MCP/2.0'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Discovery API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter for MCP services and convert to MCPCards
      const mcpServices = Array.isArray(data) ? data : (data.services || []);
      const mcpCards: McpServerConfig[] = mcpServices
        .filter((service: any) => service.service_type === 'MCP_SERVICE')
        .map((service: any) => this.convertServiceToMcpCard(service))
        .filter((card: McpServerConfig | null) => card !== null) as McpServerConfig[];
      
      Logger.info(`McpManager: Successfully discovered ${mcpCards.length} MCP servers from discovery API`);
      return mcpCards;
      
    } catch (error: any) {
      Logger.error(`McpManager: Failed to discover servers from ${url}: ${error.message}`);
      throw new ARTError(`Discovery API failed: ${error.message}`, ErrorCode.NETWORK_ERROR);
    }
  }
  
  /**
   * Converts a Zyntopia service entry to an MCPCard.
   */
  private convertServiceToMcpCard(service: any): McpServerConfig | null {
    try {
      // Basic validation
      if (!service.id || !service.name || !service.connection) {
        Logger.warn(`McpManager: Skipping invalid service entry: missing required fields`);
        return null;
      }
      
      const mcpCard: McpServerConfig = {
        id: service.id,
        type: service.connection.type === 'sse' ? 'streamable-http' : service.connection.type,
        enabled: service.enabled !== false, // Default to enabled unless explicitly disabled
        displayName: service.name,
        description: service.description || `MCP service: ${service.name}`,
        connection: service.connection,
        timeout: service.timeout || 10000,
        tools: service.tools || [],
        resources: service.resources || [],
        resourceTemplates: service.resourceTemplates || [],
        installation: service.installation
      };
      
      Logger.debug(`McpManager: Converted service "${service.id}" to MCPCard`);
      return mcpCard;
      
    } catch (error: any) {
      Logger.warn(`McpManager: Failed to convert service to MCPCard: ${error.message}`);
      return null;
    }
  }

  // The generateAndInstallCard method is removed as it is based on the stdio transport,
  // which is not supported in a browser-only environment.
}