[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentProps

# Interface: AgentProps

Defined in: [types/index.ts:192](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L192)

Properties required to initiate an agent processing cycle.

## Properties

### options?

> `optional` **options**: [`AgentOptions`](AgentOptions.md)

Defined in: [types/index.ts:204](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L204)

Optional runtime options that can override default behaviors for this specific `process` call.

***

### query

> **query**: `string`

Defined in: [types/index.ts:194](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L194)

The user's input query or request to the agent.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/index.ts:198](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L198)

An optional identifier for the specific UI session, useful for targeting UI updates.

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:196](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L196)

The mandatory identifier for the conversation thread. All context is scoped to this ID.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:202](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L202)

An optional identifier used for tracing a request across multiple systems or services.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:200](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L200)

An optional identifier for the user interacting with the agent.
