[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionMetadata

# Interface: ExecutionMetadata

Defined in: [types/index.ts:235](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L235)

Metadata summarizing an agent execution cycle.

## Properties

### error?

> `optional` **error**: `string`

Defined in: [types/index.ts:253](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L253)

A top-level error message if the overall status is 'error' or 'partial'.

***

### llmCalls

> **llmCalls**: `number`

Defined in: [types/index.ts:247](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L247)

The number of calls made to the `ReasoningEngine`.

***

### llmCost?

> `optional` **llmCost**: `number`

Defined in: [types/index.ts:251](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L251)

An optional estimated cost for the LLM calls made during this execution.

***

### status

> **status**: `"success"` \| `"error"` \| `"partial"`

Defined in: [types/index.ts:243](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L243)

The overall status of the execution ('success', 'error', or 'partial' if some steps failed but a response was generated).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:237](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L237)

The thread ID associated with this execution cycle.

***

### toolCalls

> **toolCalls**: `number`

Defined in: [types/index.ts:249](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L249)

The number of tool execution attempts made by the `ToolSystem`.

***

### totalDurationMs

> **totalDurationMs**: `number`

Defined in: [types/index.ts:245](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L245)

The total duration of the `agent.process()` call in milliseconds.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:239](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L239)

The trace ID used during this execution, if provided.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:241](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L241)

The user ID associated with this execution, if provided.
