[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentProps

# Interface: AgentProps

Defined in: [src/types/index.ts:629](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L629)

Properties required to initiate an agent processing cycle.

 AgentProps

## Properties

### options?

> `optional` **options**: [`AgentOptions`](AgentOptions.md)

Defined in: [src/types/index.ts:659](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L659)

Optional runtime options that can override default behaviors for this specific `process` call.

***

### query

> **query**: `string`

Defined in: [src/types/index.ts:634](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L634)

The user's input query or request to the agent.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [src/types/index.ts:644](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L644)

An optional identifier for the specific UI session, useful for targeting UI updates.

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:639](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L639)

The mandatory identifier for the conversation thread. All context is scoped to this ID.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:654](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L654)

An optional identifier used for tracing a request across multiple systems or services.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/types/index.ts:649](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L649)

An optional identifier for the user interacting with the agent.
