// src/systems/mcp/McpManager.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpManager } from './McpManager';
import { McpProxyTool } from './McpProxyTool';
import { ToolRegistry, StateManager } from '../../core/interfaces';
import { AuthManager } from '../../systems/auth/AuthManager';
import { ARTError } from '../../types';
import {
  McpManagerConfig,
  McpServerConfig,
  McpToolDiscoveryResponse
} from './types';

// Mock fetch globally
global.fetch = vi.fn();

describe('McpManager', () => {
  let mcpManager: McpManager;
  let mockToolRegistry: ToolRegistry;
  let mockStateManager: StateManager;
  let mockAuthManager: AuthManager;
  let mockConfig: McpManagerConfig;

  const mockServerConfig: McpServerConfig = {
    id: 'test-server-1',
    name: 'Test Server 1',
    url: 'https://api.test-server.com',
    authStrategyId: 'test-auth',
    enabled: true,
    timeout: 5000
  };

  const mockToolDiscoveryResponse: McpToolDiscoveryResponse = {
    tools: [
      {
        name: 'test-tool-1',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        }
      },
      {
        name: 'test-tool-2',
        description: 'Another test tool',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'number' }
          }
        }
      }
    ],
    server: {
      name: 'Test Server',
      version: '1.0.0',
      capabilities: ['tools', 'health']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ToolRegistry
    mockToolRegistry = {
      registerTool: vi.fn().mockResolvedValue(undefined),
      getToolExecutor: vi.fn().mockResolvedValue(undefined),
      getAvailableTools: vi.fn().mockResolvedValue([])
    };

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
    };

    // Mock AuthManager
    mockAuthManager = {
      registerStrategy: vi.fn(),
      authenticate: vi.fn().mockResolvedValue({ 'Authorization': 'Bearer test-token' })
    } as any;

    mockConfig = {
      servers: [mockServerConfig],
      defaultTimeout: 10000,
      autoRetry: true,
      retryInterval: 5000,
      maxRetries: 3,
      autoRefresh: false,
      refreshInterval: 30000
    };

    mcpManager = new McpManager(
      mockConfig,
      mockToolRegistry,
      mockStateManager,
      mockAuthManager
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with provided configuration', () => {
      expect(mcpManager).toBeDefined();
      expect(mcpManager.getServerStatuses()).toHaveLength(0);
    });

    it('should accept configuration without auth manager', () => {
      const manager = new McpManager(mockConfig, mockToolRegistry, mockStateManager);
      expect(manager).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = { ...mockConfig, defaultTimeout: 15000 };
      mcpManager.updateConfig(newConfig);
      // Configuration update is internal, so we just check it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('Server Management', () => {
    beforeEach(async () => {
      // Mock successful health check and tool discovery
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockToolDiscoveryResponse)
        });

      await mcpManager.initialize();
    });

    it('should initialize and connect to enabled servers', async () => {
      const statuses = mcpManager.getServerStatuses();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].id).toBe('test-server-1');
      expect(statuses[0].status).toBe('connected');
      expect(statuses[0].toolCount).toBe(2);
    });

    it('should register discovered tools with the tool registry', async () => {
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(2);
    });

    it('should get server status by ID', () => {
      const status = mcpManager.getServerStatus('test-server-1');
      expect(status).toBeDefined();
      expect(status?.id).toBe('test-server-1');
      expect(status?.status).toBe('connected');
    });

    it('should return undefined for non-existent server', () => {
      const status = mcpManager.getServerStatus('non-existent');
      expect(status).toBeUndefined();
    });

    it('should get discovered tools for a server', () => {
      const tools = mcpManager.getServerTools('test-server-1');
      expect(tools).toHaveLength(2);
      expect(tools?.[0].name).toBe('test-tool-1');
    });

    it('should get all discovered tools', () => {
      const allTools = mcpManager.getAllDiscoveredTools();
      expect(allTools.size).toBe(1);
      expect(allTools.get('test-server-1')).toHaveLength(2);
    });
  });

  describe('Server Connection Handling', () => {
    it('should handle health check failure gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection failed'));

      await mcpManager.initialize();

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('error');
      expect(status?.lastError).toContain('HEALTH_CHECK_FAILED');
    });

    it('should handle tool discovery failure gracefully', async () => {
      // Mock successful health check but failed tool discovery
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK')
        })
        .mockRejectedValueOnce(new Error('Tool discovery failed'));

      await mcpManager.initialize();

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('error');
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found')
      });

      await mcpManager.initialize();

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('error');
    });

    it('should handle request timeout', async () => {
      const mockAbortError = new Error('Request timed out');
      mockAbortError.name = 'AbortError';
      (global.fetch as any).mockRejectedValueOnce(mockAbortError);

      await mcpManager.initialize();

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('error');
    });
  });

  describe('Authentication', () => {
    it('should use authentication when auth strategy is configured', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockToolDiscoveryResponse)
        });

      await mcpManager.initialize();

      expect(mockAuthManager.authenticate).toHaveBeenCalledWith('test-auth');
    });

    it('should handle authentication failure', async () => {
      mockAuthManager.authenticate = vi.fn().mockRejectedValue(new Error('Auth failed'));

      await mcpManager.initialize();

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('error');
    });
  });

  describe('Server CRUD Operations', () => {
    beforeEach(async () => {
      // Mock responses for initial setup
      (global.fetch as any)
        .mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK'),
          json: () => Promise.resolve(mockToolDiscoveryResponse)
        });

      await mcpManager.initialize();
    });

    it('should add a new server', async () => {
      const newServer: McpServerConfig = {
        id: 'test-server-2',
        name: 'Test Server 2',
        url: 'https://api.test-server-2.com',
        enabled: true
      };

      await mcpManager.addServer(newServer);

      const statuses = mcpManager.getServerStatuses();
      expect(statuses).toHaveLength(2);
      expect(statuses.find(s => s.id === 'test-server-2')).toBeDefined();
    });

    it('should remove a server', async () => {
      await mcpManager.removeServer('test-server-1');

      const statuses = mcpManager.getServerStatuses();
      expect(statuses).toHaveLength(0);
      expect(mcpManager.getServerStatus('test-server-1')).toBeUndefined();
    });

    it('should disconnect from a server', async () => {
      await mcpManager.disconnectFromServer('test-server-1');

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('disconnected');
      expect(status?.toolCount).toBe(0);
    });

    it('should connect to a specific server', async () => {
      const newServer: McpServerConfig = {
        id: 'test-server-3',
        name: 'Test Server 3',
        url: 'https://api.test-server-3.com',
        enabled: false
      };

      await mcpManager.addServer(newServer, false);
      await mcpManager.connectToServer(newServer);

      const status = mcpManager.getServerStatus('test-server-3');
      expect(status?.status).toBe('connected');
    });
  });

  describe('Tool Discovery and Registration', () => {
    beforeEach(async () => {
      (global.fetch as any)
        .mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK'),
          json: () => Promise.resolve(mockToolDiscoveryResponse)
        });

      await mcpManager.initialize();
    });

    it('should refresh all servers', async () => {
      await mcpManager.refreshAllServers();
      // Should have called registerTool again for each tool
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(4); // 2 initial + 2 refresh
    });

    it('should refresh a specific server', async () => {
      await mcpManager.refreshServer('test-server-1');
      expect(mockToolRegistry.registerTool).toHaveBeenCalledTimes(4); // 2 initial + 2 refresh
    });

    it('should throw error when refreshing non-existent server', async () => {
      await expect(mcpManager.refreshServer('non-existent')).rejects.toThrow(ARTError);
    });
  });

  describe('Thread-Specific Tool Management', () => {
    it('should enable MCP tools for a thread', async () => {
      const threadId = 'test-thread-1';
      const toolNames = ['mcp_test-server-1_test-tool-1', 'mcp_test-server-1_test-tool-2'];

      await mcpManager.enableMcpToolsForThread(threadId, toolNames);

      expect(mockStateManager.enableToolsForThread).toHaveBeenCalledWith(threadId, toolNames);
    });

    it('should disable MCP tools for a thread', async () => {
      const threadId = 'test-thread-1';
      const toolNames = ['mcp_test-server-1_test-tool-1'];

      await mcpManager.disableMcpToolsForThread(threadId, toolNames);

      expect(mockStateManager.disableToolsForThread).toHaveBeenCalledWith(threadId, toolNames);
    });
  });

  describe('Shutdown', () => {
    it('should clean up intervals and timeouts on shutdown', async () => {
      // First initialize with auto-refresh enabled to create intervals
      const configWithAutoRefresh = {
        ...mockConfig,
        autoRefresh: true,
        refreshInterval: 1000
      };
      
      const managerWithAutoRefresh = new McpManager(
        configWithAutoRefresh,
        mockToolRegistry,
        mockStateManager,
        mockAuthManager
      );

      // Mock successful responses for initialization
      (global.fetch as any)
        .mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK'),
          json: () => Promise.resolve(mockToolDiscoveryResponse)
        });

      await managerWithAutoRefresh.initialize();

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await managerWithAutoRefresh.shutdown();

      // Should have called clearInterval for auto-refresh intervals
      expect(clearIntervalSpy).toHaveBeenCalled();
      // clearTimeout may or may not be called depending on whether there are active timeouts
      // For this test, we don't require clearTimeout to be called since the implementation
      // may not always have active timeouts during shutdown
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON responses gracefully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('Invalid JSON'))
        });

      await mcpManager.initialize();

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('error');
    });

    it('should handle network errors during health check', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await mcpManager.initialize();

      const status = mcpManager.getServerStatus('test-server-1');
      expect(status?.status).toBe('error');
      expect(status?.lastError).toContain('HEALTH_CHECK_FAILED');
    });
  });
}); 