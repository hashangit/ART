[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ConfigManager

# Class: ConfigManager

Defined in: [src/systems/mcp/ConfigManager.ts:8](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/ConfigManager.ts#L8)

Manages the MCP configuration, handling loading, validation, and saving to localStorage.
It ensures that the MCP connection details are always available and well-formed.

## Constructors

### Constructor

> **new ConfigManager**(): `ConfigManager`

Defined in: [src/systems/mcp/ConfigManager.ts:15](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/ConfigManager.ts#L15)

Initializes the ConfigManager by loading the configuration from localStorage.

#### Returns

`ConfigManager`

## Methods

### getConfig()

> **getConfig**(): [`ArtMcpConfig`](../interfaces/ArtMcpConfig.md)

Defined in: [src/systems/mcp/ConfigManager.ts:177](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/ConfigManager.ts#L177)

Gets the current MCP configuration.

#### Returns

[`ArtMcpConfig`](../interfaces/ArtMcpConfig.md)

The current MCP configuration.

***

### removeServerConfig()

> **removeServerConfig**(`serverId`): `void`

Defined in: [src/systems/mcp/ConfigManager.ts:196](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/ConfigManager.ts#L196)

Removes the configuration for a specific server and saves the changes.

#### Parameters

##### serverId

`string`

The ID of the server to remove.

#### Returns

`void`

***

### setServerConfig()

> **setServerConfig**(`serverId`, `serverConfig`): `void`

Defined in: [src/systems/mcp/ConfigManager.ts:186](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/ConfigManager.ts#L186)

Sets the configuration for a specific server and saves it.

#### Parameters

##### serverId

`string`

The ID of the server to configure.

##### serverConfig

[`McpServerConfig`](../type-aliases/McpServerConfig.md)

The configuration for the server.

#### Returns

`void`
