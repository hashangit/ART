import { ToolRegistry, StateManager } from '../../core/interfaces';
import { ARTError, ErrorCode } from '../../errors';
import { Logger } from '../../utils/logger';
import { AuthManager } from '../../systems/auth/AuthManager';
import { McpProxyTool } from './McpProxyTool';
import {
  McpManagerConfig,
  McpServerConfig,
  McpServerStatus,
  McpToolDiscoveryResponse,
  McpToolDefinition
} from './types';

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
  private config: McpManagerConfig;
  private toolRegistry: ToolRegistry;
  private stateManager: StateManager;
  private authManager?: AuthManager;
  
  // Internal state
  private serverStatuses: Map<string, McpServerStatus> = new Map();
  private discoveredTools: Map<string, McpToolDefinition[]> = new Map();
  private registeredProxyTools: Map<string, McpProxyTool> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Creates a new McpManager instance.
   * @param config - Configuration for MCP server connections and behavior
   * @param toolRegistry - The tool registry to register discovered tools with
   * @param stateManager - State manager for thread-specific tool management
   * @param authManager - Optional auth manager for secure server connections
   */
  constructor(
    config: McpManagerConfig,
    toolRegistry: ToolRegistry,
    stateManager: StateManager,
    authManager?: AuthManager
  ) {
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.stateManager = stateManager;
    this.authManager = authManager;

    Logger.info(`McpManager: Initialized with ${config.servers.length} configured servers`);
  }

  /**
   * Initializes the MCP Manager by connecting to all configured servers
   * and discovering their available tools.
   */
  async initialize(): Promise<void> {
    Logger.info('McpManager: Starting initialization...');

    // Initialize server statuses
    for (const serverConfig of this.config.servers) {
      this.serverStatuses.set(serverConfig.id, {
        id: serverConfig.id,
        status: 'disconnected',
        toolCount: 0
      });
    }

    // Connect to enabled servers
    const enabledServers = this.config.servers.filter(server => server.enabled);
    Logger.info(`McpManager: Connecting to ${enabledServers.length} enabled servers...`);

    await Promise.allSettled(
      enabledServers.map(server => this._connectToServer(server))
    );

    // Set up auto-refresh if enabled
    if (this.config.autoRefresh) {
      this._setupAutoRefresh();
    }

    Logger.info('McpManager: Initialization complete');
  }

  /**
   * Shuts down the MCP Manager, cleaning up connections and intervals.
   */
  async shutdown(): Promise<void> {
    Logger.info('McpManager: Shutting down...');

    // Clear all intervals
    for (const interval of this.refreshIntervals.values()) {
      clearInterval(interval);
    }
    this.refreshIntervals.clear();

    // Clear all retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();

    Logger.info('McpManager: Shutdown complete');
  }

  /**
   * Connects to a specific MCP server and discovers its tools.
   * @param serverConfig - Configuration for the server to connect to
   */
  async connectToServer(serverConfig: McpServerConfig): Promise<void> {
    await this._connectToServer(serverConfig);
  }

  /**
   * Disconnects from a specific MCP server and unregisters its tools.
   * @param serverId - ID of the server to disconnect from
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    Logger.info(`McpManager: Disconnecting from server "${serverId}"`);

    // Update status
    const status = this.serverStatuses.get(serverId);
    if (status) {
      status.status = 'disconnected';
      status.toolCount = 0;
    }

    // Unregister tools from this server
    await this._unregisterServerTools(serverId);

    // Clear refresh interval
    const interval = this.refreshIntervals.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(serverId);
    }

    // Clear retry timeout
    const timeout = this.retryTimeouts.get(serverId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(serverId);
    }

    Logger.info(`McpManager: Disconnected from server "${serverId}"`);
  }

  /**
   * Refreshes tool discovery for all connected servers.
   */
  async refreshAllServers(): Promise<void> {
    Logger.info('McpManager: Refreshing all servers...');

    const connectedServers = this.config.servers.filter(server => {
      const status = this.serverStatuses.get(server.id);
      return server.enabled && status?.status === 'connected';
    });

    await Promise.allSettled(
      connectedServers.map(server => this._discoverTools(server))
    );

    Logger.info('McpManager: Server refresh complete');
  }

  /**
   * Refreshes tool discovery for a specific server.
   * @param serverId - ID of the server to refresh
   */
  async refreshServer(serverId: string): Promise<void> {
    const serverConfig = this.config.servers.find(s => s.id === serverId);
    if (!serverConfig) {
      throw new ARTError(`Server with ID "${serverId}" not found`, ErrorCode.SERVER_NOT_FOUND);
    }

    await this._discoverTools(serverConfig);
  }

  /**
   * Gets the current status of all configured servers.
   * @returns Array of server status objects
   */
  getServerStatuses(): McpServerStatus[] {
    return Array.from(this.serverStatuses.values());
  }

  /**
   * Gets the status of a specific server.
   * @param serverId - ID of the server
   * @returns Server status or undefined if not found
   */
  getServerStatus(serverId: string): McpServerStatus | undefined {
    return this.serverStatuses.get(serverId);
  }

  /**
   * Gets all discovered tools from all servers.
   * @returns Map of server IDs to their discovered tools
   */
  getAllDiscoveredTools(): Map<string, McpToolDefinition[]> {
    return new Map(this.discoveredTools);
  }

  /**
   * Gets discovered tools from a specific server.
   * @param serverId - ID of the server
   * @returns Array of tool definitions or undefined if server not found
   */
  getServerTools(serverId: string): McpToolDefinition[] | undefined {
    return this.discoveredTools.get(serverId);
  }

  /**
   * Enables specific MCP tools for a thread by updating the thread's enabled tools.
   * @param threadId - ID of the thread
   * @param mcpToolNames - Array of MCP tool names (with mcp_ prefix)
   */
  async enableMcpToolsForThread(threadId: string, mcpToolNames: string[]): Promise<void> {
    Logger.debug(`McpManager: Enabling MCP tools for thread ${threadId}: ${mcpToolNames.join(', ')}`);
    await this.stateManager.enableToolsForThread(threadId, mcpToolNames);
  }

  /**
   * Disables specific MCP tools for a thread.
   * @param threadId - ID of the thread
   * @param mcpToolNames - Array of MCP tool names (with mcp_ prefix)
   */
  async disableMcpToolsForThread(threadId: string, mcpToolNames: string[]): Promise<void> {
    Logger.debug(`McpManager: Disabling MCP tools for thread ${threadId}: ${mcpToolNames.join(', ')}`);
    await this.stateManager.disableToolsForThread(threadId, mcpToolNames);
  }

  /**
   * Updates the configuration for the MCP Manager.
   * @param newConfig - New configuration to apply
   */
  updateConfig(newConfig: McpManagerConfig): void {
    this.config = newConfig;
    Logger.info('McpManager: Configuration updated');
  }

  /**
   * Adds a new server configuration and optionally connects to it immediately.
   * @param serverConfig - Configuration for the new server
   * @param connectImmediately - Whether to connect to the server immediately
   */
  async addServer(serverConfig: McpServerConfig, connectImmediately: boolean = true): Promise<void> {
    // Add to config
    this.config.servers.push(serverConfig);

    // Initialize status
    this.serverStatuses.set(serverConfig.id, {
      id: serverConfig.id,
      status: 'disconnected',
      toolCount: 0
    });

    if (connectImmediately && serverConfig.enabled) {
      await this._connectToServer(serverConfig);
    }

    Logger.info(`McpManager: Added server "${serverConfig.name}" (${serverConfig.id})`);
  }

  /**
   * Removes a server configuration and disconnects from it.
   * @param serverId - ID of the server to remove
   */
  async removeServer(serverId: string): Promise<void> {
    // Disconnect first
    await this.disconnectFromServer(serverId);

    // Remove from config
    this.config.servers = this.config.servers.filter(s => s.id !== serverId);

    // Clean up state
    this.serverStatuses.delete(serverId);
    this.discoveredTools.delete(serverId);

    Logger.info(`McpManager: Removed server "${serverId}"`);
  }

  // ========== Private Methods ==========

  /**
   * Internal method to connect to a server and discover its tools.
   * @private
   */
  private async _connectToServer(serverConfig: McpServerConfig): Promise<void> {
    const serverId = serverConfig.id;
    Logger.info(`McpManager: Connecting to server "${serverConfig.name}" (${serverId})`);

    // Update status to connecting
    const status = this.serverStatuses.get(serverId);
    if (status) {
      status.status = 'connecting';
    }

    try {
      // Test connection with health check
      await this._healthCheck(serverConfig);

      // Discover tools
      await this._discoverTools(serverConfig);

      // Update status to connected
      if (status) {
        status.status = 'connected';
        status.lastConnected = new Date();
        status.lastError = undefined;
      }

      Logger.info(`McpManager: Successfully connected to server "${serverConfig.name}"`);
    } catch (error: any) {
      Logger.error(`McpManager: Failed to connect to server "${serverConfig.name}": ${error.message}`);

      // Update status to error
      if (status) {
        status.status = 'error';
        status.lastError = error.message;
      }

      // Schedule retry if auto-retry is enabled
      if (this.config.autoRetry) {
        this._scheduleRetry(serverConfig);
      }

      // Don't throw - we want to continue with other servers
    }
  }

  /**
   * Performs a health check on an MCP server.
   * @private
   */
  private async _healthCheck(serverConfig: McpServerConfig): Promise<void> {
    const url = `${serverConfig.url}/health`;
    const timeout = serverConfig.timeout || this.config.defaultTimeout;
    const startTime = Date.now();

    // Prepare headers
    const headers: Record<string, string> = {
      ...serverConfig.headers
    };

    // Add auth headers if needed
    if (serverConfig.authStrategyId && this.authManager) {
      const authHeaders = await this.authManager.getHeaders(serverConfig.authStrategyId);
      Object.assign(headers, authHeaders);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }

      // Update response time in status
      const status = this.serverStatuses.get(serverConfig.id);
      if (status) {
        status.responseTime = responseTime;
      }

      Logger.debug(`McpManager: Health check passed for "${serverConfig.name}" (${responseTime}ms)`);
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ARTError(`Health check timed out after ${timeout}ms`, ErrorCode.REQUEST_TIMEOUT);
      }
      
      throw new ARTError(`Health check failed: ${error.message}`, ErrorCode.HEALTH_CHECK_FAILED);
    }
  }

  /**
   * Discovers tools from an MCP server and registers them.
   * @private
   */
  private async _discoverTools(serverConfig: McpServerConfig): Promise<void> {
    Logger.debug(`McpManager: Discovering tools from server "${serverConfig.name}"`);

    try {
      const discoveryResponse = await this._fetchToolDiscovery(serverConfig);
      const tools = discoveryResponse.tools;

      // Store discovered tools
      this.discoveredTools.set(serverConfig.id, tools);

      // Unregister existing tools from this server
      await this._unregisterServerTools(serverConfig.id);

      // Register new proxy tools
      for (const tool of tools) {
        const proxyTool = new McpProxyTool(serverConfig, tool, this.authManager);
        await this.toolRegistry.registerTool(proxyTool);
        this.registeredProxyTools.set(proxyTool.schema.name, proxyTool);
        
        Logger.debug(`McpManager: Registered proxy tool "${proxyTool.schema.name}"`);
      }

      // Update tool count in status
      const status = this.serverStatuses.get(serverConfig.id);
      if (status) {
        status.toolCount = tools.length;
      }

      Logger.info(`McpManager: Discovered and registered ${tools.length} tools from server "${serverConfig.name}"`);
    } catch (error: any) {
      Logger.error(`McpManager: Failed to discover tools from server "${serverConfig.name}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches tool discovery information from an MCP server.
   * @private
   */
  private async _fetchToolDiscovery(serverConfig: McpServerConfig): Promise<McpToolDiscoveryResponse> {
    const url = `${serverConfig.url}/tools`;
    const timeout = serverConfig.timeout || this.config.defaultTimeout;

    // Prepare headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...serverConfig.headers
    };

    // Add auth headers if needed
    if (serverConfig.authStrategyId && this.authManager) {
      const authHeaders = await this.authManager.getHeaders(serverConfig.authStrategyId);
      Object.assign(headers, authHeaders);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data as McpToolDiscoveryResponse;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new ARTError(`Tool discovery timed out after ${timeout}ms`, ErrorCode.REQUEST_TIMEOUT);
      }
      
      throw new ARTError(`Tool discovery failed: ${error.message}`, ErrorCode.TOOL_DISCOVERY_FAILED);
    }
  }

  /**
   * Unregisters all proxy tools from a specific server.
   * @private
   */
  private async _unregisterServerTools(serverId: string): Promise<void> {
    const toolsToRemove: string[] = [];

    // Find tools to remove
    for (const [toolName, proxyTool] of this.registeredProxyTools) {
      if (proxyTool.getServerConfig().id === serverId) {
        toolsToRemove.push(toolName);
      }
    }

    // Remove tools
    for (const toolName of toolsToRemove) {
      this.registeredProxyTools.delete(toolName);
      Logger.debug(`McpManager: Unregistered proxy tool "${toolName}"`);
    }

    if (toolsToRemove.length > 0) {
      Logger.info(`McpManager: Unregistered ${toolsToRemove.length} tools from server "${serverId}"`);
    }
  }

  /**
   * Sets up auto-refresh intervals for connected servers.
   * @private
   */
  private _setupAutoRefresh(): void {
    const refreshInterval = this.config.refreshInterval;
    
    for (const serverConfig of this.config.servers) {
      if (serverConfig.enabled) {
        const interval = setInterval(async () => {
          const status = this.serverStatuses.get(serverConfig.id);
          if (status?.status === 'connected') {
            try {
              await this._discoverTools(serverConfig);
            } catch (error: any) {
              Logger.error(`McpManager: Auto-refresh failed for server "${serverConfig.name}": ${error.message}`);
            }
          }
        }, refreshInterval);

        this.refreshIntervals.set(serverConfig.id, interval);
        Logger.debug(`McpManager: Set up auto-refresh for server "${serverConfig.name}" (interval: ${refreshInterval}ms)`);
      }
    }
  }

  /**
   * Schedules a retry attempt for a failed server connection.
   * @private
   */
  private _scheduleRetry(serverConfig: McpServerConfig): void {
    // Don't schedule if already scheduled
    if (this.retryTimeouts.has(serverConfig.id)) {
      return;
    }

    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(serverConfig.id);
      
      Logger.info(`McpManager: Retrying connection to server "${serverConfig.name}"`);
      await this._connectToServer(serverConfig);
    }, this.config.retryInterval);

    this.retryTimeouts.set(serverConfig.id, timeout);
    Logger.debug(`McpManager: Scheduled retry for server "${serverConfig.name}" in ${this.config.retryInterval}ms`);
  }
} 