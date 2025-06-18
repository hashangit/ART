import * as path from 'path';
import * as fs from 'fs';
import { homedir } from 'os';
import { Logger } from '../../utils/logger';
import { ArtMcpConfig, McpServerConfig } from './types';

export class ConfigManager {
  private configPath: string;
  private config: ArtMcpConfig;

  constructor() {
    const artDir = path.join(homedir(), '.art');
    this.configPath = path.join(artDir, 'art_mcp_config.json');
    this.ensureConfigDirectoryExists(artDir);
    this.config = this.loadConfig();
  }

  private ensureConfigDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        Logger.info(`ConfigManager: Created configuration directory at ${dirPath}`);
      } catch (error: any) {
        Logger.error(`ConfigManager: Failed to create configuration directory: ${error.message}`);
        throw error;
      }
    }
  }

  private loadConfig(): ArtMcpConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const rawConfig = JSON.parse(fileContent) as ArtMcpConfig;
        
        // Validate and fix the config automatically
        const validatedConfig = this.validateAndFixConfig(rawConfig);
        
        // If config was fixed, save it back
        if (JSON.stringify(validatedConfig) !== JSON.stringify(rawConfig)) {
          Logger.info(`ConfigManager: Config was automatically validated and fixed`);
          this.writeConfig(validatedConfig);
        }
        
        return validatedConfig;
      } catch (error: any) {
        Logger.error(`ConfigManager: Error reading or parsing config file: ${error.message}`);
        return { mcpServers: {} };
      }
    } else {
      Logger.info(`ConfigManager: Configuration file not found. Creating a new one with default Tavily server at ${this.configPath}`);
      const defaultConfig = this.createDefaultConfig();
      this.writeConfig(defaultConfig);
      return defaultConfig;
    }
  }

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
        type: serverConfig.type || 'stdio',
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

  private createDefaultConfig(): ArtMcpConfig {
    const npxPath = process.env.NPX_PATH || 'npx';
    const tavilyCard: McpServerConfig = {
        id: "tavily_search_stdio",
        type: "stdio",
        enabled: true,
        displayName: "Tavily Search (Local)",
        description: "Provides AI-powered search and web content extraction tools.",
        connection: {
            command: npxPath,
            args: ["-y", "tavily-mcp@0.1.4"],
            env: { "TAVILY_API_KEY": "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" }
        },
        installation: { source: "npm", package: "tavily-mcp@0.1.4" },
        tools: [
          {
            name: "tavily-search",
            description: "A powerful web search tool that provides comprehensive, real-time results using Tavily's AI search engine.",
            inputSchema: {
                type: "object",
                properties: { 
                  "query": { "type": "string", "description": "Search query" },
                  "search_depth": { "type": "string", "enum": ["basic", "advanced"], "description": "The depth of the search. It can be 'basic' or 'advanced'", "default": "basic" },
                  "topic": { "type": "string", "enum": ["general", "news"], "description": "The category of the search", "default": "general" },
                  "max_results": { "type": "number", "description": "The maximum number of search results to return", "default": 10, "minimum": 5, "maximum": 20 },
                  "include_raw_content": { "type": "boolean", "description": "Include the cleaned and parsed HTML content of each search result", "default": false }
                },
                required: ["query"]
            }
          },
          {
            name: "tavily-extract",
            description: "A powerful web content extraction tool that retrieves and processes raw content from specified URLs.",
            inputSchema: {
                type: "object",
                properties: {
                  "urls": { "type": "array", "items": { "type": "string" }, "description": "List of URLs to extract content from" },
                  "extract_depth": { "type": "string", "enum": ["basic", "advanced"], "description": "Depth of extraction - 'basic' or 'advanced'", "default": "basic" },
                  "include_images": { "type": "boolean", "description": "Include a list of images extracted from the urls in the response", "default": false }
                },
                required: ["urls"]
            }
          }
        ],
        resources: [],
        resourceTemplates: []
    };
    return { mcpServers: { "tavily_search_stdio": tavilyCard } };
  }

  private writeConfig(config: ArtMcpConfig): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      Logger.debug(`ConfigManager: Configuration saved to ${this.configPath}`);
    } catch (error: any) {
      Logger.error(`ConfigManager: Failed to write to config file: ${error.message}`);
      throw error;
    }
  }

  public getConfig(): ArtMcpConfig {
    return this.config;
  }

  public setServerConfig(serverId: string, serverConfig: McpServerConfig): void {
    this.config.mcpServers[serverId] = serverConfig;
    this.writeConfig(this.config);
    Logger.info(`ConfigManager: Updated configuration for server "${serverId}"`);
  }

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