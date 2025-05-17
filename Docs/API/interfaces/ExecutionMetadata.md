[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionMetadata

# Interface: ExecutionMetadata

Defined in: [types/index.ts:345](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L345)

Metadata summarizing an agent execution cycle, including performance metrics and outcomes.

## Properties

### error?

> `optional` **error**: `string`

Defined in: [types/index.ts:363](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L363)

A top-level error message if the overall status is 'error' or 'partial'.

***

### llmCalls

> **llmCalls**: `number`

Defined in: [types/index.ts:357](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L357)

The number of calls made to the `ReasoningEngine`.

***

### llmCost?

> `optional` **llmCost**: `number`

Defined in: [types/index.ts:361](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L361)

An optional estimated cost for the LLM calls made during this execution.

***

### llmMetadata?

> `optional` **llmMetadata**: [`LLMMetadata`](LLMMetadata.md)

Defined in: [types/index.ts:365](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L365)

Aggregated metadata from LLM calls made during the execution.

***

### status

> **status**: `"success"` \| `"error"` \| `"partial"`

Defined in: [types/index.ts:353](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L353)

The overall status of the execution ('success', 'error', or 'partial' if some steps failed but a response was generated).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:347](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L347)

The thread ID associated with this execution cycle.

***

### toolCalls

> **toolCalls**: `number`

Defined in: [types/index.ts:359](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L359)

The number of tool execution attempts made by the `ToolSystem`.

***

### totalDurationMs

> **totalDurationMs**: `number`

Defined in: [types/index.ts:355](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L355)

The total duration of the `agent.process()` call in milliseconds.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:349](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L349)

The trace ID used during this execution, if provided.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:351](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L351)

The user ID associated with the execution, if provided.
