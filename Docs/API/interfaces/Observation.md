[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / Observation

# Interface: Observation

Defined in: [types/index.ts:96](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L96)

Represents a recorded event during the agent's execution.

## Properties

### content

> **content**: `any`

Defined in: [types/index.ts:110](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L110)

The main data payload of the observation, structure depends on the `type`.

***

### id

> **id**: `string`

Defined in: [types/index.ts:98](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L98)

A unique identifier for this specific observation record.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:112](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L112)

Optional metadata providing additional context (e.g., source phase, related IDs, status).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:100](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L100)

The identifier of the conversation thread this observation relates to.

***

### timestamp

> **timestamp**: `number`

Defined in: [types/index.ts:104](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L104)

A Unix timestamp (in milliseconds) indicating when the observation was recorded.

***

### title

> **title**: `string`

Defined in: [types/index.ts:108](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L108)

A concise, human-readable title summarizing the observation (often generated based on type/metadata).

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:102](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L102)

An optional identifier for tracing a request across multiple systems or components.

***

### type

> **type**: [`ObservationType`](../enumerations/ObservationType.md)

Defined in: [types/index.ts:106](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L106)

The category of the event being observed (e.g., PLAN, THOUGHTS, TOOL_EXECUTION).
