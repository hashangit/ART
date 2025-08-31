[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / McpServerConfig

# Type Alias: McpServerConfig

> **McpServerConfig** = `object`

Defined in: [src/systems/mcp/types.ts:177](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L177)

Represents the configuration for a single MCP server.

## Remarks

This is the format for each server entry in the `art_mcp_config.json` file.
It contains all the necessary information for discovering, installing, and connecting to an MCP server.

## Properties

### connection

> **connection**: [`StreamableHttpConnection`](../interfaces/StreamableHttpConnection.md)

Defined in: [src/systems/mcp/types.ts:207](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L207)

The connection details for the server.

***

### description?

> `optional` **description**: `string`

Defined in: [src/systems/mcp/types.ts:202](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L202)

A description of the server and its capabilities.

***

### displayName?

> `optional` **displayName**: `string`

Defined in: [src/systems/mcp/types.ts:197](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L197)

A user-friendly name for the server.

***

### enabled

> **enabled**: `boolean`

Defined in: [src/systems/mcp/types.ts:192](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L192)

Whether the server is enabled and should be connected to.

***

### id

> **id**: `string`

Defined in: [src/systems/mcp/types.ts:182](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L182)

A unique identifier for the server.

***

### installation?

> `optional` **installation**: `object`

Defined in: [src/systems/mcp/types.ts:212](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L212)

Information about how the server was installed (e.g., 'git', 'npm', 'manual').

#### Index Signature

\[`key`: `string`\]: `any`

#### source

> **source**: `"git"` \| `"npm"` \| `"manual"`

***

### resources

> **resources**: [`McpResource`](../interfaces/McpResource.md)[]

Defined in: [src/systems/mcp/types.ts:227](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L227)

The static resources provided by the server.

***

### resourceTemplates

> **resourceTemplates**: [`McpResourceTemplate`](../interfaces/McpResourceTemplate.md)[]

Defined in: [src/systems/mcp/types.ts:232](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L232)

The resource templates provided by the server.

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [src/systems/mcp/types.ts:217](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L217)

The timeout in milliseconds for requests to the server.

***

### tools

> **tools**: [`McpToolDefinition`](../interfaces/McpToolDefinition.md)[]

Defined in: [src/systems/mcp/types.ts:222](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L222)

The tools provided by the server.

***

### type

> **type**: `"streamable-http"`

Defined in: [src/systems/mcp/types.ts:187](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L187)

The transport type for the server, currently only 'streamable-http' is supported.
