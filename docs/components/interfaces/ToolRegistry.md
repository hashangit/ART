[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ToolRegistry

# Interface: ToolRegistry

Defined in: [src/core/interfaces.ts:207](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L207)

Interface for managing the registration and retrieval of tools.

## Methods

### getAvailableTools()

> **getAvailableTools**(`filter?`): `Promise`\<[`ToolSchema`](ToolSchema.md)[]\>

Defined in: [src/core/interfaces.ts:227](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L227)

Retrieves the schemas of available tools. Can be filtered, e.g., to get only tools enabled for a specific thread.

#### Parameters

##### filter?

Optional filter criteria. If `enabledForThreadId` is provided, it should consult the `StateManager` to return only schemas for tools enabled in that thread's configuration.

###### enabledForThreadId?

`string`

#### Returns

`Promise`\<[`ToolSchema`](ToolSchema.md)[]\>

A promise resolving to an array of `ToolSchema` objects.

***

### getToolExecutor()

> **getToolExecutor**(`toolName`): `Promise`\<`undefined` \| [`IToolExecutor`](IToolExecutor.md)\>

Defined in: [src/core/interfaces.ts:220](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L220)

Retrieves a registered tool executor instance by its unique name.

#### Parameters

##### toolName

`string`

The `name` property defined in the tool's schema.

#### Returns

`Promise`\<`undefined` \| [`IToolExecutor`](IToolExecutor.md)\>

A promise resolving to the executor instance, or `undefined` if no tool with that name is registered.

***

### registerTool()

> **registerTool**(`executor`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:213](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L213)

Registers a tool executor instance, making it available for use.

#### Parameters

##### executor

[`IToolExecutor`](IToolExecutor.md)

The instance of the class implementing `IToolExecutor`.

#### Returns

`Promise`\<`void`\>

#### Throws

If a tool with the same name is already registered.

***

### unregisterTool()?

> `optional` **unregisterTool**(`toolName`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:233](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L233)

Unregisters a tool by its unique name.
Implementations should silently succeed if the tool does not exist.

#### Parameters

##### toolName

`string`

#### Returns

`Promise`\<`void`\>

***

### unregisterTools()?

> `optional` **unregisterTools**(`predicate`): `Promise`\<`number`\>

Defined in: [src/core/interfaces.ts:239](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L239)

Unregisters multiple tools that match a predicate. Returns the number of tools removed.
This is useful for removing all tools belonging to a specific MCP server by name prefix.

#### Parameters

##### predicate

(`schema`) => `boolean`

#### Returns

`Promise`\<`number`\>
