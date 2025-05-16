[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentProps

# Interface: AgentProps

Defined in: [types/index.ts:288](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L288)

Properties required to initiate an agent processing cycle.

## Properties

### options?

> `optional` **options**: [`AgentOptions`](AgentOptions.md)

Defined in: [types/index.ts:300](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L300)

Optional runtime options that can override default behaviors for this specific `process` call.

***

### query

> **query**: `string`

Defined in: [types/index.ts:290](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L290)

The user's input query or request to the agent.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/index.ts:294](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L294)

An optional identifier for the specific UI session, useful for targeting UI updates.

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:292](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L292)

The mandatory identifier for the conversation thread. All context is scoped to this ID.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:298](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L298)

An optional identifier used for tracing a request across multiple systems or services.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:296](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L296)

An optional identifier for the user interacting with the agent.
