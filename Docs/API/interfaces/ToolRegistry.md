[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ToolRegistry

# Interface: ToolRegistry

Defined in: [core/interfaces.ts:154](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L154)

Interface for managing the registration and retrieval of tools.

## Methods

### getAvailableTools()

> **getAvailableTools**(`filter`?): `Promise`\<[`ToolSchema`](ToolSchema.md)[]\>

Defined in: [core/interfaces.ts:174](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L174)

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

Defined in: [core/interfaces.ts:167](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L167)

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

Defined in: [core/interfaces.ts:160](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L160)

Registers a tool executor instance, making it available for use.

#### Parameters

##### executor

[`IToolExecutor`](IToolExecutor.md)

The instance of the class implementing `IToolExecutor`.

#### Returns

`Promise`\<`void`\>

#### Throws

If a tool with the same name is already registered.
