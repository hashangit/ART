[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / McpManager

# Class: McpManager

Defined in: [src/systems/mcp/McpManager.ts:31](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L31)

Manages MCP (Model Context Protocol) server connections and tool registration.

## Remarks

The `McpManager` is responsible for:
- Connecting to configured MCP servers.
- Discovering available tools from servers.
- Creating proxy tools that wrap MCP server tools.
- Registering proxy tools with the [ToolRegistry](ToolRegistry.md).
- Managing server health and status.
- Handling thread-specific tool activation/deactivation.

This enables dynamic tool loading from external MCP servers while maintaining
seamless integration with the ART Framework's tool system.

## See

 - [McpProxyTool](McpProxyTool.md) for the tool wrapper implementation.
 - [McpClientController](McpClientController.md) for the underlying client implementation.

 McpManager

## Constructors

### Constructor

> **new McpManager**(`toolRegistry`, `_stateManager`, `authManager?`): `McpManager`

Defined in: [src/systems/mcp/McpManager.ts:44](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L44)

Creates an instance of McpManager.

#### Parameters

##### toolRegistry

`ToolRegistry`

The tool registry to register proxy tools with.

##### \_stateManager

`StateManager`

The state manager (not currently used).

##### authManager?

[`AuthManager`](AuthManager.md)

The authentication manager.

#### Returns

`McpManager`

## Methods

### discoverAvailableServers()

> **discoverAvailableServers**(`discoveryEndpoint?`): `Promise`\<[`McpServerConfig`](../type-aliases/McpServerConfig.md)[]\>

Defined in: [src/systems/mcp/McpManager.ts:220](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L220)

Searches a discovery service for available MCP servers.

#### Parameters

##### discoveryEndpoint?

`string`

The URL of the discovery service.

#### Returns

`Promise`\<[`McpServerConfig`](../type-aliases/McpServerConfig.md)[]\>

A promise resolving to an array of McpServerConfig.

***

### getOrCreateConnection()

> **getOrCreateConnection**(`serverId`): `Promise`\<[`McpClientController`](McpClientController.md)\>

Defined in: [src/systems/mcp/McpManager.ts:135](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L135)

Gets an existing connection or creates a new one for a given server ID.

#### Parameters

##### serverId

`string`

The ID of the server to connect to.

#### Returns

`Promise`\<[`McpClientController`](McpClientController.md)\>

A promise that resolves to the MCP client controller.

***

### initialize()

> **initialize**(`mcpConfig?`): `Promise`\<`void`\>

Defined in: [src/systems/mcp/McpManager.ts:59](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L59)

Initializes the McpManager, discovers and registers tools from configured servers.

#### Parameters

##### mcpConfig?

The MCP configuration.

###### discoveryEndpoint?

`string`

The endpoint for discovering MCP servers.

###### enabled?

`boolean`

Whether MCP is enabled.

#### Returns

`Promise`\<`void`\>

A promise that resolves when initialization is complete.

***

### installServer()

> **installServer**(`server`): `Promise`\<[`McpServerConfig`](../type-aliases/McpServerConfig.md)\>

Defined in: [src/systems/mcp/McpManager.ts:306](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L306)

Installs a server by persisting its config, discovering tools via MCP, and
registering proxy tools. Returns the finalized config with accurate tools.

#### Parameters

##### server

[`McpServerConfig`](../type-aliases/McpServerConfig.md)

The server configuration to install.

#### Returns

`Promise`\<[`McpServerConfig`](../type-aliases/McpServerConfig.md)\>

A promise that resolves to the finalized server configuration.

***

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [src/systems/mcp/McpManager.ts:121](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L121)

Shuts down all active MCP connections.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all connections are shut down.

***

### uninstallServer()

> **uninstallServer**(`serverId`): `Promise`\<`void`\>

Defined in: [src/systems/mcp/McpManager.ts:372](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/mcp/McpManager.ts#L372)

Uninstalls a server: disconnects, removes registered proxy tools, and deletes config.

#### Parameters

##### serverId

`string`

The ID of the server to uninstall.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the server is uninstalled.
