[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionMetadata

# Interface: ExecutionMetadata

Defined in: [types/index.ts:255](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L255)

Metadata summarizing an agent execution cycle.

## Properties

### error?

> `optional` **error**: `string`

Defined in: [types/index.ts:273](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L273)

A top-level error message if the overall status is 'error' or 'partial'.

***

### llmCalls

> **llmCalls**: `number`

Defined in: [types/index.ts:267](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L267)

The number of calls made to the `ReasoningEngine`.

***

### llmCost?

> `optional` **llmCost**: `number`

Defined in: [types/index.ts:271](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L271)

An optional estimated cost for the LLM calls made during this execution.

***

### status

> **status**: `"success"` \| `"error"` \| `"partial"`

Defined in: [types/index.ts:263](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L263)

The overall status of the execution ('success', 'error', or 'partial' if some steps failed but a response was generated).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:257](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L257)

The thread ID associated with this execution cycle.

***

### toolCalls

> **toolCalls**: `number`

Defined in: [types/index.ts:269](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L269)

The number of tool execution attempts made by the `ToolSystem`.

***

### totalDurationMs

> **totalDurationMs**: `number`

Defined in: [types/index.ts:265](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L265)

The total duration of the `agent.process()` call in milliseconds.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:259](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L259)

The trace ID used during this execution, if provided.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:261](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L261)

The user ID associated with this execution, if provided.
