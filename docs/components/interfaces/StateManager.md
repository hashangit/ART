[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StateManager

# Interface: StateManager

Defined in: [src/core/interfaces.ts:264](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L264)

Interface for managing thread-specific configuration and state.

## Methods

### disableToolsForThread()

> **disableToolsForThread**(`threadId`, `toolNames`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:343](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L343)

Disables specific tools for a conversation thread by removing them from the thread's enabled tools list.
This method loads the current thread configuration, updates the enabledTools array,
and persists the changes. Cache is invalidated to ensure fresh data on next load.

#### Parameters

##### threadId

`string`

The unique identifier of the thread.

##### toolNames

`string`[]

Array of tool names to disable for this thread.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the tools are disabled and configuration is saved.

#### Throws

If no ThreadConfig exists for the threadId, or if the repository fails.

***

### enableToolsForThread()

> **enableToolsForThread**(`threadId`, `toolNames`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:332](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L332)

Enables specific tools for a conversation thread by adding them to the thread's enabled tools list.
This method loads the current thread configuration, updates the enabledTools array,
and persists the changes. Cache is invalidated to ensure fresh data on next load.

#### Parameters

##### threadId

`string`

The unique identifier of the thread.

##### toolNames

`string`[]

Array of tool names to enable for this thread.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the tools are enabled and configuration is saved.

#### Throws

If no ThreadConfig exists for the threadId, or if the repository fails.

***

### getEnabledToolsForThread()

> **getEnabledToolsForThread**(`threadId`): `Promise`\<`string`[]\>

Defined in: [src/core/interfaces.ts:352](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L352)

Gets the list of currently enabled tools for a specific thread.
This is a convenience method that loads the thread context and returns the enabledTools array.

#### Parameters

##### threadId

`string`

The unique identifier of the thread.

#### Returns

`Promise`\<`string`[]\>

A promise that resolves to an array of enabled tool names, or empty array if no tools are enabled.

#### Throws

If the thread context cannot be loaded.

***

### getThreadConfigValue()

> **getThreadConfigValue**\<`T`\>(`threadId`, `key`): `Promise`\<`undefined` \| `T`\>

Defined in: [src/core/interfaces.ts:292](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L292)

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

Defined in: [src/core/interfaces.ts:282](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L282)

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

> **loadThreadContext**(`threadId`, `userId?`): `Promise`\<[`ThreadContext`](ThreadContext.md)\>

Defined in: [src/core/interfaces.ts:273](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L273)

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

Defined in: [src/core/interfaces.ts:300](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L300)

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

### setAgentState()

> **setAgentState**(`threadId`, `state`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:321](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L321)

Sets or updates the AgentState for a specific thread.
This method allows an agent to explicitly persist its internal state.
It requires that a ThreadConfig already exists for the thread, which is typically
ensured by the application calling setThreadConfig() prior to agent execution.

#### Parameters

##### threadId

`string`

The unique identifier of the thread.

##### state

[`AgentState`](AgentState.md)

The AgentState object to save.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the state is saved.

#### Throws

If no ThreadConfig exists for the threadId, or if the repository fails.

***

### setThreadConfig()

> **setThreadConfig**(`threadId`, `config`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:309](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L309)

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
