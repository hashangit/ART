[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ExecutionMetadata

# Interface: ExecutionMetadata

Defined in: [src/types/index.ts:737](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L737)

Metadata summarizing an agent execution cycle, including performance metrics and outcomes.

 ExecutionMetadata

## Properties

### error?

> `optional` **error**: `string`

Defined in: [src/types/index.ts:782](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L782)

A top-level error message if the overall status is 'error' or 'partial'.

***

### llmCalls

> **llmCalls**: `number`

Defined in: [src/types/index.ts:767](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L767)

The number of calls made to the `ReasoningEngine`.

***

### llmCost?

> `optional` **llmCost**: `number`

Defined in: [src/types/index.ts:777](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L777)

An optional estimated cost for the LLM calls made during this execution.

***

### llmMetadata?

> `optional` **llmMetadata**: [`LLMMetadata`](LLMMetadata.md)

Defined in: [src/types/index.ts:787](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L787)

Aggregated metadata from LLM calls made during the execution.

***

### status

> **status**: `"error"` \| `"success"` \| `"partial"`

Defined in: [src/types/index.ts:757](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L757)

The overall status of the execution ('success', 'error', or 'partial' if some steps failed but a response was generated).

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:742](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L742)

The thread ID associated with this execution cycle.

***

### toolCalls

> **toolCalls**: `number`

Defined in: [src/types/index.ts:772](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L772)

The number of tool execution attempts made by the `ToolSystem`.

***

### totalDurationMs

> **totalDurationMs**: `number`

Defined in: [src/types/index.ts:762](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L762)

The total duration of the `agent.process()` call in milliseconds.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:747](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L747)

The trace ID used during this execution, if provided.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/types/index.ts:752](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L752)

The user ID associated with the execution, if provided.
