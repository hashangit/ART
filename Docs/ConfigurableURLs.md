# Configuring Service Endpoints

## 1. Overview

The ART framework allows you to override the default URLs for core services, such as Agent-to-Agent (A2A) discovery and MCP server discovery. This is essential for pointing the framework to your own hosted services or for switching between different environments (e.g., development, staging, production).

Configuration is handled through the `a2aConfig` and `mcpConfig` properties within the main `ArtInstanceConfig` object.

## 2. A2A Configuration (`a2aConfig`)

The `a2aConfig` object allows you to specify endpoints for services related to agent-to-agent communication.

*   `discoveryEndpoint`: The URL of your custom Agent Discovery Service. The `AgentDiscoveryService` will call this endpoint to find candidate agents for task delegation.
*   `callbackUrl`: The base URL that your application uses to receive task status updates from agents it has delegated tasks to. The `TaskDelegationService` uses this to construct the full callback URL for a specific task.

## 3. MCP Configuration (`mcpConfig`)

The `mcpConfig` object is currently used to specify the discovery endpoint for MCP servers.

*   `discoveryEndpoint`: The URL of your custom MCP Discovery Service. The `McpManager` will call this endpoint to find available MCP servers.

## 4. Example Configuration

Here is an example of how to set these properties in your `ArtInstanceConfig`.

```typescript
// src/config/art-config.ts
import { ArtInstanceConfig } from 'art-framework';

const artConfig: ArtInstanceConfig = {
  // ... other configurations ...

  /**
   * Optional: Configuration for A2A services.
   * Point the framework to your custom A2A discovery and callback endpoints.
   */
  a2a: {
    discoveryEndpoint: 'https://api.example.com/a2a/discover',
    callbackUrl: 'https://myapp.example.com/a2a/callback',
  },

  /**
   * Optional: Configuration for MCP services.
   * This is separate from the individual MCP server URLs defined in `mcp.servers`.
   * This endpoint is for *discovering* which servers are available.
   */
  mcp: {
    discoveryEndpoint: 'https://api.example.com/mcp/discover',
    // Note: The list of servers to connect to is still defined in `mcp.servers`
    servers: [
      {
        name: 'my-remote-mcp',
        transport: {
          type: 'streamable-http',
          url: 'https://mcp.example.com/stream'
        }
      }
    ]
  },
};

export default artConfig;
```

If these properties are not provided, the framework will use internal default values suitable for local development or fall back to disabled status if no default is applicable.