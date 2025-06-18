import { ToolRegistry, StateManager } from '../../core/interfaces';
import { ARTError, ErrorCode } from '../../errors';
import { Logger } from '../../utils/logger';
import { AuthManager } from '../auth/AuthManager';
import { McpProxyTool } from './McpProxyTool';
import { ConfigManager } from './ConfigManager';
import { McpServerConfig, StdioConnection, SseConnection } from './types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import ReconnectingEventSource from 'reconnecting-eventsource';

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
  private activeConnections: Map<string, Client> = new Map();

  constructor(toolRegistry: ToolRegistry, _stateManager: StateManager, authManager?: AuthManager) {
    this.configManager = new ConfigManager();
    this.toolRegistry = toolRegistry;
    this.authManager = authManager;
    Logger.info(`McpManager: Hub initialized. Will load tools from config catalog.`);
  }

  async initialize(discoveryEndpoint?: string): Promise<void> {
    Logger.info('McpManager: Initializing from multiple sources...');
    
    // 1. Get local config MCPCards
    const localServerConfigs = this.configManager.getConfig().mcpServers;
    Logger.info(`McpManager: Found ${Object.keys(localServerConfigs).length} servers in local config`);
    
    // 2. Discover remote MCPCards from Zyntopia API
    let discoveredServerConfigs: McpServerConfig[] = [];
    try {
      discoveredServerConfigs = await this.discoverAvailableServers(discoveryEndpoint);
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
    const disconnectionPromises = Array.from(this.activeConnections.values()).map(client => client.close());
    await Promise.allSettled(disconnectionPromises);
    this.activeConnections.clear();
    Logger.info('McpManager: Shutdown complete.');
  }

  public async getOrCreateConnection(serverId: string): Promise<Client> {
    if (this.activeConnections.has(serverId)) {
        return this.activeConnections.get(serverId)!;
    }

    Logger.info(`McpManager: No active connection for "${serverId}". Creating one on-demand...`);
    const card = this.configManager.getConfig().mcpServers[serverId];
    if (!card) {
        throw new ARTError(`Configuration for server "${serverId}" not found.`, ErrorCode.SERVER_NOT_FOUND);
    }

    let transport: StdioClientTransport | SSEClientTransport;
    switch (card.type) {
        case 'stdio': {
            const conn = card.connection as StdioConnection;
            const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) as Record<string, string>;
            transport = new StdioClientTransport({ command: conn.command, args: conn.args, cwd: conn.cwd, env: { ...cleanEnv, ...conn.env } });
            break;
        }
        case 'sse': {
            const conn = card.connection as SseConnection;
            const headers = { ...conn.headers };
            if (this.authManager && conn.authStrategyId) {
                Object.assign(headers, await this.authManager.getHeaders(conn.authStrategyId));
            }
            global.EventSource = ReconnectingEventSource as any;
            transport = new SSEClientTransport(new URL(conn.url), { requestInit: { headers } });
            break;
        }
        default:
            throw new ARTError(`Unsupported transport type for server "${serverId}"`, ErrorCode.UNSUPPORTED_TRANSPORT);
    }

    const client = new Client({ name: 'ART Framework', version: '0.1.0' });
    
    transport.onclose = () => {
        Logger.warn(`McpManager: Connection for server "${serverId}" closed. It will be re-established on next use.`);
        this.activeConnections.delete(serverId);
    };
    
    await client.connect(transport);
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
        type: service.connection.type || 'stdio',
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

  /**
   * Generates an MCPCard for a local server and installs it into the config.
   * @param serverId A unique ID for the new server.
   * @param connection The stdio connection details.
   */
  async generateAndInstallCard(serverId: string, connection: StdioConnection): Promise<void> {
    Logger.info(`McpManager: Generating MCPCard for new local server "${serverId}"...`);
    
    try {
      // 1. Create a temporary server config for discovery
      const tempConfig: McpServerConfig = {
        id: serverId,
        type: 'stdio',
        enabled: true,
        displayName: serverId,
        description: `Auto-discovered MCP server: ${serverId}`,
        connection,
        timeout: 30000,
        tools: [],
        resources: [],
        resourceTemplates: []
      };

      // 2. Discover tools and resources from the server
      let client: Client | null = null;
      let transport: StdioClientTransport | null = null;

      try {
        const cleanEnv = Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>;

        transport = new StdioClientTransport({
          command: connection.command,
          args: connection.args,
          cwd: connection.cwd,
          env: { ...cleanEnv, ...connection.env }
        });

        client = new Client({
          name: 'ART Framework Discovery',
          version: '0.1.0'
        });

        await client.connect(transport);
        Logger.info(`McpManager: Connected to server "${serverId}" for discovery`);

        // 3. Discover tools
        const toolsResult = await client.listTools();
        tempConfig.tools = toolsResult.tools.map(tool => ({
          name: tool.name,
          description: tool.description || `Tool: ${tool.name}`,
          inputSchema: tool.inputSchema
        }));

        // 4. Discover resources  
        try {
          const resourcesResult = await client.listResources();
          tempConfig.resources = resourcesResult.resources.map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType
          }));
        } catch (error) {
          Logger.warn(`McpManager: Could not discover resources for "${serverId}": ${error}`);
          // Continue without resources
        }

        Logger.info(`McpManager: Discovered ${tempConfig.tools.length} tools and ${tempConfig.resources.length} resources for "${serverId}"`);

      } finally {
        // 5. Clean up temporary connection
        if (client) {
          try {
            await client.close();
          } catch (error) {
            Logger.warn(`McpManager: Error closing discovery connection: ${error}`);
          }
        }
      }

      // 6. Save the complete MCPCard to config
      this.configManager.setServerConfig(serverId, tempConfig);
      Logger.info(`McpManager: Saved MCPCard for "${serverId}" with ${tempConfig.tools.length} tools`);

      // 7. Re-initialize to load the new tool proxies
      await this.initialize();
      Logger.info(`McpManager: Re-initialized with new server "${serverId}"`);

    } catch (error: any) {
      Logger.error(`McpManager: Failed to generate and install card for "${serverId}": ${error.message}`);
             throw new ARTError(`Failed to install server "${serverId}": ${error.message}`, ErrorCode.EXTERNAL_SERVICE_ERROR);
    }
  }
} 