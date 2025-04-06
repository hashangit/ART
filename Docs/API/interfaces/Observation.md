[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / Observation

# Interface: Observation

Defined in: [types/index.ts:55](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L55)

Represents a recorded event during the agent's execution.

## Properties

### content

> **content**: `any`

Defined in: [types/index.ts:69](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L69)

The main data payload of the observation, structure depends on the `type`.

***

### id

> **id**: `string`

Defined in: [types/index.ts:57](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L57)

A unique identifier for this specific observation record.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:71](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L71)

Optional metadata providing additional context (e.g., source phase, related IDs, status).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:59](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L59)

The identifier of the conversation thread this observation relates to.

***

### timestamp

> **timestamp**: `number`

Defined in: [types/index.ts:63](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L63)

A Unix timestamp (in milliseconds) indicating when the observation was recorded.

***

### title

> **title**: `string`

Defined in: [types/index.ts:67](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L67)

A concise, human-readable title summarizing the observation (often generated based on type/metadata).

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:61](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L61)

An optional identifier for tracing a request across multiple systems or components.

***

### type

> **type**: [`ObservationType`](../enumerations/ObservationType.md)

Defined in: [types/index.ts:65](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L65)

The category of the event being observed (e.g., PLAN, THOUGHTS, TOOL_EXECUTION).
