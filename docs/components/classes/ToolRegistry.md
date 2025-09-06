[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ToolRegistry

# Class: ToolRegistry

Defined in: [src/systems/tool/ToolRegistry.ts:10](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L10)

A simple in-memory implementation of the `ToolRegistry` interface.
Stores tool executors in a Map, keyed by the tool's unique name.

## Implements

- `ToolRegistry`

## Constructors

### Constructor

> **new ToolRegistry**(`stateManager?`): `ToolRegistry`

Defined in: [src/systems/tool/ToolRegistry.ts:18](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L18)

Creates an instance of ToolRegistry.

#### Parameters

##### stateManager?

`StateManager`

Optional StateManager instance for advanced filtering.

#### Returns

`ToolRegistry`

## Methods

### clearAllTools()

> **clearAllTools**(): `Promise`\<`void`\>

Defined in: [src/systems/tool/ToolRegistry.ts:105](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L105)

Removes all registered tool executors from the registry.
Primarily useful for resetting state during testing or specific application scenarios.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all tools have been cleared.

***

### getAvailableTools()

> **getAvailableTools**(`filter?`): `Promise`\<[`ToolSchema`](../interfaces/ToolSchema.md)[]\>

Defined in: [src/systems/tool/ToolRegistry.ts:64](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L64)

Retrieves the schemas of all currently registered tools.
Retrieves the schemas of available tools, optionally filtering by those enabled for a specific thread.
If `filter.enabledForThreadId` is provided and a `StateManager` was injected, it attempts to load the thread's configuration
and return only the schemas for tools listed in `enabledTools`. Otherwise, it returns all registered tool schemas.

#### Parameters

##### filter?

Optional filter criteria. `enabledForThreadId` triggers filtering based on thread config.

###### enabledForThreadId?

`string`

#### Returns

`Promise`\<[`ToolSchema`](../interfaces/ToolSchema.md)[]\>

A promise resolving to an array containing the `ToolSchema` of the available tools based on the filter.

#### Implementation of

`IToolRegistry.getAvailableTools`

***

### getToolExecutor()

> **getToolExecutor**(`toolName`): `Promise`\<`undefined` \| [`IToolExecutor`](../interfaces/IToolExecutor.md)\>

Defined in: [src/systems/tool/ToolRegistry.ts:48](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L48)

Retrieves a registered tool executor instance by its unique name.

#### Parameters

##### toolName

`string`

The `name` property defined in the tool's schema.

#### Returns

`Promise`\<`undefined` \| [`IToolExecutor`](../interfaces/IToolExecutor.md)\>

A promise resolving to the `IToolExecutor` instance, or `undefined` if no tool with that name is registered.

#### Implementation of

`IToolRegistry.getToolExecutor`

***

### registerTool()

> **registerTool**(`executor`): `Promise`\<`void`\>

Defined in: [src/systems/tool/ToolRegistry.ts:30](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L30)

Registers a tool executor instance, making it available for lookup via `getToolExecutor`.
If a tool with the same name (from `executor.schema.name`) already exists, it will be overwritten, and a warning will be logged.

#### Parameters

##### executor

[`IToolExecutor`](../interfaces/IToolExecutor.md)

The instance of the class implementing `IToolExecutor`. Must have a valid schema with a name.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the tool is registered.

#### Throws

If the provided executor or its schema is invalid.

#### Implementation of

`IToolRegistry.registerTool`

***

### unregisterTool()

> **unregisterTool**(`toolName`): `Promise`\<`void`\>

Defined in: [src/systems/tool/ToolRegistry.ts:113](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L113)

Unregister a single tool by name.

#### Parameters

##### toolName

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`IToolRegistry.unregisterTool`

***

### unregisterTools()

> **unregisterTools**(`predicate`): `Promise`\<`number`\>

Defined in: [src/systems/tool/ToolRegistry.ts:122](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/tool/ToolRegistry.ts#L122)

Unregister tools matching a predicate; returns count removed.

#### Parameters

##### predicate

(`schema`) => `boolean`

#### Returns

`Promise`\<`number`\>

#### Implementation of

`IToolRegistry.unregisterTools`
