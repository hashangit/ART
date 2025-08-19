# McpConfigManager

The `McpConfigManager` is a utility component within the MCP system responsible for managing the configuration of MCP servers. It provides a centralized way to define and retrieve the settings for different MCP services that the ART framework might need to interact with.

## Role and Responsibilities

*   **Configuration Storage:** It holds the configuration for all known MCP servers, including their URLs, authentication requirements, and any other relevant settings.
*   **Configuration Retrieval:** It provides a simple interface for other components, such as the `McpClient` and `TaskDelegationService`, to retrieve the configuration for a specific MCP server by its ID.
*   **Centralization:** It centralizes MCP configuration, making it easier to manage and update the settings for multiple MCP services from a single location.

## Usage

The `McpConfigManager` is typically initialized with a set of MCP configurations when the `ArtInstance` is created. It is then used internally by other components that need to connect to MCP servers.

### Configuration

Here is an example of how you might define MCP configurations and provide them to the `McpConfigManager`:

```typescript
// In your main application setup
const mcpConfig = {
  servers: {
    TravelAgent: {
      url: "http://localhost:8081/mcp",
      auth: {
        type: "oauth2",
        strategy: "pkce",
      },
    },
    DataAnalysisAgent: {
      url: "http://localhost:8082/mcp",
      auth: {
        type: "apiKey",
      },
    },
  },
};

const configManager = new McpConfigManager(mcpConfig);
```

In this example, we are defining the configurations for two MCP servers, `TravelAgent` and `DataAnalysisAgent`. Each configuration includes the server's URL and information about its authentication requirements.

### Retrieving Configuration

Other components can then use the `McpConfigManager` to get the configuration for a specific server:

```typescript
const travelAgentConfig = configManager.getServerConfig("TravelAgent");
// travelAgentConfig will be { url: "http://localhost:8081/mcp", ... }
```

This allows components like the `TaskDelegationService` to dynamically get the connection details for the agent they need to delegate to.

## How It Works

The `McpConfigManager` is a straightforward key-value store. It takes a configuration object in its constructor and provides a `getServerConfig` method to retrieve the settings for a given server ID. This simple design provides a powerful way to manage the complexity of a multi-agent system where different agents may have different connection and authentication requirements.