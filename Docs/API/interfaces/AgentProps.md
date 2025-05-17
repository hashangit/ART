[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentProps

# Interface: AgentProps

Defined in: [types/index.ts:296](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L296)

Properties required to initiate an agent processing cycle.

## Properties

### options?

> `optional` **options**: [`AgentOptions`](AgentOptions.md)

Defined in: [types/index.ts:308](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L308)

Optional runtime options that can override default behaviors for this specific `process` call.

***

### query

> **query**: `string`

Defined in: [types/index.ts:298](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L298)

The user's input query or request to the agent.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/index.ts:302](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L302)

An optional identifier for the specific UI session, useful for targeting UI updates.

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:300](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L300)

The mandatory identifier for the conversation thread. All context is scoped to this ID.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:306](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L306)

An optional identifier used for tracing a request across multiple systems or services.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:304](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L304)

An optional identifier for the user interacting with the agent.
