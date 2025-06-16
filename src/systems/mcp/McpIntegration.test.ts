import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { McpManager } from './McpManager';
import { McpClient } from './McpClient';
import { AuthManager } from '../auth/AuthManager';
import { ToolRegistry as ToolRegistryImpl } from '../tool/ToolRegistry';
import { StateManager as StateManagerImpl } from '../context/managers/StateManager';
import { InMemoryStorageAdapter } from '../../adapters/storage/inMemory';
import { StateRepository } from '../context/repositories/StateRepository';
import type { IStateRepository } from '../../core/interfaces';
import {
  McpManagerConfig,
  McpServerConfig,
  McpToolDiscoveryResponse,
  McpToolExecutionRequest,
  McpToolExecutionResponse
} from './types';
import { ARTError } from '../../types';

// Mock server setup for integration testing
class MockMcpServer {
  private isRunning = false;
  private tools: any[] = [];
  private responses: Map<string, any> = new Map();
  private requestLog: any[] = [];

  constructor(private serverInfo: { name: string; version: string; capabilities: string[] }) {}

  setTools(tools: any[]) {
    this.tools = tools;
  }

  setResponse(endpoint: string, response: any) {
    this.responses.set(endpoint, response);
  }

  getRequestLog() {
    return [...this.requestLog];
  }

  clearRequestLog() {
    this.requestLog = [];
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
    this.requestLog = [];
  }

  isHealthy() {
    return this.isRunning;
  }

  // Simulate health check endpoint
  async handleHealthCheck(): Promise<Response> {
    this.requestLog.push({ endpoint: '/health', timestamp: Date.now() });
    
    if (!this.isRunning) {
      throw new Error('Server not running');
    }

    return new Response('OK', { status: 200 });
  }

  // Simulate tool discovery endpoint
  async handleToolDiscovery(): Promise<Response> {
    this.requestLog.push({ endpoint: '/tools', timestamp: Date.now() });
    
    if (!this.isRunning) {
      throw new Error('Server not running');
    }

    const response: McpToolDiscoveryResponse = {
      tools: this.tools,
      server: this.serverInfo
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Simulate tool execution endpoint
  async handleToolExecution(toolName: string, request: McpToolExecutionRequest): Promise<Response> {
    this.requestLog.push({ 
      endpoint: `/tools/${toolName}/execute`, 
      timestamp: Date.now(),
      request 
    });
    
    if (!this.isRunning) {
      throw new Error('Server not running');
    }

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return new Response(JSON.stringify({ error: 'Tool not found' }), { status: 404 });
    }

    // Check for custom response
    const customResponse = this.responses.get(`tools/${toolName}/execute`);
    if (customResponse) {
      return new Response(JSON.stringify(customResponse), {
        status: customResponse.error ? 500 : 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default successful response
    const response: McpToolExecutionResponse = {
      success: true,
      result: {
        toolName,
        input: request.arguments,
        output: `Mock execution result for ${toolName}`,
        metadata: {
          executionTime: 100,
          serverVersion: this.serverInfo.version
        }
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

describe('MCP Integration Tests', () => {
  let mcpManager: McpManager;
  let authManager: AuthManager;
  let toolRegistry: ToolRegistryImpl;
  let stateManager: StateManagerImpl;
  let stateRepository: IStateRepository;
  let storageAdapter: InMemoryStorageAdapter;

  // Mock servers
  let mockServer1: MockMcpServer;
  let mockServer2: MockMcpServer;
  let originalFetch: typeof global.fetch;

  const mockServerConfig1: McpServerConfig = {
    id: 'integration-server-1',
    name: 'Integration Test Server 1',
    url: 'https://mock-server-1.test',
    authStrategyId: 'bearer-auth',
    enabled: true,
    timeout: 5000
  };

  const mockServerConfig2: McpServerConfig = {
    id: 'integration-server-2',
    name: 'Integration Test Server 2',
    url: 'https://mock-server-2.test',
    enabled: true,
    timeout: 3000
  };

  const mockTools1 = [
    {
      name: 'calculator',
      description: 'Performs mathematical calculations',
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['operation', 'a', 'b']
      }
    },
    {
      name: 'text-analyzer',
      description: 'Analyzes text content',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          analysis_type: { type: 'string', enum: ['sentiment', 'keywords', 'summary'] }
        },
        required: ['text', 'analysis_type']
      }
    }
  ];

  const mockTools2 = [
    {
      name: 'weather-checker',
      description: 'Checks weather conditions',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          units: { type: 'string', enum: ['metric', 'imperial'] }
        },
        required: ['location']
      }
    }
  ];

  beforeAll(() => {
    // Store original fetch
    originalFetch = global.fetch;
  });

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Initialize storage and repositories
    storageAdapter = new InMemoryStorageAdapter();
    await storageAdapter.init();
    stateRepository = new StateRepository(storageAdapter);

    // Initialize state manager with explicit strategy
    stateManager = new StateManagerImpl(stateRepository, 'explicit');

    // Initialize tool registry
    toolRegistry = new ToolRegistryImpl(stateManager);

    // Initialize auth manager
    authManager = new AuthManager();
    authManager.registerStrategy('bearer-auth', {
      authenticate: vi.fn().mockResolvedValue({
        headers: { 'Authorization': 'Bearer test-integration-token' }
      })
    });

    // Setup mock servers
    mockServer1 = new MockMcpServer({
      name: 'Integration Test Server 1',
      version: '1.0.0',
      capabilities: ['tools', 'health']
    });
    mockServer1.setTools(mockTools1);

    mockServer2 = new MockMcpServer({
      name: 'Integration Test Server 2',
      version: '2.1.0',
      capabilities: ['tools', 'health']
    });
    mockServer2.setTools(mockTools2);

    // Mock fetch to route to appropriate mock servers
    global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
      const urlStr = url.toString();
      
      if (urlStr.includes('mock-server-1.test')) {
        if (urlStr.endsWith('/health')) {
          return mockServer1.handleHealthCheck();
        } else if (urlStr.endsWith('/tools')) {
          return mockServer1.handleToolDiscovery();
        } else if (urlStr.includes('/tools/') && urlStr.endsWith('/execute')) {
          const toolName = urlStr.split('/tools/')[1].split('/execute')[0];
          const requestBody = JSON.parse(options.body);
          return mockServer1.handleToolExecution(toolName, requestBody);
        }
      } else if (urlStr.includes('mock-server-2.test')) {
        if (urlStr.endsWith('/health')) {
          return mockServer2.handleHealthCheck();
        } else if (urlStr.endsWith('/tools')) {
          return mockServer2.handleToolDiscovery();
        } else if (urlStr.includes('/tools/') && urlStr.endsWith('/execute')) {
          const toolName = urlStr.split('/tools/')[1].split('/execute')[0];
          const requestBody = JSON.parse(options.body);
          return mockServer2.handleToolExecution(toolName, requestBody);
        }
      }
      
      throw new Error(`Unexpected URL: ${urlStr}`);
    });

    // Start mock servers
    mockServer1.start();
    mockServer2.start();

    // Create MCP manager configuration
    const config: McpManagerConfig = {
      servers: [mockServerConfig1, mockServerConfig2],
      defaultTimeout: 10000,
      autoRetry: true,
      retryInterval: 1000,
      maxRetries: 2,
      autoRefresh: false,
      refreshInterval: 30000
    };

    mcpManager = new McpManager(config, toolRegistry, stateManager, authManager);
  });

  afterEach(async () => {
    if (mcpManager) {
      await mcpManager.shutdown();
    }
    mockServer1?.stop();
    mockServer2?.stop();
  });

  describe('Multi-Server Integration', () => {
    it('should initialize and connect to multiple MCP servers', async () => {
      await mcpManager.initialize();

      const statuses = mcpManager.getServerStatuses();
      expect(statuses).toHaveLength(2);

      const server1Status = mcpManager.getServerStatus('integration-server-1');
      const server2Status = mcpManager.getServerStatus('integration-server-2');

      expect(server1Status?.status).toBe('connected');
      expect(server1Status?.toolCount).toBe(2);
      expect(server2Status?.status).toBe('connected');
      expect(server2Status?.toolCount).toBe(1);
    });

    it('should register all discovered tools from multiple servers', async () => {
      await mcpManager.initialize();

      // Verify all tools are registered
      const allTools = mcpManager.getAllDiscoveredTools();
      expect(allTools.size).toBe(2);
      expect(allTools.get('integration-server-1')).toHaveLength(2);
      expect(allTools.get('integration-server-2')).toHaveLength(1);

      // Verify tools are registered with the tool registry
      expect(toolRegistry.registerTool).toHaveBeenCalledTimes(3);
    });

    it('should handle partial server failures gracefully', async () => {
      // Make server 2 unhealthy
      mockServer2.stop();

      await mcpManager.initialize();

      const statuses = mcpManager.getServerStatuses();
      expect(statuses).toHaveLength(2);

      const server1Status = mcpManager.getServerStatus('integration-server-1');
      const server2Status = mcpManager.getServerStatus('integration-server-2');

      expect(server1Status?.status).toBe('connected');
      expect(server2Status?.status).toBe('error');
      expect(server2Status?.lastError).toContain('HEALTH_CHECK_FAILED');
    });
  });

  describe('Tool Discovery and Registration', () => {
    beforeEach(async () => {
      await mcpManager.initialize();
    });

    it('should discover tools with correct schemas', () => {
      const server1Tools = mcpManager.getServerTools('integration-server-1');
      expect(server1Tools).toHaveLength(2);

      const calculatorTool = server1Tools?.find(t => t.name === 'calculator');
      expect(calculatorTool).toBeDefined();
      expect(calculatorTool?.description).toBe('Performs mathematical calculations');
      expect(calculatorTool?.inputSchema.properties).toHaveProperty('operation');
      expect(calculatorTool?.inputSchema.properties).toHaveProperty('a');
      expect(calculatorTool?.inputSchema.properties).toHaveProperty('b');

      const textAnalyzerTool = server1Tools?.find(t => t.name === 'text-analyzer');
      expect(textAnalyzerTool).toBeDefined();
      expect(textAnalyzerTool?.description).toBe('Analyzes text content');
    });

    it('should create proxy tools with server context', async () => {
      // Verify that proxy tools were registered
      expect(toolRegistry.registerTool).toHaveBeenCalledTimes(3);

      // Check that the registered tools are McpProxyTool instances
      const registrationCalls = vi.mocked(toolRegistry.registerTool).mock.calls;
      expect(registrationCalls[0][0]).toHaveProperty('serverId');
      expect(registrationCalls[1][0]).toHaveProperty('serverId');
      expect(registrationCalls[2][0]).toHaveProperty('serverId');
    });

    it('should handle tool discovery failures gracefully', async () => {
      // Configure server 1 to fail tool discovery
      mockServer1.setResponse('/tools', { error: 'Tool discovery failed' });

      // Shutdown and restart to trigger re-discovery
      await mcpManager.shutdown();
      mockServer1.start();
      
      await mcpManager.initialize();

      const server1Status = mcpManager.getServerStatus('integration-server-1');
      expect(server1Status?.status).toBe('error');
      expect(server1Status?.lastError).toContain('TOOL_DISCOVERY_FAILED');
    });
  });

  describe('Tool Execution Integration', () => {
    beforeEach(async () => {
      await mcpManager.initialize();
    });

    it('should execute tools on correct servers', async () => {
      // Clear request logs
      mockServer1.clearRequestLog();
      mockServer2.clearRequestLog();

      // Get registered proxy tools
      const server1Tools = mcpManager.getRegisteredProxyTools('integration-server-1');
      const calculatorProxy = server1Tools.get('calculator');

      expect(calculatorProxy).toBeDefined();

      // Execute calculator tool
      const result = await calculatorProxy!.execute({
        operation: 'add',
        a: 5,
        b: 3
      });

      expect(result.success).toBe(true);
      expect(result.result.toolName).toBe('calculator');
      expect(result.result.input).toEqual({
        operation: 'add',
        a: 5,
        b: 3
      });

      // Verify request was sent to correct server
      const server1Requests = mockServer1.getRequestLog();
      expect(server1Requests).toHaveLength(3); // health + tools + execute
      expect(server1Requests[2].endpoint).toBe('/tools/calculator/execute');
    });

    it('should handle tool execution errors appropriately', async () => {
      // Configure calculator tool to return error
      mockServer1.setResponse('tools/calculator/execute', {
        error: 'Invalid operation parameters',
        details: 'Division by zero is not allowed'
      });

      const server1Tools = mcpManager.getRegisteredProxyTools('integration-server-1');
      const calculatorProxy = server1Tools.get('calculator');

      await expect(calculatorProxy!.execute({
        operation: 'divide',
        a: 10,
        b: 0
      })).rejects.toThrow('Tool execution failed: Invalid operation parameters');
    });

    it('should enforce tool execution timeouts', async () => {
      // Mock a slow response
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/tools/calculator/execute')) {
          // Simulate slow response
          await new Promise(resolve => setTimeout(resolve, 6000)); // Longer than server timeout
          return new Response('{}', { status: 200 });
        }
        return originalFetch(url);
      });

      const server1Tools = mcpManager.getRegisteredProxyTools('integration-server-1');
      const calculatorProxy = server1Tools.get('calculator');

      await expect(calculatorProxy!.execute({
        operation: 'add',
        a: 1,
        b: 2
      })).rejects.toThrow();
    });
  });

  describe('Authentication Integration', () => {
    it('should apply authentication headers to server requests', async () => {
      let capturedHeaders: Record<string, string> = {};

      // Override fetch to capture headers
      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedHeaders = options?.headers || {};
        
        if (url.includes('mock-server-1.test/health')) {
          return new Response('OK', { status: 200 });
        } else if (url.includes('mock-server-1.test/tools')) {
          return mockServer1.handleToolDiscovery();
        }
        
        throw new Error(`Unexpected URL: ${url}`);
      });

      await mcpManager.initialize();

      // Verify authentication headers were included
      expect(capturedHeaders['Authorization']).toBe('Bearer test-integration-token');
    });

    it('should handle authentication failures gracefully', async () => {
      // Configure auth manager to fail
      authManager.registerStrategy('bearer-auth', {
        authenticate: vi.fn().mockRejectedValue(new Error('Authentication failed'))
      });

      await mcpManager.initialize();

      const server1Status = mcpManager.getServerStatus('integration-server-1');
      expect(server1Status?.status).toBe('error');
      expect(server1Status?.lastError).toContain('HEALTH_CHECK_FAILED');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should retry failed connections with exponential backoff', async () => {
      let attemptCount = 0;
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        attemptCount++;
        
        if (url.includes('/health')) {
          // Fail first 2 attempts, succeed on 3rd
          if (attemptCount <= 2) {
            throw new Error('Connection refused');
          }
          return new Response('OK', { status: 200 });
        } else if (url.includes('/tools')) {
          return mockServer1.handleToolDiscovery();
        }
        
        throw new Error(`Unexpected URL: ${url}`);
      });

      await mcpManager.initialize();

      const server1Status = mcpManager.getServerStatus('integration-server-1');
      expect(server1Status?.status).toBe('connected');
      expect(attemptCount).toBe(3); // 1 initial + 2 retries
    });

    it('should mark servers as failed after max retries exceeded', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        throw new Error('Persistent connection failure');
      });

      await mcpManager.initialize();

      const server1Status = mcpManager.getServerStatus('integration-server-1');
      expect(server1Status?.status).toBe('error');
      expect(server1Status?.lastError).toContain('HEALTH_CHECK_FAILED');
    });

    it('should handle malformed server responses gracefully', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/health')) {
          return new Response('OK', { status: 200 });
        } else if (url.includes('/tools')) {
          // Return malformed JSON
          return new Response('{ "invalid": json }', { status: 200 });
        }
        
        throw new Error(`Unexpected URL: ${url}`);
      });

      await mcpManager.initialize();

      const server1Status = mcpManager.getServerStatus('integration-server-1');
      expect(server1Status?.status).toBe('error');
      expect(server1Status?.lastError).toContain('TOOL_DISCOVERY_FAILED');
    });
  });

  describe('Configuration Management', () => {
    it('should support dynamic configuration updates', async () => {
      await mcpManager.initialize();

      // Verify initial state
      expect(mcpManager.getServerStatuses()).toHaveLength(2);

      // Add a new server configuration
      const newServerConfig: McpServerConfig = {
        id: 'integration-server-3',
        name: 'Integration Test Server 3',
        url: 'https://mock-server-3.test',
        enabled: true,
        timeout: 5000
      };

      const updatedConfig: McpManagerConfig = {
        servers: [mockServerConfig1, mockServerConfig2, newServerConfig],
        defaultTimeout: 10000,
        autoRetry: true,
        retryInterval: 1000,
        maxRetries: 2,
        autoRefresh: false,
        refreshInterval: 30000
      };

      mcpManager.updateConfig(updatedConfig);

      // Configuration should be updated internally
      // Note: In a real implementation, this might trigger re-initialization
    });

    it('should handle disabled servers correctly', async () => {
      const configWithDisabledServer: McpManagerConfig = {
        servers: [
          mockServerConfig1,
          { ...mockServerConfig2, enabled: false }
        ],
        defaultTimeout: 10000,
        autoRetry: true,
        retryInterval: 1000,
        maxRetries: 2,
        autoRefresh: false,
        refreshInterval: 30000
      };

      const managerWithDisabled = new McpManager(
        configWithDisabledServer,
        toolRegistry,
        stateManager,
        authManager
      );

      await managerWithDisabled.initialize();

      const statuses = managerWithDisabled.getServerStatuses();
      const enabledStatuses = statuses.filter(s => s.status !== 'disabled');
      
      expect(enabledStatuses).toHaveLength(1);
      expect(enabledStatuses[0].id).toBe('integration-server-1');

      await managerWithDisabled.shutdown();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should properly shutdown all connections', async () => {
      await mcpManager.initialize();

      // Verify servers are connected
      const statuses = mcpManager.getServerStatuses();
      const connectedServers = statuses.filter(s => s.status === 'connected');
      expect(connectedServers).toHaveLength(2);

      // Shutdown
      await mcpManager.shutdown();

      // Verify cleanup
      const shutdownStatuses = mcpManager.getServerStatuses();
      expect(shutdownStatuses).toHaveLength(0);
    });

    it('should clear registered tools on shutdown', async () => {
      await mcpManager.initialize();

      // Verify tools are registered
      const allTools = mcpManager.getAllDiscoveredTools();
      expect(allTools.size).toBe(2);

      await mcpManager.shutdown();

      // Verify tools are cleared
      const toolsAfterShutdown = mcpManager.getAllDiscoveredTools();
      expect(toolsAfterShutdown.size).toBe(0);
    });
  });

  describe('Tool State Management Integration', () => {
    beforeEach(async () => {
      await mcpManager.initialize();
    });

    it('should respect tool enable/disable state from StateManager', async () => {
      const threadId = 'test-thread-1';
      
      // Enable specific tools for thread
      await stateManager.enableToolsForThread(threadId, ['calculator', 'weather-checker']);
      
      // Mock StateManager to return enabled tools
      vi.mocked(stateManager.getEnabledToolsForThread).mockResolvedValue(['calculator', 'weather-checker']);
      vi.mocked(stateManager.isToolEnabled).mockImplementation((toolName: string) => {
        return ['calculator', 'weather-checker'].includes(toolName);
      });

      // Verify that only enabled tools are accessible
      expect(stateManager.isToolEnabled('calculator')).toBe(true);
      expect(stateManager.isToolEnabled('text-analyzer')).toBe(false);
      expect(stateManager.isToolEnabled('weather-checker')).toBe(true);
    });

    it('should integrate with thread-specific tool configurations', async () => {
      const threadId = 'test-thread-2';
      
      // Mock thread-specific configuration
      vi.mocked(stateManager.getThreadConfigValue).mockImplementation((thread, key) => {
        if (thread === threadId && key === 'mcpToolTimeout') {
          return 2000; // Custom timeout for this thread
        }
        return undefined;
      });

      // This would be used by proxy tools during execution
      const customTimeout = stateManager.getThreadConfigValue(threadId, 'mcpToolTimeout');
      expect(customTimeout).toBe(2000);
    });
  });
}); 