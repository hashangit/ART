import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors';
import { AuthManager } from '../../systems/auth/AuthManager';

/**
 * JSON-RPC 2.0 message types for MCP communication
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

/**
 * MCP transport configuration
 */
export interface McpTransportConfig {
  type: 'stdio' | 'sse' | 'http';
  // For stdio transport
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  // For SSE/HTTP transport
  url?: string;
  authStrategyId?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * MCP server capabilities
 */
export interface McpServerCapabilities {
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
  sampling?: Record<string, unknown>;
}

/**
 * MCP server information
 */
export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
  capabilities?: McpServerCapabilities;
}

/**
 * MCP tool definition (from MCP server)
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: any; // JSON Schema for tool input
}

/**
 * MCP resource definition
 */
export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP prompt definition
 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP client implementation that communicates with MCP servers using JSON-RPC 2.0
 * over stdio or SSE/HTTP transports as specified in the Model Context Protocol.
 */
export class McpClient extends EventEmitter {
  private config: McpTransportConfig;
  private authManager?: AuthManager;
  
  // Connection state
  private connected: boolean = false;
  private nextRequestId: number = 1;
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  // Transport-specific state
  private childProcess?: ChildProcess;
  private eventSource?: EventSource;
  private httpUrl?: string;
  private serverInfo?: McpServerInfo;

  constructor(config: McpTransportConfig, authManager?: AuthManager) {
    super();
    this.config = config;
    this.authManager = authManager;
  }

  /**
   * Connects to the MCP server using the configured transport
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new ARTError('MCP client is already connected', ErrorCode.ALREADY_CONNECTED);
    }

    Logger.info(`McpClient: Connecting using ${this.config.type} transport...`);

    try {
      switch (this.config.type) {
        case 'stdio':
          await this._connectStdio();
          break;
        case 'sse':
          await this._connectSSE();
          break;
        case 'http':
          await this._connectHTTP();
          break;
        default:
          throw new ARTError('UNSUPPORTED_TRANSPORT', `Unsupported transport type: ${this.config.type}`);
      }

      // Perform MCP initialization handshake
      await this._initialize();
      
      this.connected = true;
      this.emit('connected');
      Logger.info('McpClient: Successfully connected and initialized');
    } catch (error: any) {
      Logger.error(`McpClient: Connection failed: ${error.message}`);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Disconnects from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    Logger.info('McpClient: Disconnecting...');

    // Clear pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    // Close transport
    if (this.childProcess) {
      this.childProcess.kill('SIGTERM');
      this.childProcess = undefined;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }

    this.connected = false;
    this.serverInfo = undefined;
    this.emit('disconnected');
    Logger.info('McpClient: Disconnected');
  }

  /**
   * Sends a ping to the MCP server
   */
  async ping(): Promise<void> {
    await this._sendRequest('ping', {});
    Logger.debug('McpClient: Ping successful');
  }

  /**
   * Lists available tools from the MCP server
   */
  async listTools(): Promise<McpTool[]> {
    const result = await this._sendRequest('tools/list', {});
    return result.tools || [];
  }

  /**
   * Calls a tool on the MCP server
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    const result = await this._sendRequest('tools/call', {
      name,
      arguments: arguments_
    });
    return result;
  }

  /**
   * Lists available resources from the MCP server
   */
  async listResources(): Promise<McpResource[]> {
    const result = await this._sendRequest('resources/list', {});
    return result.resources || [];
  }

  /**
   * Reads a resource from the MCP server
   */
  async readResource(uri: string): Promise<any> {
    const result = await this._sendRequest('resources/read', { uri });
    return result;
  }

  /**
   * Lists available prompts from the MCP server
   */
  async listPrompts(): Promise<McpPrompt[]> {
    const result = await this._sendRequest('prompts/list', {});
    return result.prompts || [];
  }

  /**
   * Gets a prompt from the MCP server
   */
  async getPrompt(name: string, arguments_?: Record<string, any>): Promise<any> {
    const result = await this._sendRequest('prompts/get', {
      name,
      arguments: arguments_
    });
    return result;
  }

  /**
   * Gets server information
   */
  getServerInfo(): McpServerInfo | undefined {
    return this.serverInfo;
  }

  /**
   * Checks if the client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ========== Private Methods ==========

  /**
   * Connects using stdio transport
   * @private
   */
  private async _connectStdio(): Promise<void> {
    if (!this.config.command) {
      throw new ARTError('Command is required for stdio transport', ErrorCode.MISSING_CONFIG);
    }

    Logger.debug(`McpClient: Spawning process: ${this.config.command} ${this.config.args?.join(' ') || ''}`);

    this.childProcess = spawn(this.config.command, this.config.args || [], {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle process events
    this.childProcess.on('error', (error) => {
      Logger.error(`McpClient: Process error: ${error.message}`);
      this.emit('error', error);
    });

    this.childProcess.on('close', (code) => {
      Logger.debug(`McpClient: Process closed with code ${code}`);
      this.connected = false;
      this.emit('disconnected');
    });

    // Handle stderr for logging
    this.childProcess.stderr?.on('data', (data) => {
      Logger.debug(`McpClient: Process stderr: ${data.toString()}`);
    });

    // Handle stdout for JSON-RPC messages
    let buffer = '';
    this.childProcess.stdout?.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            const message = JSON.parse(trimmed) as JsonRpcMessage;
            this._handleMessage(message);
          } catch (error) {
            Logger.error(`McpClient: Failed to parse JSON-RPC message: ${trimmed}`);
          }
        }
      }
    });

    // Wait for process to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Process startup timeout'));
      }, 5000);

      this.childProcess!.once('spawn', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.childProcess!.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Connects using SSE transport
   * @private
   */
  private async _connectSSE(): Promise<void> {
    if (!this.config.url) {
      throw new ARTError('URL is required for SSE transport', ErrorCode.MISSING_CONFIG);
    }

    const headers: Record<string, string> = { ...this.config.headers };

    // Add authentication headers if needed
    if (this.config.authStrategyId && this.authManager) {
      const authHeaders = await this.authManager.getHeaders(this.config.authStrategyId);
      Object.assign(headers, authHeaders);
    }

    // Create EventSource for receiving messages
    // Note: EventSource doesn't support custom headers in standard implementation
    // Authentication would need to be handled via URL parameters or cookies
    this.eventSource = new EventSource(this.config.url);

    this.httpUrl = this.config.url.replace('/sse', '/messages'); // Assume messages endpoint

    this.eventSource.onopen = () => {
      Logger.debug('McpClient: SSE connection opened');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as JsonRpcMessage;
        this._handleMessage(message);
      } catch (error) {
        Logger.error(`McpClient: Failed to parse SSE message: ${event.data}`);
      }
    };

    this.eventSource.onerror = (error) => {
      Logger.error('McpClient: SSE error:', error);
      this.emit('error', new Error('SSE connection error'));
    };

    // Wait for connection to be established
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SSE connection timeout'));
      }, 5000);

      this.eventSource!.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.eventSource!.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('SSE connection failed'));
      });
    });
  }

  /**
   * Connects using HTTP transport (for future use)
   * @private
   */
  private async _connectHTTP(): Promise<void> {
    // HTTP transport would be implemented here for bidirectional communication
    // This is a placeholder for future HTTP transport implementation
    throw new ARTError('HTTP transport not yet implemented', ErrorCode.NOT_IMPLEMENTED);
  }

  /**
   * Performs MCP initialization handshake
   * @private
   */
  private async _initialize(): Promise<void> {
    Logger.debug('McpClient: Starting MCP initialization...');

    // Send initialization request
    const result = await this._sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        resources: { subscribe: true },
        tools: {},
        prompts: {},
        logging: {}
      },
      clientInfo: {
        name: 'ART Framework MCP Client',
        version: '1.0.0'
      }
    });

    this.serverInfo = {
      name: result.serverInfo?.name || 'Unknown',
      version: result.serverInfo?.version || 'Unknown',
      protocolVersion: result.protocolVersion,
      capabilities: result.capabilities
    };

    Logger.debug(`McpClient: Initialized with server "${this.serverInfo.name}" v${this.serverInfo.version}`);

    // Send initialized notification to complete handshake
    await this._sendNotification('notifications/initialized', {});
  }

  /**
   * Sends a JSON-RPC request and waits for response
   * @private
   */
  private async _sendRequest(method: string, params: any, timeout: number = 30000): Promise<any> {
    if (!this.connected && method !== 'initialize') {
      throw new ARTError('MCP client is not connected', ErrorCode.NOT_CONNECTED);
    }

    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new ARTError(`Request ${method} timed out after ${timeout}ms`, ErrorCode.REQUEST_TIMEOUT));
      }, timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout: timer });

      this._sendMessage(request).catch((error) => {
        this.pendingRequests.delete(id);
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Sends a JSON-RPC notification (no response expected)
   * @private
   */
  private async _sendNotification(method: string, params: any): Promise<void> {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params
    };

    await this._sendMessage(notification);
  }

  /**
   * Sends a JSON-RPC message over the configured transport
   * @private
   */
  private async _sendMessage(message: JsonRpcMessage): Promise<void> {
    const serialized = JSON.stringify(message);
    Logger.debug(`McpClient: Sending message: ${'method' in message ? message.method : 'response'}`);

    switch (this.config.type) {
      case 'stdio':
        if (!this.childProcess?.stdin) {
          throw new ARTError('Child process stdin not available', ErrorCode.NO_STDIN);
        }
        this.childProcess.stdin.write(serialized + '\n');
        break;

      case 'sse': {
        if (!this.httpUrl) {
          throw new ARTError('HTTP URL not configured for SSE transport', ErrorCode.NO_HTTP_URL);
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...this.config.headers
        };

        // Add authentication headers if needed
        if (this.config.authStrategyId && this.authManager) {
          const authHeaders = await this.authManager.getHeaders(this.config.authStrategyId);
          Object.assign(headers, authHeaders);
        }

        const response = await fetch(this.httpUrl, {
          method: 'POST',
          headers,
          body: serialized
        });

        if (!response.ok) {
          throw new ARTError(`HTTP request failed: ${response.status} ${response.statusText}`, ErrorCode.HTTP_ERROR);
        }
        break;
      }

      case 'http':
        throw new ARTError('HTTP transport not yet implemented', ErrorCode.NOT_IMPLEMENTED);

      default:
        throw new ARTError('UNSUPPORTED_TRANSPORT', `Unsupported transport: ${this.config.type}`);
    }
  }

  /**
   * Handles incoming JSON-RPC messages
   * @private
   */
  private _handleMessage(message: JsonRpcMessage): void {
    Logger.debug(`McpClient: Received message: ${JSON.stringify(message).substring(0, 200)}...`);

    // Handle responses
    if ('id' in message && ('result' in message || 'error' in message)) {
      const response = message as JsonRpcResponse;
      const pending = this.pendingRequests.get(response.id);
      
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(new ARTError(
            `MCP server error: ${response.error.message}`,
            ErrorCode.EXTERNAL_SERVICE_ERROR
          ));
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    // Handle notifications
    if ('method' in message && !('id' in message)) {
      const notification = message as JsonRpcNotification;
      this.emit('notification', notification.method, notification.params);
      
      // Handle specific notification types
      switch (notification.method) {
        case 'notifications/message':
          this.emit('message', notification.params);
          break;
        case 'notifications/resources/list_changed':
          this.emit('resourcesChanged');
          break;
        case 'notifications/tools/list_changed':
          this.emit('toolsChanged');
          break;
        case 'notifications/prompts/list_changed':
          this.emit('promptsChanged');
          break;
      }
      return;
    }

    // Handle requests (for sampling, etc.)
    if ('method' in message && 'id' in message) {
      const request = message as JsonRpcRequest;
      this.emit('request', request.method, request.params, request.id);
    }
  }
} 