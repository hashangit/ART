[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / McpProxyTool

# Class: McpProxyTool

Defined in: [src/systems/mcp/McpProxyTool.ts:19](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/McpProxyTool.ts#L19)

A proxy tool that wraps an MCP server tool and implements the [IToolExecutor](../interfaces/IToolExecutor.md) interface.

## Remarks

This allows MCP server tools to be used seamlessly within the ART Framework.

## See

 - [McpManager](McpManager.md) for the system that manages these proxy tools.
 - [IToolExecutor](../interfaces/IToolExecutor.md) for the interface it implements.

 McpProxyTool

## Implements

- [`IToolExecutor`](../interfaces/IToolExecutor.md)

## Constructors

### Constructor

> **new McpProxyTool**(`card`, `toolDefinition`, `mcpManager`): `McpProxyTool`

Defined in: [src/systems/mcp/McpProxyTool.ts:33](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/McpProxyTool.ts#L33)

Creates an instance of McpProxyTool.

#### Parameters

##### card

[`McpServerConfig`](../type-aliases/McpServerConfig.md)

Configuration for the MCP server hosting this tool.

##### toolDefinition

[`McpToolDefinition`](../interfaces/McpToolDefinition.md)

The tool definition from the MCP server.

##### mcpManager

[`McpManager`](McpManager.md)

The MCP manager for managing connections.

#### Returns

`McpProxyTool`

## Properties

### schema

> `readonly` **schema**: [`ToolSchema`](../interfaces/ToolSchema.md)

Defined in: [src/systems/mcp/McpProxyTool.ts:20](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/McpProxyTool.ts#L20)

The schema definition for this tool.

#### Implementation of

[`IToolExecutor`](../interfaces/IToolExecutor.md).[`schema`](../interfaces/IToolExecutor.md#schema)

## Methods

### execute()

> **execute**(`input`, `context`): `Promise`\<[`ToolResult`](../interfaces/ToolResult.md)\>

Defined in: [src/systems/mcp/McpProxyTool.ts:56](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/McpProxyTool.ts#L56)

Executes the tool by making a request to the MCP server.

#### Parameters

##### input

`any`

Validated input arguments for the tool.

##### context

[`ExecutionContext`](../interfaces/ExecutionContext.md)

Execution context containing threadId, traceId, etc.

#### Returns

`Promise`\<[`ToolResult`](../interfaces/ToolResult.md)\>

A promise resolving to the tool result.

#### Implementation of

[`IToolExecutor`](../interfaces/IToolExecutor.md).[`execute`](../interfaces/IToolExecutor.md#execute)

***

### getOriginalToolName()

> **getOriginalToolName**(): `string`

Defined in: [src/systems/mcp/McpProxyTool.ts:106](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/McpProxyTool.ts#L106)

Gets the original tool name from the MCP server.

#### Returns

`string`

The original tool name.

***

### getServerConfig()

> **getServerConfig**(): [`McpServerConfig`](../type-aliases/McpServerConfig.md)

Defined in: [src/systems/mcp/McpProxyTool.ts:115](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/McpProxyTool.ts#L115)

Gets the MCP server configuration.

#### Returns

[`McpServerConfig`](../type-aliases/McpServerConfig.md)

The server configuration.

***

### getToolDefinition()

> **getToolDefinition**(): [`McpToolDefinition`](../interfaces/McpToolDefinition.md)

Defined in: [src/systems/mcp/McpProxyTool.ts:124](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/McpProxyTool.ts#L124)

Gets the MCP tool definition.

#### Returns

[`McpToolDefinition`](../interfaces/McpToolDefinition.md)

The tool definition.
