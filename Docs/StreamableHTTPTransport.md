# MCP Communication: Streamable HTTP Transport

## 1. Overview

The ART framework uses the **Streamable HTTP** transport for all remote MCP (Model-as-a-Service Communication Protocol) connections, as per the latest MCP specification. This transport is essential for making the framework compliant with the current standard and, most importantly, for enabling secure, header-based authentication with remote MCP servers.

## 2. Background: Streamable HTTP

Streamable HTTP is a transport mechanism that uses standard HTTP `POST` requests for both client-to-server and server-to-client communication.

*   **Client-to-Server**: The client sends a `POST` request to the server with a streaming request body. This allows the client to send multiple JSON-RPC messages over a single HTTP request.
*   **Server-to-Client**: The server responds with a streaming response body. This allows the server to send multiple JSON-RPC messages (responses and notifications) back to the client over the same HTTP request.

This approach has several advantages over the old HTTP+SSE transport:

*   **Full Duplex Communication**: It allows for true bidirectional communication over a single HTTP connection.
*   **Custom Headers**: It fully supports custom HTTP headers, which is essential for secure, token-based authentication (e.g., OAuth 2.0 Bearer tokens).
*   **Simplicity**: It uses standard HTTP features and does not require a separate connection for server-to-client communication.

## 3. Configuration

To use the Streamable HTTP transport, you configure it within the `mcp` property of your `ArtInstanceConfig`.

```typescript
// src/config/art-config.ts
import { ArtInstanceConfig } from 'art-framework';

const artConfig: ArtInstanceConfig = {
  // ... other configurations ...
  mcp: {
    servers: [
      {
        name: 'my-remote-mcp-server',
        transport: {
          type: 'streamable-http',
          url: 'https://mcp.example.com/stream',
        },
      },
    ],
  },
  // It's highly recommended to also configure an auth strategy
  // when connecting to remote MCP servers.
  auth: {
    strategy: new PKCEOAuthStrategy({
      // ... your PKCE config ...
    }),
  },
};
```

When a connection to `my-remote-mcp-server` is required, the `McpManager` will use the `streamable-http` transport to connect to the specified `url`.

## 4. Integration with Authentication

A key benefit of the Streamable HTTP transport is its seamless integration with the framework's authentication system.

When establishing a connection, the `McpClient` automatically requests authentication headers from the configured `AuthManager`. If an authentication strategy like `PKCEOAuthStrategy` is in place, the necessary `Authorization: Bearer <token>` header will be included in the initial `POST` request to the MCP server.

This makes it possible to securely connect to protected MCP servers without any additional configuration beyond setting up the transport and the authentication strategy.