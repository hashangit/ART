[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StateManager

# Class: StateManager

Defined in: [src/systems/context/managers/StateManager.ts:34](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L34)

Manages thread-specific configuration (ThreadConfig) and state (AgentState)
using an underlying StateRepository. Supports explicit and implicit state saving strategies.

## Implements

- `StateManager`

## Constructors

### Constructor

> **new StateManager**(`stateRepository`, `strategy?`): `StateManager`

Defined in: [src/systems/context/managers/StateManager.ts:44](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L44)

Creates an instance of StateManager.

#### Parameters

##### stateRepository

[`IStateRepository`](../interfaces/IStateRepository.md)

The repository for persisting state.

##### strategy?

[`StateSavingStrategy`](../type-aliases/StateSavingStrategy.md) = `'explicit'`

The state saving strategy to use.

#### Returns

`StateManager`

## Methods

### clearCache()

> **clearCache**(): `void`

Defined in: [src/systems/context/managers/StateManager.ts:346](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L346)

Clears the internal context cache. Useful if the underlying storage is manipulated externally
during an agent's processing cycle, though this is generally not recommended.
Or for testing purposes.

#### Returns

`void`

***

### disableToolsForThread()

> **disableToolsForThread**(`threadId`, `toolNames`): `Promise`\<`void`\>

Defined in: [src/systems/context/managers/StateManager.ts:297](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L297)

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

A promise that resolves when the tools are disabled.

#### Throws

If threadId is empty, toolNames is empty, or if the repository fails.

#### Implementation of

`IStateManager.disableToolsForThread`

***

### enableToolsForThread()

> **enableToolsForThread**(`threadId`, `toolNames`): `Promise`\<`void`\>

Defined in: [src/systems/context/managers/StateManager.ts:260](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L260)

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

A promise that resolves when the tools are enabled.

#### Throws

If threadId is empty, toolNames is empty, or if the repository fails.

#### Implementation of

`IStateManager.enableToolsForThread`

***

### getEnabledToolsForThread()

> **getEnabledToolsForThread**(`threadId`): `Promise`\<`string`[]\>

Defined in: [src/systems/context/managers/StateManager.ts:332](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L332)

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

#### Implementation of

`IStateManager.getEnabledToolsForThread`

***

### getThreadConfigValue()

> **getThreadConfigValue**\<`T`\>(`threadId`, `key`): `Promise`\<`undefined` \| `T`\>

Defined in: [src/systems/context/managers/StateManager.ts:118](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L118)

Retrieves a specific value from the thread's configuration (`ThreadConfig`).
Loads the context first (which might come from cache in implicit mode).

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

The top-level configuration key.

#### Returns

`Promise`\<`undefined` \| `T`\>

A promise resolving to the configuration value, or `undefined`.

#### Implementation of

`IStateManager.getThreadConfigValue`

***

### isToolEnabled()

> **isToolEnabled**(`threadId`, `toolName`): `Promise`\<`boolean`\>

Defined in: [src/systems/context/managers/StateManager.ts:100](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L100)

Checks if a specific tool is permitted for use within a given thread.
It loads the thread's context and checks the `enabledTools` array in the configuration.

#### Parameters

##### threadId

`string`

The ID of the thread.

##### toolName

`string`

The name of the tool to check.

#### Returns

`Promise`\<`boolean`\>

A promise resolving to `true` if the tool is listed in the thread's `enabledTools` config, `false` otherwise or if the context/config cannot be loaded.

#### Implementation of

`IStateManager.isToolEnabled`

***

### loadThreadContext()

> **loadThreadContext**(`threadId`, `_userId?`): `Promise`\<[`ThreadContext`](../interfaces/ThreadContext.md)\>

Defined in: [src/systems/context/managers/StateManager.ts:62](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L62)

Loads the complete context (`ThreadConfig` and `AgentState`) for a specific thread.
If in 'implicit' state saving strategy, it caches the loaded context and a snapshot
of its AgentState for later comparison in `saveStateIfModified`.

#### Parameters

##### threadId

`string`

The unique identifier for the thread.

##### \_userId?

`string`

Optional user identifier (currently unused).

#### Returns

`Promise`\<[`ThreadContext`](../interfaces/ThreadContext.md)\>

A promise resolving to the `ThreadContext` object.

#### Throws

If `threadId` is empty or if the repository fails to find the context.

#### Implementation of

`IStateManager.loadThreadContext`

***

### saveStateIfModified()

> **saveStateIfModified**(`threadId`): `Promise`\<`void`\>

Defined in: [src/systems/context/managers/StateManager.ts:141](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L141)

Persists the thread's `AgentState` if it has been modified.
Behavior depends on the `stateSavingStrategy`:
- 'explicit': This method is a no-op for `AgentState` persistence and logs a warning.
- 'implicit': Compares the current `AgentState` (from the cached `ThreadContext` modified by the agent)
              with the snapshot taken during `loadThreadContext`. If different, saves the state
              to the repository and updates the snapshot.

#### Parameters

##### threadId

`string`

The ID of the thread whose state might need saving.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the state is saved or the operation is skipped.

#### Implementation of

`IStateManager.saveStateIfModified`

***

### setAgentState()

> **setAgentState**(`threadId`, `state`): `Promise`\<`void`\>

Defined in: [src/systems/context/managers/StateManager.ts:223](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L223)

Explicitly sets or updates the AgentState for a specific thread by calling the underlying state repository.
If in 'implicit' mode, this also updates the cached snapshot to prevent `saveStateIfModified`
from re-saving the same state immediately.

#### Parameters

##### threadId

`string`

The unique identifier of the thread.

##### state

[`AgentState`](../interfaces/AgentState.md)

The AgentState object to save. Must not be undefined or null.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the state is saved.

#### Throws

If threadId or state is undefined/null, or if the repository fails.

#### Implementation of

`IStateManager.setAgentState`

***

### setThreadConfig()

> **setThreadConfig**(`threadId`, `config`): `Promise`\<`void`\>

Defined in: [src/systems/context/managers/StateManager.ts:200](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/context/managers/StateManager.ts#L200)

Sets or completely replaces the configuration (`ThreadConfig`) for a specific thread
by calling the underlying state repository. This also clears any cached context for the thread.

#### Parameters

##### threadId

`string`

The ID of the thread.

##### config

[`ThreadConfig`](../interfaces/ThreadConfig.md)

The complete `ThreadConfig` object.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the configuration is saved.

#### Implementation of

`IStateManager.setThreadConfig`
