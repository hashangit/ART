import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors';
import { AuthManager } from '../../systems/auth/AuthManager';

// --- JSON-RPC and MCP Interfaces ---

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

export interface McpTransportConfig {
  type: 'streamable-http';
  url: string;
  authStrategyId?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

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

export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
  capabilities?: McpServerCapabilities;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

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
 * MCP client implementation for the browser, using the Streamable HTTP transport.
 */
export class McpClient {
  private config: McpTransportConfig;
  private authManager?: AuthManager;

  // Event handling
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  // Connection state
  private connected: boolean = false;
  private nextRequestId: number = 1;
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: any;
  }> = new Map();

  // Streamable HTTP state
  private requestWriter?: WritableStreamDefaultWriter<Uint8Array>;
  private responseReader?: ReadableStreamDefaultReader<Uint8Array>;
  private serverInfo?: McpServerInfo;

  constructor(config: McpTransportConfig, authManager?: AuthManager) {
    this.config = config;
    this.authManager = authManager;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new ARTError('MCP client is already connected', ErrorCode.ALREADY_CONNECTED);
    }

    Logger.info(`McpClient: Connecting using ${this.config.type} transport...`);

    try {
      await this._connectStreamableHttp();
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

  async disconnect(): Promise<void> {
    if (!this.connected && !this.requestWriter) {
      return;
    }

    Logger.info('McpClient: Disconnecting...');

    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    if (this.requestWriter) {
      try {
        await this.requestWriter.close();
      } catch (e) { /* Ignore */ }
      this.requestWriter = undefined;
    }

    if (this.responseReader) {
        try {
            await this.responseReader.cancel();
        } catch(e) { /* Ignore */ }
        this.responseReader = undefined;
    }

    this.connected = false;
    this.serverInfo = undefined;
    this.emit('disconnected');
    Logger.info('McpClient: Disconnected');
  }

  async ping(): Promise<void> {
    await this._sendRequest('ping', {});
    Logger.debug('McpClient: Ping successful');
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this._sendRequest('tools/list', {});
    return result.tools || [];
  }

  async callTool(name: string, args: any): Promise<any> {
    return this._sendRequest('tools/call', { name, arguments: args });
  }

  async listResources(): Promise<McpResource[]> {
    const result = await this._sendRequest('resources/list', {});
    return result.resources || [];
  }

  async readResource(uri: string): Promise<any> {
    return this._sendRequest('resources/read', { uri });
  }

  async listPrompts(): Promise<McpPrompt[]> {
    const result = await this._sendRequest('prompts/list', {});
    return result.prompts || [];
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
    return this._sendRequest('prompts/get', { name, arguments: args });
  }

  getServerInfo(): McpServerInfo | undefined {
    return this.serverInfo;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // --- Event Emitter Implementation ---
  
  public on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return this;
  }

  public off(event: string, listener: (...args: any[]) => void): this {
    if (this.listeners.has(event)) {
      const eventListeners = this.listeners.get(event)!.filter(l => l !== listener);
      this.listeners.set(event, eventListeners);
    }
    return this;
  }

  private emit(event: string, ...args: any[]): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(listener => listener(...args));
    }
  }

  // ========== Private Methods ==========

  private async _connectStreamableHttp(): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.headers,
    };

    // Preflight auth: if a strategy is configured but user is not authenticated, initiate login in a new tab
    let loginAttempted = false;
    if (this.config.authStrategyId && this.authManager) {
      Logger.debug(`McpClient: Preflight auth check using strategy '${this.config.authStrategyId}'`);
      const isAuthed = await this.authManager.isAuthenticated(this.config.authStrategyId);
      if (!isAuthed) {
        loginAttempted = true;
        try {
          Logger.info('McpClient: Not authenticated. Initiating PKCE login flow...');
          await this.authManager.login(this.config.authStrategyId);
        } catch (e) {
          throw new ARTError('Authentication required. Login failed to start.', ErrorCode.NETWORK_ERROR, e as Error);
        }
        // Stop here; caller should retry after login completes
        throw new ARTError('Authentication required. Login initiated.', ErrorCode.NOT_CONNECTED);
      }

      const authHeaders = await this.authManager.getHeaders(this.config.authStrategyId);
      Logger.debug('McpClient: Retrieved auth headers for request.');
      Object.assign(headers, authHeaders);
    }

    // Create the request stream up-front so we can write immediately after fetch returns
    const requestStream = new TransformStream();
    this.requestWriter = requestStream.writable.getWriter();

    try {
      Logger.debug(`McpClient: Issuing fetch to '${this.config.url}' with stream body...`);
      const responsePromise = fetch(this.config.url, {
        method: 'POST',
        headers,
        body: requestStream.readable,
        // @ts-expect-error - duplex is a standard but not yet fully typed option in all environments
        duplex: 'half',
      });

      // Immediately send initialize frame without waiting for response headers
      await this._sendMessage({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {
        protocolVersion: '2025-03-26',
        capabilities: { resources: { subscribe: true }, tools: {}, prompts: {} },
        clientInfo: { name: 'ART Framework MCP Client', version: '1.0.0' }
      }} as any);

      const response = await responsePromise;
      Logger.debug(`McpClient: Fetch returned status=${response.status} ${response.statusText}, hasBody=${!!response.body}`);

      if (response.status === 401 && this.config.authStrategyId && this.authManager && !loginAttempted) {
        try {
          await this.authManager.login(this.config.authStrategyId);
        } catch (e) {
          throw new ARTError('Authentication required. Login failed to start after 401.', ErrorCode.NETWORK_ERROR, e as Error);
        }
        throw new ARTError('Authentication required. Login initiated after 401.', ErrorCode.NOT_CONNECTED);
      }

      if (!response.ok || !response.body) {
        throw new ARTError(`Streamable HTTP connection failed: ${response.status} ${response.statusText}`, ErrorCode.NETWORK_ERROR);
      }

      this.responseReader = response.body.getReader();
      Logger.debug('McpClient: Response body reader acquired. Starting listener.');
      this._listenForMessages(this.responseReader);

      // initialize already sent before awaiting response headers

    } catch (error) {
      Logger.error('McpClient: fetch error during connection:', error);
      throw new ARTError('Failed to establish Streamable HTTP connection.', ErrorCode.NETWORK_ERROR, error as Error);
    }
  }

  private async _listenForMessages(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';
    let firstChunkLogged = false;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          Logger.info('McpClient: Response stream closed.');
          this.disconnect();
          break;
        }

        if (!firstChunkLogged && value && value.byteLength) {
          firstChunkLogged = true;
          const preview = new TextDecoder().decode(value.slice(0, Math.min(120, value.byteLength)));
          Logger.debug(`McpClient: First bytes received (${value.byteLength}B): ${preview.replace(/\n/g, '\\n').substring(0, 200)}...`);
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line.trim()) as JsonRpcMessage;
              if ((message as any).method) {
                Logger.debug(`McpClient: Dispatching JSON-RPC method='${(message as any).method}'`);
              }
              this._handleMessage(message);
            } catch (error) {
              Logger.error(`McpClient: Failed to parse JSON-RPC message: ${line}`);
            }
          }
        }
      }
    } catch (error) {
      Logger.error('McpClient: Error reading from response stream:', error);
      this.emit('error', error);
      this.disconnect();
    }
  }

  private async _initialize(): Promise<void> {
    Logger.debug('McpClient: Starting MCP initialization...');
    const result = await this._sendRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {
        resources: { subscribe: true },
        tools: {},
        prompts: {},
      },
      clientInfo: {
        name: 'ART Framework MCP Client',
        version: '1.0.0' // Replace with dynamic version if available
      }
    });

    this.serverInfo = {
      name: result.serverInfo?.name || 'Unknown',
      version: result.serverInfo?.version || 'Unknown',
      protocolVersion: result.protocolVersion,
      capabilities: result.capabilities
    };

    Logger.debug(`McpClient: Initialized with server "${this.serverInfo.name}" v${this.serverInfo.version}`);
    await this._sendNotification('notifications/initialized', {});
  }

  private async _sendRequest(method: string, params: any, timeout: number = 30000): Promise<any> {
    if (!this.connected && method !== 'initialize') {
      throw new ARTError('MCP client is not connected', ErrorCode.NOT_CONNECTED);
    }

    const id = this.nextRequestId++;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

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

  private async _sendNotification(method: string, params: any): Promise<void> {
    const notification: JsonRpcNotification = { jsonrpc: '2.0', method, params };
    await this._sendMessage(notification);
  }

  private async _sendMessage(message: JsonRpcMessage): Promise<void> {
    if (!this.requestWriter) {
      throw new ARTError('Request stream is not available.', ErrorCode.NOT_CONNECTED);
    }

    const serialized = JSON.stringify(message) + '\n';
    const encoder = new TextEncoder();
    const chunk = encoder.encode(serialized);

    try {
      await this.requestWriter.write(chunk);
      Logger.debug(`McpClient: Sending message: ${'method' in message ? message.method : 'response'}`);
    } catch (error) {
      Logger.error('McpClient: Failed to write to request stream:', error);
      this.disconnect();
      throw new ARTError('Failed to send message.', ErrorCode.NETWORK_ERROR, error as Error);
    }
  }

  private _handleMessage(message: JsonRpcMessage): void {
    Logger.debug(`McpClient: Received message: ${JSON.stringify(message).substring(0, 200)}...`);

    if ('id' in message && ('result' in message || 'error' in message)) {
      const response = message as JsonRpcResponse;
      const pending = this.pendingRequests.get(response.id);
      
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(new ARTError(`MCP server error: ${response.error.message}`, ErrorCode.EXTERNAL_SERVICE_ERROR));
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    if ('method' in message && !('id' in message)) {
      const notification = message as JsonRpcNotification;
      this.emit('notification', notification.method, notification.params);
      
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

    if ('method' in message && 'id' in message) {
      const request = message as JsonRpcRequest;
      this.emit('request', request.method, request.params, request.id);
    }
  }
}