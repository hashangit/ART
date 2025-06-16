import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpClient, McpTransportConfig } from './McpClient';
import { AuthManager } from '../../systems/auth/AuthManager';
import { ARTError } from '../../types';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

// Mock EventSource
class MockEventSource {
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor(public url: string, public options?: any) {}

  addEventListener(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  dispatchEvent(event: string, data?: any) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => listener(data));
    
    // Also trigger the onXXX handlers
    if (event === 'open' && this.onopen) {
      this.onopen();
    }
    if (event === 'message' && this.onmessage) {
      this.onmessage(data);
    }
    if (event === 'error' && this.onerror) {
      this.onerror(data);
    }
  }

  close() {
    // Mock close
  }
}

global.EventSource = MockEventSource as any;

// Mock fetch globally
global.fetch = vi.fn();

// Import the actual spawn after mocking
import { spawn } from 'child_process';
const mockSpawn = vi.mocked(spawn);

describe('McpClient', () => {
  let mcpClient: McpClient;
  let mockAuthManager: AuthManager;
  let mockChildProcess: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AuthManager
    mockAuthManager = {
      getHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test-token' })
    } as any;

    // Setup mock child process
    mockChildProcess = {
      stdin: {
        write: vi.fn()
      },
      stdout: {
        on: vi.fn()
      },
      stderr: {
        on: vi.fn()
      },
      on: vi.fn(),
      once: vi.fn(),
      kill: vi.fn()
    };
  });

  afterEach(async () => {
    if (mcpClient?.isConnected()) {
      await mcpClient.disconnect();
    }
  });

  describe('Constructor', () => {
    it('should create McpClient with stdio transport config', () => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js']
      };

      mcpClient = new McpClient(config);
      
      expect(mcpClient).toBeInstanceOf(McpClient);
      expect(mcpClient.isConnected()).toBe(false);
    });

    it('should create McpClient with SSE transport config', () => {
      const config: McpTransportConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse'
      };

      mcpClient = new McpClient(config, mockAuthManager);
      
      expect(mcpClient).toBeInstanceOf(McpClient);
      expect(mcpClient.isConnected()).toBe(false);
    });
  });

  describe('Connection Management - Stdio Transport', () => {
    beforeEach(() => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
        env: { TEST: 'true' }
      };
      mcpClient = new McpClient(config);
    });

    it('should connect successfully with stdio transport', async () => {
      // Setup mock spawn
      mockSpawn.mockReturnValue(mockChildProcess);
      
      // Mock successful spawn
      mockChildProcess.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'spawn') {
          setTimeout(callback, 10);
        }
      });

      // Mock stdout data handler for initialization
      let stdoutHandler: Function;
      mockChildProcess.stdout.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'data') {
          stdoutHandler = handler;
        }
      });

      // Start connection
      const connectPromise = mcpClient.connect();

      // Simulate initialization response
      setTimeout(() => {
        if (stdoutHandler) {
          stdoutHandler(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {}, resources: {} },
              serverInfo: { name: 'Test Server', version: '1.0.0' }
            }
          }) + '\n');
        }
      }, 20);

      await connectPromise;

      expect(mcpClient.isConnected()).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('node', ['server.js'], {
        cwd: undefined,
        env: { ...process.env, TEST: 'true' },
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should handle spawn errors', async () => {
      const error = new Error('Command not found');
      mockSpawn.mockReturnValue(mockChildProcess);
      
      mockChildProcess.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(error), 10);
        }
      });

      await expect(mcpClient.connect()).rejects.toThrow('Command not found');
      expect(mcpClient.isConnected()).toBe(false);
    });

    it('should handle spawn timeout', async () => {
      mockSpawn.mockReturnValue(mockChildProcess);
      
      // Don't call the spawn callback to simulate timeout
      mockChildProcess.once.mockImplementation(() => {});

      await expect(mcpClient.connect()).rejects.toThrow('Process startup timeout');
    });

    it('should disconnect properly', async () => {
      mockSpawn.mockReturnValue(mockChildProcess);
      
      mockChildProcess.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'spawn') {
          setTimeout(callback, 10);
        }
      });

      let stdoutHandler: Function;
      mockChildProcess.stdout.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'data') {
          stdoutHandler = handler;
        }
      });

      const connectPromise = mcpClient.connect();

      setTimeout(() => {
        if (stdoutHandler) {
          stdoutHandler(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              serverInfo: { name: 'Test Server', version: '1.0.0' }
            }
          }) + '\n');
        }
      }, 20);

      await connectPromise;
      
      await mcpClient.disconnect();
      
      expect(mcpClient.isConnected()).toBe(false);
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('Connection Management - SSE Transport', () => {
    beforeEach(() => {
      const config: McpTransportConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse',
        authStrategyId: 'test-auth'
      };
      mcpClient = new McpClient(config, mockAuthManager);
    });

    it('should connect successfully with SSE transport', async () => {
      let eventSource: MockEventSource;
      const originalEventSource = global.EventSource;
      
      global.EventSource = vi.fn().mockImplementation((url, options) => {
        eventSource = new MockEventSource(url, options);
        return eventSource;
      }) as any;

      // Mock fetch for sending initialize request and initialized notification 
      (global.fetch as any).mockResolvedValue({
        ok: true
      });

      const connectPromise = mcpClient.connect();

      // Simulate SSE connection opening and MCP initialization response
      setTimeout(() => {
        // First, open the SSE connection
        eventSource!.dispatchEvent('open');
        
        // Then simulate the MCP initialization response via EventSource message
        setTimeout(() => {
          eventSource!.dispatchEvent('message', {
            data: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {}, resources: {} },
                serverInfo: { name: 'Test Server', version: '1.0.0' }
              }
            })
          });
        }, 5);
      }, 10);

      await connectPromise;

      expect(mcpClient.isConnected()).toBe(true);
      expect(mockAuthManager.getHeaders).toHaveBeenCalledWith('test-auth');
      
      global.EventSource = originalEventSource;
    });

    it('should handle SSE connection errors', async () => {
      let eventSource: MockEventSource;
      const originalEventSource = global.EventSource;
      
      global.EventSource = vi.fn().mockImplementation((url, options) => {
        eventSource = new MockEventSource(url, options);
        return eventSource;
      }) as any;

      // Add error listener to prevent unhandled exceptions
      mcpClient.on('error', () => {
        // Ignore error events during test
      });

      const connectPromise = mcpClient.connect();

      setTimeout(() => {
        eventSource!.dispatchEvent('error');
      }, 10);

      await expect(connectPromise).rejects.toThrow('SSE connection failed');
      
      global.EventSource = originalEventSource;
    });

    it('should handle authentication errors', async () => {
      mockAuthManager.getHeaders = vi.fn().mockRejectedValue(new Error('Auth failed'));

      await expect(mcpClient.connect()).rejects.toThrow('Auth failed');
    });
  });

  describe('MCP Protocol Operations', () => {
    beforeEach(async () => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      mcpClient = new McpClient(config);

      // Setup successful connection
      mockSpawn.mockReturnValue(mockChildProcess);
      
      mockChildProcess.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'spawn') {
          setTimeout(callback, 10);
        }
      });

      let stdoutHandler: Function | undefined;
      mockChildProcess.stdout.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'data') {
          stdoutHandler = handler;
        }
      });

      const connectPromise = mcpClient.connect();

      setTimeout(() => {
        if (stdoutHandler) {
          stdoutHandler(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {}, resources: {}, prompts: {} },
              serverInfo: { name: 'Test Server', version: '1.0.0' }
            }
          }) + '\n');
        }
      }, 20);

      await connectPromise;

      // Store the handler that was set up during connection for later use in tests
      if (stdoutHandler) {
        (mcpClient as any)._testStdoutHandler = stdoutHandler;
      }
    });

    it('should ping server successfully', async () => {
      const pingPromise = mcpClient.ping();

      // Simulate ping response
      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {}
          }) + '\n');
        }
      }, 10);

      await expect(pingPromise).resolves.toBeUndefined();
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"method":"ping"')
      );
    });

    it('should list tools successfully', async () => {
      const toolsPromise = mcpClient.listTools();

      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              tools: [
                { name: 'test-tool', description: 'A test tool', inputSchema: {} }
              ]
            }
          }) + '\n');
        }
      }, 10);

      const tools = await toolsPromise;
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-tool');
    });

    it('should call tool successfully', async () => {
      const callPromise = mcpClient.callTool('test-tool', { input: 'test' });

      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              content: [{ type: 'text', text: 'Tool executed successfully' }]
            }
          }) + '\n');
        }
      }, 10);

      const result = await callPromise;
      expect(result.content[0].text).toBe('Tool executed successfully');
    });

    it('should handle server errors', async () => {
      const pingPromise = mcpClient.ping();

      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          }) + '\n');
        }
      }, 10);

      await expect(pingPromise).rejects.toThrow('MCP server error: Method not found');
    });

    it('should handle request timeouts', async () => {
      const pingPromise = mcpClient.ping();

      // Don't send a response to trigger timeout
      await expect(pingPromise).rejects.toThrow('Request ping timed out after 30000ms');
    }, 35000); // Longer timeout for this test

    it('should list resources successfully', async () => {
      const resourcesPromise = mcpClient.listResources();

      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              resources: [
                { uri: 'file://test.txt', name: 'test.txt', mimeType: 'text/plain' }
              ]
            }
          }) + '\n');
        }
      }, 10);

      const resources = await resourcesPromise;
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('file://test.txt');
    });

    it('should read resource successfully', async () => {
      const readPromise = mcpClient.readResource('file://test.txt');

      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              contents: [{ type: 'text', text: 'File content' }]
            }
          }) + '\n');
        }
      }, 10);

      const result = await readPromise;
      expect(result.contents[0].text).toBe('File content');
    });

    it('should list prompts successfully', async () => {
      const promptsPromise = mcpClient.listPrompts();

      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              prompts: [
                { name: 'test-prompt', description: 'A test prompt' }
              ]
            }
          }) + '\n');
        }
      }, 10);

      const prompts = await promptsPromise;
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('test-prompt');
    });

    it('should get prompt successfully', async () => {
      const promptPromise = mcpClient.getPrompt('test-prompt', { arg: 'value' });

      setTimeout(() => {
        const handler = (mcpClient as any)._testStdoutHandler;
        if (handler) {
          handler(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            result: {
              messages: [{ role: 'user', content: { type: 'text', text: 'Prompt content' } }]
            }
          }) + '\n');
        }
      }, 10);

      const result = await promptPromise;
      expect(result.messages[0].content.text).toBe('Prompt content');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      mcpClient = new McpClient(config);

      // Setup connection
      mockSpawn.mockReturnValue(mockChildProcess);
      mockChildProcess.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'spawn') {
          setTimeout(callback, 10);
        }
      });

      let stdoutHandler: Function;
      mockChildProcess.stdout.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'data') {
          stdoutHandler = handler;
          (mcpClient as any)._testStdoutHandler = handler;
        }
      });

      const connectPromise = mcpClient.connect();

      setTimeout(() => {
        if (stdoutHandler) {
          stdoutHandler(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              serverInfo: { name: 'Test Server', version: '1.0.0' }
            }
          }) + '\n');
        }
      }, 20);

      await connectPromise;
    });

    it('should handle notifications', () => {
      return new Promise<void>((resolve) => {
        mcpClient.on('notification', (method, params) => {
          expect(method).toBe('notifications/message');
          expect(params.level).toBe('info');
          resolve();
        });

      const handler = (mcpClient as any)._testStdoutHandler;
        handler(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/message',
          params: { level: 'info', data: 'Test message' }
        }) + '\n');
      });
    });

    it('should emit specific events for known notifications', () => {
      return new Promise<void>((resolve) => {
        mcpClient.on('message', (params) => {
          expect(params.level).toBe('info');
          resolve();
        });

      const handler = (mcpClient as any)._testStdoutHandler;
        handler(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/message',
          params: { level: 'info', data: 'Test message' }
        }) + '\n');
      });
    });

    it('should handle resources changed notifications', () => {
      return new Promise<void>((resolve) => {
        mcpClient.on('resourcesChanged', () => {
          resolve();
        });

      const handler = (mcpClient as any)._testStdoutHandler;
        handler(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/resources/list_changed'
        }) + '\n');
      });
    });

    it('should handle tools changed notifications', () => {
      return new Promise<void>((resolve) => {
        mcpClient.on('toolsChanged', () => {
          resolve();
        });

      const handler = (mcpClient as any)._testStdoutHandler;
        handler(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/tools/list_changed'
        }) + '\n');
      });
    });
  });

  describe('Error Conditions', () => {
    it('should reject connection if already connected', async () => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      mcpClient = new McpClient(config);

      // Mock as already connected
      (mcpClient as any).connected = true;

      await expect(mcpClient.connect()).rejects.toThrow('MCP client is already connected');
    });

    it('should reject requests when not connected', async () => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      mcpClient = new McpClient(config);

      await expect(mcpClient.ping()).rejects.toThrow('MCP client is not connected');
    });

    it('should handle unsupported transport types', async () => {
      const config: McpTransportConfig = {
        type: 'http' // Not yet implemented
      };
      mcpClient = new McpClient(config);

      await expect(mcpClient.connect()).rejects.toThrow('HTTP transport not yet implemented');
    });

    it('should handle missing configuration for stdio', async () => {
      const config: McpTransportConfig = {
        type: 'stdio'
        // Missing command
      };
      mcpClient = new McpClient(config);

      await expect(mcpClient.connect()).rejects.toThrow('Command is required for stdio transport');
    });

    it('should handle missing configuration for SSE', async () => {
      const config: McpTransportConfig = {
        type: 'sse'
        // Missing URL
      };
      mcpClient = new McpClient(config);

      await expect(mcpClient.connect()).rejects.toThrow('URL is required for SSE transport');
    });
  });

  describe('Server Information', () => {
    it('should return server info after connection', async () => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      mcpClient = new McpClient(config);

      mockSpawn.mockReturnValue(mockChildProcess);
      mockChildProcess.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'spawn') {
          setTimeout(callback, 10);
        }
      });

      let stdoutHandler: Function;
      mockChildProcess.stdout.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'data') {
          stdoutHandler = handler;
        }
      });

      const connectPromise = mcpClient.connect();

      setTimeout(() => {
        if (stdoutHandler) {
          stdoutHandler(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {}, resources: {} },
              serverInfo: { name: 'Test Server', version: '1.2.3' }
            }
          }) + '\n');
        }
      }, 20);

      await connectPromise;

      const serverInfo = mcpClient.getServerInfo();
      expect(serverInfo).toBeDefined();
      expect(serverInfo!.name).toBe('Test Server');
      expect(serverInfo!.version).toBe('1.2.3');
      expect(serverInfo!.protocolVersion).toBe('2024-11-05');
    });

    it('should return undefined server info when not connected', () => {
      const config: McpTransportConfig = {
        type: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      mcpClient = new McpClient(config);

      expect(mcpClient.getServerInfo()).toBeUndefined();
    });
  });
}); 