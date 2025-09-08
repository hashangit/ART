[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / Observation

# Interface: Observation

Defined in: [src/types/index.ts:175](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L175)

Represents a recorded event during the agent's execution.

 Observation

## Properties

### content

> **content**: `any`

Defined in: [src/types/index.ts:219](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L219)

The main data payload of the observation, structure depends on the `type`.

#### Remarks

Common content shapes by `type`:
- `TITLE`: `{ title: string }` — a concise thread title (<= 10 words)
- `INTENT`: `{ intent: string }`
- `PLAN`: `{ plan: string; rawOutput?: string }`
- `TOOL_CALL`: `{ toolCalls: ParsedToolCall[] }`
- `TOOL_EXECUTION`: `{ callId: string; toolName: string; status: 'success' | 'error'; output?: any; error?: string }`
- `FINAL_RESPONSE`: `{ message: ConversationMessage; uiMetadata?: object }`

***

### id

> **id**: `string`

Defined in: [src/types/index.ts:180](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L180)

A unique identifier for this specific observation record.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:224](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L224)

Optional metadata providing additional context (e.g., source phase, related IDs, status).

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:185](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L185)

The identifier of the conversation thread this observation relates to.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/types/index.ts:195](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L195)

A Unix timestamp (in milliseconds) indicating when the observation was recorded.

***

### title

> **title**: `string`

Defined in: [src/types/index.ts:205](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L205)

A concise, human-readable title summarizing the observation (often generated based on type/metadata).

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:190](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L190)

An optional identifier for tracing a request across multiple systems or components.

***

### type

> **type**: [`ObservationType`](../enumerations/ObservationType.md)

Defined in: [src/types/index.ts:200](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L200)

The category of the event being observed (e.g., PLAN, THOUGHTS, TOOL_EXECUTION).
