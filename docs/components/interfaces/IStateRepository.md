[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IStateRepository

# Interface: IStateRepository

Defined in: [src/core/interfaces.ts:537](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L537)

Repository for managing ThreadConfig and AgentState.

## Methods

### getAgentState()

> **getAgentState**(`threadId`): `Promise`\<`null` \| [`AgentState`](AgentState.md)\>

Defined in: [src/core/interfaces.ts:540](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L540)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`AgentState`](AgentState.md)\>

***

### getThreadConfig()

> **getThreadConfig**(`threadId`): `Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

Defined in: [src/core/interfaces.ts:538](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L538)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

***

### getThreadContext()

> **getThreadContext**(`threadId`): `Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

Defined in: [src/core/interfaces.ts:543](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L543)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

***

### setAgentState()

> **setAgentState**(`threadId`, `state`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:541](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L541)

#### Parameters

##### threadId

`string`

##### state

[`AgentState`](AgentState.md)

#### Returns

`Promise`\<`void`\>

***

### setThreadConfig()

> **setThreadConfig**(`threadId`, `config`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:539](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L539)

#### Parameters

##### threadId

`string`

##### config

[`ThreadConfig`](ThreadConfig.md)

#### Returns

`Promise`\<`void`\>

***

### setThreadContext()

> **setThreadContext**(`threadId`, `context`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:544](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L544)

#### Parameters

##### threadId

`string`

##### context

[`ThreadContext`](ThreadContext.md)

#### Returns

`Promise`\<`void`\>
