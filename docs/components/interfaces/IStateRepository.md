[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IStateRepository

# Interface: IStateRepository

Defined in: [src/core/interfaces.ts:552](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L552)

Repository for managing ThreadConfig and AgentState.

## Methods

### getAgentState()

> **getAgentState**(`threadId`): `Promise`\<`null` \| [`AgentState`](AgentState.md)\>

Defined in: [src/core/interfaces.ts:555](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L555)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`AgentState`](AgentState.md)\>

***

### getThreadConfig()

> **getThreadConfig**(`threadId`): `Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

Defined in: [src/core/interfaces.ts:553](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L553)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

***

### getThreadContext()

> **getThreadContext**(`threadId`): `Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

Defined in: [src/core/interfaces.ts:558](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L558)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

***

### setAgentState()

> **setAgentState**(`threadId`, `state`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:556](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L556)

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

Defined in: [src/core/interfaces.ts:554](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L554)

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

Defined in: [src/core/interfaces.ts:559](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L559)

#### Parameters

##### threadId

`string`

##### context

[`ThreadContext`](ThreadContext.md)

#### Returns

`Promise`\<`void`\>
