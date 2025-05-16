[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IStateRepository

# Interface: IStateRepository

Defined in: [core/interfaces.ts:453](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L453)

Repository for managing ThreadConfig and AgentState.

## Methods

### getAgentState()

> **getAgentState**(`threadId`): `Promise`\<`null` \| [`AgentState`](AgentState.md)\>

Defined in: [core/interfaces.ts:456](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L456)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`AgentState`](AgentState.md)\>

***

### getThreadConfig()

> **getThreadConfig**(`threadId`): `Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

Defined in: [core/interfaces.ts:454](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L454)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadConfig`](ThreadConfig.md)\>

***

### getThreadContext()

> **getThreadContext**(`threadId`): `Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

Defined in: [core/interfaces.ts:459](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L459)

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`null` \| [`ThreadContext`](ThreadContext.md)\>

***

### setAgentState()

> **setAgentState**(`threadId`, `state`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:457](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L457)

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

Defined in: [core/interfaces.ts:455](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L455)

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

Defined in: [core/interfaces.ts:460](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L460)

#### Parameters

##### threadId

`string`

##### context

[`ThreadContext`](ThreadContext.md)

#### Returns

`Promise`\<`void`\>
