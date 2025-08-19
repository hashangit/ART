# McpManager

The `McpManager` is a high-level component in the MCP system that manages a collection of `McpClient` instances. It simplifies the process of interacting with multiple MCP servers by providing a single point of entry and handling the lifecycle of the client connections.

## Role and Responsibilities

*   **Client Management:** It instantiates and manages `McpClient` instances for all the MCP servers defined in the `McpConfigManager`.
*   **Connection Caching:** It caches `McpClient` instances to avoid the overhead of creating a new client for every request to the same server.
*   **Facade:** It acts as a facade, providing a simple `getClient` method for other components to get a ready-to-use `McpClient` for a specific server.
*   **Integration:** It integrates with the `McpConfigManager` to get the configuration for each server and with the `AuthManager` to provide authentication capabilities to the clients it creates.

## Usage

The `McpManager` is typically initialized once when the `ArtInstance` is created. It is then used by other services, like the `TaskDelegationService`, to get clients for communicating with other agents.

### Initialization

```typescript
// In your main application setup
const configManager = new McpConfigManager(mcpConfig);
const authManager = new AuthManager(authConfig);

const mcpManager = new McpManager(configManager, authManager);
```

The `McpManager` is initialized with an `McpConfigManager` and an `AuthManager`.

### Getting a Client

Other components can then use the `McpManager` to get a client for a specific server:

```typescript
const travelAgentClient = mcpManager.getClient("TravelAgent");

if (travelAgentClient) {
  // Use the client to call a method on the remote agent
  const result = await travelAgentClient.call("process", {
    description: "Book a flight to Paris",
  });
}
```

The `getClient` method returns a configured `McpClient` instance, ready to make authenticated requests to the specified MCP server.

## How It Works

1.  **Lazy Initialization:** The `McpManager` does not create all the `McpClient` instances upfront. Instead, it creates a client the first time it is requested for a specific server ID.
2.  **Caching:** Once a client is created, it is stored in a map. Subsequent calls to `getClient` for the same server ID will return the cached instance.
3.  **Client Configuration:** When creating a new client, the `McpManager` retrieves the server's configuration from the `McpConfigManager` and passes it, along with the `AuthManager`, to the `McpClient` constructor.

This design ensures that resources are used efficiently while providing a simple and powerful way to manage connections to multiple MCP servers.