// src/systems/mcp/McpManager.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpManager } from './McpManager';
import { ConfigManager } from './ConfigManager';
import { McpProxyTool } from './McpProxyTool';
import { ToolRegistry, StateManager } from '../../core/interfaces';
import { AuthManager } from '../auth/AuthManager';
import { ArtMcpConfig, McpServerConfig } from './types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Mock the ConfigManager
vi.mock('./ConfigManager');
vi.mock('@modelcontextprotocol/sdk/client/index.js');
vi.mock('@modelcontextprotocol/sdk/client/stdio.js');
vi.mock('@modelcontextprotocol/sdk/client/sse.js');
vi.mock('reconnecting-eventsource', () => ({
  default: vi.fn()
}));

describe('McpManager', () => {
  let mcpManager: McpManager;
  let mockToolRegistry: ToolRegistry;
  let mockStateManager: StateManager;
  let mockAuthManager: AuthManager;
  let mockConfigManager: ConfigManager;
  let mockClient: Client;
  let mockStdioTransport: StdioClientTransport;
  let mockSSETransport: SSEClientTransport;

  const mockConfig: ArtMcpConfig = {
    mcpServers: {
      'tavily_search': {
        id: 'tavily_search',
        type: 'stdio',
        enabled: true,
        displayName: 'Tavily Search',
        description: 'Search tool for finding information',
        connection: {
          command: 'npx',
          args: ['-y', 'tavily-mcp@0.1.4'],
          env: { 'TAVILY_API_KEY': 'test-key' }
        },
        installation: { source: 'npm', package: 'tavily-mcp@0.1.4' },
        timeout: 30000,
        tools: [
          {
            name: 'search',
            description: 'Search for information',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }
        ],
        resources: [],
        resourceTemplates: []
      },
      'weather_api': {
        id: 'weather_api',
        type: 'sse',
        enabled: false,
        displayName: 'Weather API',
        description: 'Weather information service',
        connection: {
          url: 'https://weather.example.com/sse',
          authStrategyId: 'weather-auth'
        },
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            inputSchema: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location']
            }
          }
        ],
        resources: [],
        resourceTemplates: []
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ToolRegistry
    mockToolRegistry = {
      registerTool: vi.fn().mockResolvedValue(undefined),
      getToolExecutor: vi.fn().mockResolvedValue(undefined),
      getAvailableTools: vi.fn().mockResolvedValue([])
    } as any;

    // Mock StateManager
    mockStateManager = {
      loadThreadContext: vi.fn(),
      isToolEnabled: vi.fn(),
      getThreadConfigValue: vi.fn(),
      saveStateIfModified: vi.fn(),
      setThreadConfig: vi.fn(),
      setAgentState: vi.fn(),
      enableToolsForThread: vi.fn().mockResolvedValue(undefined),
      disableToolsForThread: vi.fn().mockResolvedValue(undefined),
      getEnabledToolsForThread: vi.fn().mockResolvedValue([])
    } as any;

    // Mock AuthManager
    mockAuthManager = {
      registerStrategy: vi.fn(),
      getHeaders: vi.fn().mockResolvedValue({ 'Authorization': 'Bearer test-token' })
    } as any;

    // Mock ConfigManager
    mockConfigManager = {
      getConfig: vi.fn().mockReturnValue(mockConfig),
      setServerConfig: vi.fn(),
      removeServerConfig: vi.fn()
    } as any;
    (ConfigManager as any).mockImplementation(() => mockConfigManager);

    // Mock SDK Client and Transports
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      request: vi.fn().mockResolvedValue({ content: ['test result'], _meta: {} })
    } as any;
    mockStdioTransport = { onclose: undefined } as any;
    mockSSETransport = { onclose: undefined } as any;

    (Client as any).mockImplementation(() => mockClient);
    (StdioClientTransport as any).mockImplementation(() => mockStdioTransport);
    (SSEClientTransport as any).mockImplementation(() => mockSSETransport);

    mcpManager = new McpManager(mockToolRegistry, mockStateManager, mockAuthManager);
  });

  afterEach(async () => {
    await mcpManager.shutdown();
    vi.clearAllTimers();
  });

  describe('Initialization from Config Catalog', () => {
    it('should create ConfigManager and read config', async () => {
      await mcpManager.initialize();

      expect(ConfigManager).toHaveBeenCalledTimes(1);
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });

    it('should register lazy proxy tools for enabled servers only', async () => {
      await mcpManager.initialize();

      // Should register 1 tool from the enabled 'tavily_search' server
      // Should NOT register tools from the disabled 'weather_api' server
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(1);
      
      const registeredTool = vi.mocked(mockToolRegistry.registerTool).mock.calls[0][0];
      expect(registeredTool).toBeInstanceOf(McpProxyTool);
      expect(registeredTool.schema.name).toBe('mcp_tavily_search_search');
    });

    it('should not register tools from disabled servers', async () => {
      await mcpManager.initialize();

      // Verify that weather_api tools were not registered (server is disabled)
      const calls = vi.mocked(mockToolRegistry.registerTool).mock.calls;
      const registeredToolNames = calls.map(call => call[0].schema.name);
      expect(registeredToolNames).not.toContain('mcp_weather_api_get_weather');
    });

    it('should handle empty config gracefully', async () => {
      (mockConfigManager.getConfig as any).mockReturnValue({ mcpServers: {} });

      await mcpManager.initialize();

      expect(mockToolRegistry.registerTool).not.toHaveBeenCalled();
    });
  });

  describe('Lazy Connection Management', () => {
    beforeEach(async () => {
      await mcpManager.initialize();
    });

    it('should create stdio connection on-demand', async () => {
      const client = await mcpManager.getOrCreateConnection('tavily_search');

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'npx',
        args: ['-y', 'tavily-mcp@0.1.4'],
        cwd: undefined,
        env: expect.objectContaining({
          'TAVILY_API_KEY': 'test-key'
        })
      });
      expect(Client).toHaveBeenCalledWith({ name: 'ART Framework', version: '0.1.0' });
      expect(mockClient.connect).toHaveBeenCalledWith(mockStdioTransport);
      expect(client).toBe(mockClient);
    });

    it('should create SSE connection with auth headers', async () => {
      // Enable the weather server for this test
      const configWithEnabledWeather = {
        ...mockConfig,
        mcpServers: {
          ...mockConfig.mcpServers,
          weather_api: { ...mockConfig.mcpServers.weather_api, enabled: true }
        }
      };
      (mockConfigManager.getConfig as any).mockReturnValue(configWithEnabledWeather);

      const client = await mcpManager.getOrCreateConnection('weather_api');

      expect(mockAuthManager.getHeaders).toHaveBeenCalledWith('weather-auth');
      expect(SSEClientTransport).toHaveBeenCalledWith(
        new URL('https://weather.example.com/sse'),
        { requestInit: { headers: { 'Authorization': 'Bearer test-token' } } }
      );
      expect(mockClient.connect).toHaveBeenCalledWith(mockSSETransport);
      expect(client).toBe(mockClient);
    });

    it('should reuse existing connections', async () => {
      const client1 = await mcpManager.getOrCreateConnection('tavily_search');
      const client2 = await mcpManager.getOrCreateConnection('tavily_search');

      expect(client1).toBe(client2);
      expect(StdioClientTransport).toHaveBeenCalledTimes(1);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent server', async () => {
      await expect(mcpManager.getOrCreateConnection('non-existent'))
        .rejects.toThrow('Configuration for server "non-existent" not found');
    });

    it('should handle connection cleanup on transport close', async () => {
      await mcpManager.getOrCreateConnection('tavily_search');
      
      // Simulate transport close
      if (mockStdioTransport.onclose) {
        mockStdioTransport.onclose();
      }

      // Next connection should create a new client
      await mcpManager.getOrCreateConnection('tavily_search');
      expect(StdioClientTransport).toHaveBeenCalledTimes(2);
    });
  });

  describe('Shutdown', () => {
    it('should close all active connections', async () => {
      await mcpManager.initialize();
      await mcpManager.getOrCreateConnection('tavily_search');

      await mcpManager.shutdown();

      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });

    it('should handle shutdown with no active connections', async () => {
      await mcpManager.shutdown();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Zyntopia Discovery API', () => {
    beforeEach(() => {
      // Reset global fetch mock before each test
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should discover servers from Zyntopia API', async () => {
      // Mock a successful fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 'zyntopia-weather',
            name: 'Weather Service',
            service_type: 'MCP_SERVICE',
            description: 'Weather data provider',
            connection: { type: 'sse', url: 'https://weather.example.com/mcp' },
            tools: [{ name: 'get_weather', description: 'Get weather data', inputSchema: { type: 'object' } }]
          }
        ])
      });

      const servers = await mcpManager.discoverAvailableServers('https://zyntopia.example.com/api/services');
      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe('zyntopia-weather');
      expect(servers[0].displayName).toBe('Weather Service');
    });

    it('should handle discovery API failures gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(mcpManager.discoverAvailableServers()).rejects.toThrow('Discovery API failed');
    });

    it('should initialize with both local and discovered servers', async () => {
      // Mock discovery response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 'discovered-server',
            name: 'Discovered Service',
            service_type: 'MCP_SERVICE',
            enabled: true,
            connection: { type: 'stdio', command: 'discovered-tool' },
            tools: [{ name: 'discovered_tool', description: 'A discovered tool', inputSchema: { type: 'object' } }]
          }
        ])
      });

      await mcpManager.initialize('https://zyntopia.example.com/api/services');
      
      // Should register tools from both local config AND discovered servers
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(2); // 1 local + 1 discovered
    });

    it('should prefer local config over discovered servers for conflicts', async () => {
      // Mock a discovered server with same ID as local config
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 'tavily_search', // Same ID as in mock config
            name: 'Conflicting Tavily',
            service_type: 'MCP_SERVICE',
            enabled: true,
            connection: { type: 'stdio', command: 'different-command' },
            tools: [{ name: 'conflict_tool', description: 'Conflicting tool', inputSchema: { type: 'object' } }]
          }
        ])
      });

      await mcpManager.initialize('https://zyntopia.example.com/api/services');
      
      // Should only register from local config (no duplicates)
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(1);
    });

    it('should have placeholder for card generation', async () => {
      const connection = { command: 'test', args: ['--test'] };
      await mcpManager.generateAndInstallCard('test-server', connection);
      // Should complete without error (placeholder implementation)
      expect(true).toBe(true);
    });
  });
}); 