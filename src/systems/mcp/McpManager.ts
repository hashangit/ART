import { ToolRegistry, StateManager } from '@/core/interfaces';
import { ARTError, ErrorCode } from '@/errors';
import { Logger } from '@/utils/logger';
import { AuthManager } from '../auth/AuthManager';
import { McpProxyTool } from './McpProxyTool';
import { ConfigManager } from './ConfigManager';
import { McpServerConfig, StreamableHttpConnection } from './types';
import { McpClientController } from './McpClient';
import { hasInstall, install, getAllowedInfo, requestHosts, getInstallUrl } from 'art-mcp-permission-manager'

/**
 * Manages MCP (Model Context Protocol) server connections and tool registration.
 *
 * @remarks
 * The `McpManager` is responsible for:
 * - Connecting to configured MCP servers.
 * - Discovering available tools from servers.
 * - Creating proxy tools that wrap MCP server tools.
 * - Registering proxy tools with the {@link ToolRegistry}.
 * - Managing server health and status.
 * - Handling thread-specific tool activation/deactivation.
 *
 * This enables dynamic tool loading from external MCP servers while maintaining
 * seamless integration with the ART Framework's tool system.
 *
 * @see {@link McpProxyTool} for the tool wrapper implementation.
 * @see {@link McpClientController} for the underlying client implementation.
 *
 * @class McpManager
 */
export class McpManager {
  private configManager: ConfigManager;
  private toolRegistry: ToolRegistry;
  private authManager?: AuthManager;
  private activeConnections: Map<string, McpClientController> = new Map();

  /**
   * Creates an instance of McpManager.
   *
   * @param toolRegistry The tool registry to register proxy tools with.
   * @param _stateManager The state manager (not currently used).
   * @param authManager The authentication manager.
   */
  constructor(toolRegistry: ToolRegistry, _stateManager: StateManager, authManager?: AuthManager) {
    this.configManager = new ConfigManager();
    this.toolRegistry = toolRegistry;
    this.authManager = authManager;
    Logger.info(`McpManager: Hub initialized. Will load tools from config catalog.`);
  }

  /**
   * Initializes the McpManager, discovers and registers tools from configured servers.
   *
   * @param mcpConfig The MCP configuration.
   * @param [mcpConfig.enabled=true] Whether MCP is enabled.
   * @param mcpConfig.discoveryEndpoint The endpoint for discovering MCP servers.
   * @returns A promise that resolves when initialization is complete.
   */
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
    
    // 4. Register proxy tools based on current card hints only (non-blocking).
    // Live discovery and PKCE prompting can happen later during explicit install or first use.
    let registeredToolCount = 0;
    for (const [, card] of allServerConfigs) {
      if (!card.enabled) continue;
      const toolsToRegister = card.tools || [];
      if (Array.isArray(toolsToRegister)) {
        for (const toolDef of toolsToRegister) {
          const proxyTool = new McpProxyTool(card, toolDef as any, this);
          await this.toolRegistry.registerTool(proxyTool);
          registeredToolCount++;
        }
      }
    }

    Logger.info(`McpManager: Initialization complete. Registered ${registeredToolCount} proxy tools from ${allServerConfigs.size} total servers.`);
  }

  /**
   * Shuts down all active MCP connections.
   *
   * @returns A promise that resolves when all connections are shut down.
   */
  async shutdown(): Promise<void> {
    Logger.info('McpManager: Shutting down all active connections...');
    const disconnectionPromises = Array.from(this.activeConnections.values()).map(client => client.logout());
    await Promise.allSettled(disconnectionPromises);
    this.activeConnections.clear();
    Logger.info('McpManager: Shutdown complete.');
  }

  /**
   * Gets an existing connection or creates a new one for a given server ID.
   *
   * @param serverId The ID of the server to connect to.
   * @returns A promise that resolves to the MCP client controller.
   */
  public async getOrCreateConnection(serverId: string): Promise<McpClientController> {
    if (this.activeConnections.has(serverId)) {
      const existingClient = this.activeConnections.get(serverId)!;
      if (existingClient.isAuthenticated()) {
        await existingClient.ensureConnected();
        return existingClient;
      }
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

    await this.ensureCorsAccess(conn.url);

    const scopes = conn.oauth?.scopes;
    const client = McpClientController.create(conn.url, Array.isArray(scopes) ? scopes : (scopes ? [scopes] : undefined));

    const handled = await client.maybeHandleCallback();
    if(handled) {
      Logger.info(`McpManager: OAuth callback for server "${serverId}" handled successfully.`);
    }

    client.loadExistingSession();

    if(!client.isAuthenticated()) {
        await client.startOAuth();
        // The above call will redirect, so the code below might not be reached in that flow.
        // If it is (e.g. pop-up), we need to wait for authentication.
        await this.waitForAuth(client, 180000); // Wait for up to 3 minutes
    }
    
    await client.connect();

    this.activeConnections.set(serverId, client);
    Logger.info(`McpManager: On-demand connection for "${serverId}" established successfully.`);
    return client;
  }
  
  /**
   * Ensures that the application has CORS access to the target URL.
   *
   * @private
   * @param targetUrl The URL to check for CORS access.
   * @returns A promise that resolves when CORS access is confirmed or granted.
   */
  private async ensureCorsAccess(targetUrl: string): Promise<void> {
    if (!hasInstall()) {
        const opened = install({ browser: 'auto' });
        if (!opened) {
            const url = getInstallUrl();
            // In a real app, you'd show this in a dialog, not an alert
            alert('ART MCP requires a companion browser extension for CORS. Please install it: ' + url);
            throw new ARTError('Companion extension not installed.', ErrorCode.CORS_EXTENSION_REQUIRED);
        }
        throw new ARTError('Companion extension installation started. Please complete it and retry.', ErrorCode.CORS_EXTENSION_REQUIRED);
    }

    const { hostname } = new URL(targetUrl);
    const info = await getAllowedInfo();

    if (!info.enabled || (info.type === 'specific' && !info.hosts?.includes(hostname))) {
        const res = await requestHosts({ hosts: [hostname] });
        if (res !== 'accept') {
            throw new ARTError(`User did not grant permission for ${hostname}.`, ErrorCode.CORS_PERMISSION_REQUIRED);
        }
    }
  }

  // --- Discovery & Installation (Future Implementation) ---

  /**
   * Searches a discovery service for available MCP servers.
   *
   * @param [discoveryEndpoint] The URL of the discovery service.
   * @returns A promise resolving to an array of McpServerConfig.
   */
  async discoverAvailableServers(discoveryEndpoint?: string): Promise<McpServerConfig[]> {
    const url = discoveryEndpoint || 'http://localhost:4200/api/services'; // Default Zyntopia endpoint
    Logger.info(`McpManager: Discovering servers from ${url}...`);
    
    try {
      await this.ensureCorsAccess(url);
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
   * Converts a Zyntopia service entry to an McpServerConfig.
   *
   * @private
   * @param service The service entry to convert.
   * @returns The converted McpServerConfig or null if conversion fails.
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

  /**
   * Installs a server by persisting its config, discovering tools via MCP, and
   * registering proxy tools. Returns the finalized config with accurate tools.
   *
   * @param server The server configuration to install.
   * @returns A promise that resolves to the finalized server configuration.
   */
  public async installServer(server: McpServerConfig): Promise<McpServerConfig> {
    // Save initial config
    this.configManager.setServerConfig(server.id, server);
    try {
        const conn = server.connection as StreamableHttpConnection;
        await this.ensureCorsAccess(conn.url);

        let client: McpClientController;
        try {
            client = await this.getOrCreateConnection(server.id);
        } catch (e: any) {
            // This might happen if startOAuth redirects. The user will need to try again.
            Logger.warn(`McpManager: Could not connect during install for "${server.id}": ${e?.message || e}. The user may need to complete authentication and retry.`);
            // We still save the server config, just without the live tools.
            return server;
        }

        const liveTools = await client.listTools();
        const normalized = (liveTools || []).map(t => ({ name: t.name, description: t.description } as any));
        const updated = { ...server, tools: normalized } as McpServerConfig;
        
        this.configManager.setServerConfig(server.id, updated);
        
        for (const t of normalized) {
            await this.toolRegistry.registerTool(new McpProxyTool(updated, t as any, this));
        }
        
        Logger.info(`McpManager: Installed server "${server.id}" with ${normalized.length} discovered tool(s).`);
        return updated;

    } catch (e: any) {
        Logger.warn(`McpManager: Could not complete live discovery during install for "${server.id}": ${e?.message || e}. Falling back to provided tools.`);
        const fallback = server.tools || [];
        for (const t of fallback) {
            await this.toolRegistry.registerTool(new McpProxyTool(server, t as any, this));
        }
        return server;
    }
  }

  /**
   * Waits for the client to be authenticated.
   *
   * @private
   * @param client The MCP client controller.
   * @param timeoutMs The timeout in milliseconds.
   * @returns A promise that resolves when the client is authenticated.
   * @throws {ARTError} If the authentication window times out.
   */
  private async waitForAuth(client: McpClientController, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (client.isAuthenticated()) {
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new ARTError('Authentication window timed out.', ErrorCode.TIMEOUT);
  }

  /**
   * Uninstalls a server: disconnects, removes registered proxy tools, and deletes config.
   *
   * @param serverId The ID of the server to uninstall.
   * @returns A promise that resolves when the server is uninstalled.
   */
  public async uninstallServer(serverId: string): Promise<void> {
    try {
      // Unregister tools by name prefix
      const prefix = `mcp_${serverId}_`;
      if ((this.toolRegistry as any).unregisterTools) {
        await (this.toolRegistry as any).unregisterTools((schema: any) => typeof schema?.name === 'string' && schema.name.startsWith(prefix));
      }

      // Disconnect
      const client = this.activeConnections.get(serverId);
      if (client) {
        await client.logout();
        this.activeConnections.delete(serverId);
      }

      // Remove config
      this.configManager.removeServerConfig(serverId);
      Logger.info(`McpManager: Server "${serverId}" uninstalled.`);
    } catch (e: any) {
      Logger.warn(`McpManager: Uninstall encountered issues for "${serverId}": ${e?.message || e}`);
      this.configManager.removeServerConfig(serverId);
    }
  }
}