[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / Observation

# Interface: Observation

Defined in: [src/types/index.ts:173](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L173)

Represents a recorded event during the agent's execution.

 Observation

## Properties

### content

> **content**: `any`

Defined in: [src/types/index.ts:208](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L208)

The main data payload of the observation, structure depends on the `type`.

***

### id

> **id**: `string`

Defined in: [src/types/index.ts:178](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L178)

A unique identifier for this specific observation record.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:213](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L213)

Optional metadata providing additional context (e.g., source phase, related IDs, status).

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:183](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L183)

The identifier of the conversation thread this observation relates to.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/types/index.ts:193](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L193)

A Unix timestamp (in milliseconds) indicating when the observation was recorded.

***

### title

> **title**: `string`

Defined in: [src/types/index.ts:203](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L203)

A concise, human-readable title summarizing the observation (often generated based on type/metadata).

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:188](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L188)

An optional identifier for tracing a request across multiple systems or components.

***

### type

> **type**: [`ObservationType`](../enumerations/ObservationType.md)

Defined in: [src/types/index.ts:198](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L198)

The category of the event being observed (e.g., PLAN, THOUGHTS, TOOL_EXECUTION).
