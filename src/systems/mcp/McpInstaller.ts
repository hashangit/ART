/**
 * MCP Server Installer
 * 
 * Provides one-click installation and management of popular MCP servers.
 * Based on patterns discovered during testing with Tavily and other MCP servers.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors';
import { ConfigManager } from './ConfigManager';
import { McpServerConfig, StdioConnection, SseConnection, McpToolDefinition } from './types';

/**
 * Pre-configured server templates for popular MCP servers
 */
export interface McpServerTemplate {
  id: string;
  displayName: string;
  description: string;
  category: 'search' | 'productivity' | 'data' | 'ai' | 'utility' | 'development';
  popularity: 'popular' | 'trending' | 'new';
  requiredEnvVars: string[];
  optionalEnvVars?: string[];
  installation: {
    source: 'npm' | 'git' | 'binary';
    package?: string;
    repository?: string;
    version?: string;
  };
  connection: StdioConnection | SseConnection;
  type: 'stdio' | 'sse';
  defaultEnabled: boolean;
  documentation?: string;
  website?: string;
}

/**
 * Result of server installation attempt
 */
export interface InstallationResult {
  success: boolean;
  serverId: string;
  message: string;
  toolsDiscovered?: number;
  errors?: string[];
  warnings?: string[];
}

export class McpInstaller {
  private configManager: ConfigManager;
  private serverTemplates: Map<string, McpServerTemplate> = new Map();

  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || new ConfigManager();
    this.loadServerTemplates();
  }

  /**
   * Get all available server templates
   */
  getAvailableServers(): McpServerTemplate[] {
    return Array.from(this.serverTemplates.values());
  }

  /**
   * Get servers by category
   */
  getServersByCategory(category: McpServerTemplate['category']): McpServerTemplate[] {
    return this.getAvailableServers().filter(server => server.category === category);
  }

  /**
   * Get popular/recommended servers
   */
  getPopularServers(): McpServerTemplate[] {
    return this.getAvailableServers().filter(server => server.popularity === 'popular');
  }

  /**
   * Install a server from template with environment validation
   */
  async installServer(
    templateId: string, 
    envVars: Record<string, string> = {},
    options: { 
      enableImmediately?: boolean;
      discoverTools?: boolean;
      validate?: boolean;
    } = {}
  ): Promise<InstallationResult> {
    const template = this.serverTemplates.get(templateId);
    if (!template) {
      return {
        success: false,
        serverId: templateId,
        message: `Server template "${templateId}" not found`,
        errors: [`Unknown template: ${templateId}`]
      };
    }

    Logger.info(`McpInstaller: Installing server "${template.displayName}" (${templateId})`);

    try {
      // 1. Validate required environment variables
      const missingEnvVars = template.requiredEnvVars.filter(envVar => 
        !envVars[envVar] && !process.env[envVar]
      );

      if (missingEnvVars.length > 0) {
        return {
          success: false,
          serverId: templateId,
          message: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
          errors: missingEnvVars.map(envVar => `Missing ${envVar}`)
        };
      }

      // 2. Create server configuration from template
      const serverConfig: McpServerConfig = {
        id: template.id,
        type: template.type,
        enabled: options.enableImmediately ?? template.defaultEnabled,
        displayName: template.displayName,
        description: template.description,
        connection: this.prepareConnection(template, envVars),
        installation: template.installation,
        timeout: 30000,
        tools: [], // Will be discovered if discoverTools is true
        resources: [],
        resourceTemplates: []
      };

      // 3. Discover tools if requested
      let toolsDiscovered = 0;
      if (options.discoverTools !== false) { // Default to true
        try {
          Logger.info(`McpInstaller: Discovering tools for "${templateId}"...`);
          const discoveredTools = await this.discoverServerTools(serverConfig);
          serverConfig.tools = discoveredTools;
          toolsDiscovered = discoveredTools.length;
          Logger.info(`McpInstaller: Discovered ${toolsDiscovered} tools for "${templateId}"`);
        } catch (error: any) {
          Logger.warn(`McpInstaller: Tool discovery failed for "${templateId}": ${error.message}`);
          // Continue with installation even if tool discovery fails
        }
      }

      // 4. Validate connection if requested
      if (options.validate !== false) { // Default to true
        try {
          Logger.info(`McpInstaller: Validating connection for "${templateId}"...`);
          await this.validateServerConnection(serverConfig);
          Logger.info(`McpInstaller: Connection validated for "${templateId}"`);
        } catch (error: any) {
          return {
            success: false,
            serverId: templateId,
            message: `Connection validation failed: ${error.message}`,
            errors: [`Validation failed: ${error.message}`]
          };
        }
      }

      // 5. Save configuration
      this.configManager.setServerConfig(template.id, serverConfig);

      return {
        success: true,
        serverId: templateId,
        message: `Successfully installed "${template.displayName}"`,
        toolsDiscovered
      };

    } catch (error: any) {
      Logger.error(`McpInstaller: Installation failed for "${templateId}": ${error.message}`);
      return {
        success: false,
        serverId: templateId,
        message: `Installation failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  /**
   * Install multiple servers in batch
   */
  async installMultipleServers(
    installations: Array<{
      templateId: string;
      envVars?: Record<string, string>;
      options?: { enableImmediately?: boolean; discoverTools?: boolean; validate?: boolean; };
    }>
  ): Promise<InstallationResult[]> {
    const results: InstallationResult[] = [];
    
    for (const installation of installations) {
      const result = await this.installServer(
        installation.templateId,
        installation.envVars,
        installation.options
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Remove a server configuration
   */
  async uninstallServer(serverId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.configManager.removeServerConfig(serverId);
      return {
        success: true,
        message: `Successfully uninstalled server "${serverId}"`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to uninstall server "${serverId}": ${error.message}`
      };
    }
  }

  /**
   * Discover tools from a running server (used during installation)
   */
  private async discoverServerTools(serverConfig: McpServerConfig): Promise<McpToolDefinition[]> {
    let client: Client | null = null;
    let transport: StdioClientTransport | SSEClientTransport | null = null;

    try {
      // Create appropriate transport
      if (serverConfig.type === 'stdio') {
        const conn = serverConfig.connection as StdioConnection;
        const cleanEnv = Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>;
        
        transport = new StdioClientTransport({
          command: conn.command,
          args: conn.args,
          cwd: conn.cwd,
          env: { ...cleanEnv, ...conn.env }
        });
      } else if (serverConfig.type === 'sse') {
        const conn = serverConfig.connection as SseConnection;
        transport = new SSEClientTransport(new URL(conn.url), {
          requestInit: { headers: conn.headers }
        });
      } else {
        throw new Error(`Unsupported server type: ${serverConfig.type}`);
      }

      // Connect and discover tools
      client = new Client({
        name: 'ART Framework Installer',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      const toolsResult = await client.listTools();
      const discoveredTools: McpToolDefinition[] = toolsResult.tools.map(tool => ({
        name: tool.name,
        description: tool.description || `Tool: ${tool.name}`,
        inputSchema: tool.inputSchema
      }));

      return discoveredTools;

    } finally {
      // Clean up connection
      if (client) {
        try {
          await client.close();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Validate that a server can be connected to
   */
  private async validateServerConnection(serverConfig: McpServerConfig): Promise<void> {
    let client: Client | null = null;
    let transport: StdioClientTransport | SSEClientTransport | null = null;

    try {
      // Create appropriate transport (similar to discoverServerTools)
      if (serverConfig.type === 'stdio') {
        const conn = serverConfig.connection as StdioConnection;
        const cleanEnv = Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>;
        
        transport = new StdioClientTransport({
          command: conn.command,
          args: conn.args,
          cwd: conn.cwd,
          env: { ...cleanEnv, ...conn.env }
        });
      } else if (serverConfig.type === 'sse') {
        const conn = serverConfig.connection as SseConnection;
        transport = new SSEClientTransport(new URL(conn.url), {
          requestInit: { headers: conn.headers }
        });
      } else {
        throw new Error(`Unsupported server type: ${serverConfig.type}`);
      }

      // Quick connection test
      client = new Client({
        name: 'ART Framework Validator',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      // Try to list tools as a basic validation
      await client.listTools();

    } finally {
      // Clean up connection
      if (client) {
        try {
          await client.close();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Prepare connection configuration with environment variables
   */
  private prepareConnection(
    template: McpServerTemplate, 
    envVars: Record<string, string>
  ): StdioConnection | SseConnection {
    const connection = { ...template.connection };

    if (template.type === 'stdio') {
      const stdioConn = connection as StdioConnection;
      // Merge provided env vars with template defaults and process.env
      stdioConn.env = {
        ...(stdioConn.env || {}),
        ...envVars
      };
    } else if (template.type === 'sse') {
      const sseConn = connection as SseConnection;
      // For SSE connections, env vars might be used in headers or auth
      if (envVars.AUTHORIZATION_TOKEN) {
        sseConn.headers = {
          ...(sseConn.headers || {}),
          'Authorization': `Bearer ${envVars.AUTHORIZATION_TOKEN}`
        };
      }
    }

    return connection;
  }

  /**
   * Load built-in server templates
   */
  private loadServerTemplates(): void {
    // Tavily Search - Web search and content extraction
    this.serverTemplates.set('tavily-search', {
      id: 'tavily_search_stdio',
      displayName: 'Tavily Search',
      description: 'AI-powered web search and content extraction tools',
      category: 'search',
      popularity: 'popular',
      requiredEnvVars: ['TAVILY_API_KEY'],
      installation: {
        source: 'npm',
        package: 'tavily-mcp@0.1.4'
      },
      connection: {
        command: 'npx',
        args: ['-y', 'tavily-mcp@0.1.4'],
        env: {
          TAVILY_API_KEY: '' // Will be filled from envVars
        }
      },
      type: 'stdio',
      defaultEnabled: true,
      website: 'https://tavily.com',
      documentation: 'https://docs.tavily.com'
    });

    // Example: GitHub MCP (if it existed)
    this.serverTemplates.set('github-tools', {
      id: 'github_tools_stdio',
      displayName: 'GitHub Tools',
      description: 'Interact with GitHub repositories, issues, and pull requests',
      category: 'development',
      popularity: 'popular',
      requiredEnvVars: ['GITHUB_TOKEN'],
      installation: {
        source: 'npm',
        package: 'github-mcp'
      },
      connection: {
        command: 'npx',
        args: ['-y', 'github-mcp'],
        env: {
          GITHUB_TOKEN: ''
        }
      },
      type: 'stdio',
      defaultEnabled: true,
      website: 'https://github.com'
    });

    // Example: Slack MCP (if it existed)
    this.serverTemplates.set('slack-integration', {
      id: 'slack_integration_stdio',
      displayName: 'Slack Integration',
      description: 'Send messages and manage Slack workspaces',
      category: 'productivity',
      popularity: 'trending',
      requiredEnvVars: ['SLACK_BOT_TOKEN'],
      optionalEnvVars: ['SLACK_SIGNING_SECRET'],
      installation: {
        source: 'npm',
        package: 'slack-mcp'
      },
      connection: {
        command: 'npx',
        args: ['-y', 'slack-mcp'],
        env: {
          SLACK_BOT_TOKEN: '',
          SLACK_SIGNING_SECRET: ''
        }
      },
      type: 'stdio',
      defaultEnabled: false, // Requires setup
      website: 'https://slack.com'
    });

    Logger.info(`McpInstaller: Loaded ${this.serverTemplates.size} server templates`);
  }

  /**
   * Get installation status for all available servers
   */
  getInstallationStatus(): Array<{
    templateId: string;
    template: McpServerTemplate;
    installed: boolean;
    enabled: boolean;
    hasRequiredEnvVars: boolean;
  }> {
    const currentConfig = this.configManager.getConfig();
    
    return this.getAvailableServers().map(template => {
      const isInstalled = !!currentConfig.mcpServers[template.id];
      const isEnabled = isInstalled ? currentConfig.mcpServers[template.id].enabled : false;
      const hasRequiredEnvVars = template.requiredEnvVars.every(envVar => 
        !!process.env[envVar]
      );

      return {
        templateId: template.id,
        template,
        installed: isInstalled,
        enabled: isEnabled,
        hasRequiredEnvVars
      };
    });
  }
} 