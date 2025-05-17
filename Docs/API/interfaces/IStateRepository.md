[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IStateRepository

# Interface: IStateRepository

Defined in: [core/interfaces.ts:465](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L465)

Repository for managing ThreadConfig and AgentState.

## Methods

### getAgentState()

> **getAgentState**(`threadId`): `Promise`\<`null` \| [`AgentState`](AgentState.md)\>

Defined in: [core/interfaces.ts:468](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L468)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`AgentState`](AgentState.md)\>

***

### getThreadConfig()

> **getThreadConfig**(`threadId`): `Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

Defined in: [core/interfaces.ts:466](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L466)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

***

### getThreadContext()

> **getThreadContext**(`threadId`): `Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

Defined in: [core/interfaces.ts:471](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L471)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

***

### setAgentState()

> **setAgentState**(`threadId`, `state`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:469](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L469)

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

Defined in: [core/interfaces.ts:467](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L467)

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

Defined in: [core/interfaces.ts:472](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L472)

#### Parameters

##### threadId

`string`

##### context

[`ThreadContext`](ThreadContext.md)

#### Returns

`Promise`\<`void`\>
