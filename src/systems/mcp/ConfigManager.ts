import { Logger } from '@/utils/logger';
import { ArtMcpConfig, McpServerConfig } from './types';

/**
 * @class ConfigManager
 * @description Manages the MCP configuration, handling loading, validation, and saving to localStorage.
 * This class ensures that the application always has a valid MCP configuration to work with,
 * creating a default configuration if one doesn't exist.
 */
export class ConfigManager {
  private configKey = 'art_mcp_config';
  private config: ArtMcpConfig;

  /**
   * @constructor
   * @description Initializes the ConfigManager by loading the configuration from localStorage.
   */
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * @method loadConfig
   * @description Loads the MCP configuration from localStorage, creating a default if none exists.
   * @private
   * @returns {ArtMcpConfig} The loaded or created MCP configuration.
   */
  private loadConfig(): ArtMcpConfig {
    try {
      const storedConfig = localStorage.getItem(this.configKey);
      if (storedConfig) {
        const rawConfig = JSON.parse(storedConfig) as ArtMcpConfig;
        const validatedConfig = this.validateAndFixConfig(rawConfig);
        
        // If config was fixed, save it back
        if (JSON.stringify(validatedConfig) !== JSON.stringify(rawConfig)) {
          Logger.info(`ConfigManager: Config was automatically validated and fixed`);
          this.writeConfig(validatedConfig);
        }
        return validatedConfig;
      }
    } catch (error: any) {
      Logger.error(`ConfigManager: Error reading or parsing config from localStorage: ${error.message}`);
    }
    
    Logger.info(`ConfigManager: Configuration not found in localStorage. Creating a new default config.`);
    const defaultConfig = this.createDefaultConfig();
    this.writeConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * @method validateAndFixConfig
   * @description Validates the loaded configuration and fixes any inconsistencies.
   * @private
   * @param {ArtMcpConfig} config - The configuration to validate.
   * @returns {ArtMcpConfig} The validated and fixed configuration.
   */
  private validateAndFixConfig(config: ArtMcpConfig): ArtMcpConfig {
    const cleanConfig: ArtMcpConfig = {
      mcpServers: {}
    };

    // Process each server entry
    for (const [serverId, serverConfig] of Object.entries(config.mcpServers)) {
      // Skip corrupted entries
      if (serverId === '[object Object]' || typeof serverConfig !== 'object' || !serverConfig) {
        Logger.warn(`ConfigManager: Removing corrupted entry: "${serverId}"`);
        continue;
      }

      // Ensure the server config has all required fields
      const fixedConfig: McpServerConfig = {
        id: serverConfig.id || serverId,
        type: serverConfig.type || 'streamable-http',
        enabled: serverConfig.enabled !== false, // Default to true
        displayName: serverConfig.displayName || serverId,
        description: serverConfig.description || `MCP server: ${serverId}`,
        connection: serverConfig.connection,
        installation: serverConfig.installation,
        timeout: serverConfig.timeout || 30000,
        tools: serverConfig.tools || [], // Add missing tools array
        resources: serverConfig.resources || [], // Add missing resources array
        resourceTemplates: serverConfig.resourceTemplates || [] // Add missing resourceTemplates array
      };

      // For Tavily specifically, ensure it has the proper tools definition
      if (serverId === 'tavily_search_stdio' && (!fixedConfig.tools || fixedConfig.tools.length === 0)) {
        fixedConfig.tools = [
          {
            name: 'tavily-search',
            description: 'A powerful web search tool that provides comprehensive, real-time results using Tavily\'s AI search engine.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                search_depth: { type: 'string', enum: ['basic', 'advanced'], description: 'The depth of the search. It can be \'basic\' or \'advanced\'', default: 'basic' },
                topic: { type: 'string', enum: ['general', 'news'], description: 'The category of the search', default: 'general' },
                max_results: { type: 'number', description: 'The maximum number of search results to return', default: 10, minimum: 5, maximum: 20 },
                include_raw_content: { type: 'boolean', description: 'Include the cleaned and parsed HTML content of each search result', default: false }
              },
              required: ['query']
            }
          },
          {
            name: 'tavily-extract',
            description: 'A powerful web content extraction tool that retrieves and processes raw content from specified URLs.',
            inputSchema: {
              type: 'object',
              properties: {
                urls: { type: 'array', items: { type: 'string' }, description: 'List of URLs to extract content from' },
                extract_depth: { type: 'string', enum: ['basic', 'advanced'], description: 'Depth of extraction - \'basic\' or \'advanced\'', default: 'basic' },
                include_images: { type: 'boolean', description: 'Include a list of images extracted from the urls in the response', default: false }
              },
              required: ['urls']
            }
          }
        ];
        Logger.info(`ConfigManager: Added tools definition for Tavily server`);
      }

      cleanConfig.mcpServers[serverId] = fixedConfig;
    }

    return cleanConfig;
  }

  /**
   * @method createDefaultConfig
   * @description Creates a default MCP configuration.
   * @private
   * @returns {ArtMcpConfig} The default MCP configuration.
   */
  private createDefaultConfig(): ArtMcpConfig {
    // Default to a remote, streamable-http Tavily server
    const tavilyCard: McpServerConfig = {
      id: "tavily_search_remote",
      type: "streamable-http",
      enabled: true,
      displayName: "Tavily Search (Remote)",
      description: "Provides AI-powered search and web content extraction tools via a remote server.",
      connection: {
        url: "https://mcp.tavily.com/v1/stream", // This is a placeholder URL
        authStrategyId: "tavily_api_key" // Assumes an ApiKeyStrategy is configured
      },
      tools: [
        {
          name: "tavily-search",
          description: "A powerful web search tool...",
          inputSchema: { /* ... schema ... */ }
        },
        {
          name: "tavily-extract",
          description: "A powerful web content extraction tool...",
          inputSchema: { /* ... schema ... */ }
        }
      ],
      resources: [],
      resourceTemplates: []
    };
    return { mcpServers: { "tavily_search_remote": tavilyCard } };
  }

  /**
   * @method writeConfig
   * @description Writes the MCP configuration to localStorage.
   * @private
   * @param {ArtMcpConfig} config - The configuration to write.
   */
  private writeConfig(config: ArtMcpConfig): void {
    try {
      localStorage.setItem(this.configKey, JSON.stringify(config, null, 2));
      Logger.debug(`ConfigManager: Configuration saved to localStorage.`);
    } catch (error: any) {
      Logger.error(`ConfigManager: Failed to write to localStorage: ${error.message}`);
      // Don't throw in browser context, as it could break the app
    }
  }

  /**
   * @method getConfig
   * @description Gets the current MCP configuration.
   * @returns {ArtMcpConfig} The current MCP configuration.
   */
  public getConfig(): ArtMcpConfig {
    return this.config;
  }

  /**
   * @method setServerConfig
   * @description Sets the configuration for a specific server and saves it.
   * @param {string} serverId - The ID of the server to configure.
   * @param {McpServerConfig} serverConfig - The configuration for the server.
   */
  public setServerConfig(serverId: string, serverConfig: McpServerConfig): void {
    this.config.mcpServers[serverId] = serverConfig;
    this.writeConfig(this.config);
    Logger.info(`ConfigManager: Updated configuration for server "${serverId}"`);
  }

  /**
   * @method removeServerConfig
   * @description Removes the configuration for a specific server and saves the changes.
   * @param {string} serverId - The ID of the server to remove.
   */
  public removeServerConfig(serverId: string): void {
    if (this.config.mcpServers[serverId]) {
      delete this.config.mcpServers[serverId];
      this.writeConfig(this.config);
      Logger.info(`ConfigManager: Removed configuration for server "${serverId}"`);
    } else {
      Logger.warn(`ConfigManager: Attempted to remove non-existent server config "${serverId}"`);
    }
  }
} 