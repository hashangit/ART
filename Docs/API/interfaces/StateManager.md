[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / StateManager

# Interface: StateManager

Defined in: [core/interfaces.ts:225](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L225)

Interface for managing thread-specific configuration and state.

## Methods

### getThreadConfigValue()

> **getThreadConfigValue**\<`T`\>(`threadId`, `key`): `Promise`\<`undefined` \| `T`\>

Defined in: [core/interfaces.ts:253](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L253)

Retrieves a specific value from the thread's configuration (`ThreadConfig`).
Supports accessing nested properties using dot notation (e.g., 'reasoning.model').

#### Type Parameters

##### T

`T`

The expected type of the configuration value.

#### Parameters

##### threadId

`string`

The ID of the thread.

##### key

`string`

The key (potentially nested) of the configuration value to retrieve.

#### Returns

`Promise`\<`undefined` \| `T`\>

A promise resolving to the configuration value, or `undefined` if the key doesn't exist or the thread config isn't loaded.

***

### isToolEnabled()

> **isToolEnabled**(`threadId`, `toolName`): `Promise`\<`boolean`\>

Defined in: [core/interfaces.ts:243](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L243)

Verifies if a specific tool is permitted for use within a given thread.
Checks against the `enabledTools` array in the thread's loaded `ThreadConfig`.

#### Parameters

##### threadId

`string`

The ID of the thread.

##### toolName

`string`

The name of the tool to check.

#### Returns

`Promise`\<`boolean`\>

A promise resolving to `true` if the tool is enabled for the thread, `false` otherwise.

***

### loadThreadContext()

> **loadThreadContext**(`threadId`, `userId`?): `Promise`\<[`ThreadContext`](ThreadContext.md)\>

Defined in: [core/interfaces.ts:234](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L234)

Loads the complete context (`ThreadConfig` and `AgentState`) for a specific thread.
This is typically called at the beginning of an agent execution cycle.

#### Parameters

##### threadId

`string`

The unique identifier for the thread.

##### userId?

`string`

Optional user identifier, potentially used for retrieving user-specific state or config overrides.

#### Returns

`Promise`\<[`ThreadContext`](ThreadContext.md)\>

A promise resolving to the `ThreadContext` object containing the loaded configuration and state.

#### Throws

If the context for the thread cannot be loaded (e.g., code `THREAD_NOT_FOUND`).

***

### saveStateIfModified()

> **saveStateIfModified**(`threadId`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:261](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L261)

Persists the `AgentState` for the thread, but only if it has been marked as modified during the current execution cycle.
This prevents unnecessary writes to the storage layer.

#### Parameters

##### threadId

`string`

The ID of the thread whose state should potentially be saved.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the save operation is complete (or skipped).

***

### setThreadConfig()

> **setThreadConfig**(`threadId`, `config`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:270](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L270)

Sets or completely replaces the configuration (`ThreadConfig`) for a specific thread.
Use with caution, as this overwrites the existing configuration. Consider methods for partial updates if needed.

#### Parameters

##### threadId

`string`

The ID of the thread whose configuration is being set.

##### config

[`ThreadConfig`](ThreadConfig.md)

The complete `ThreadConfig` object to save.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the configuration is saved.
