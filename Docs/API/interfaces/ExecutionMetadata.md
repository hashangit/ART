[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionMetadata

# Interface: ExecutionMetadata

Defined in: [src/types/index.ts:367](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L367)

Metadata summarizing an agent execution cycle, including performance metrics and outcomes.

## Properties

### error?

> `optional` **error**: `string`

Defined in: [src/types/index.ts:385](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L385)

A top-level error message if the overall status is 'error' or 'partial'.

***

### llmCalls

> **llmCalls**: `number`

Defined in: [src/types/index.ts:379](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L379)

The number of calls made to the `ReasoningEngine`.

***

### llmCost?

> `optional` **llmCost**: `number`

Defined in: [src/types/index.ts:383](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L383)

An optional estimated cost for the LLM calls made during this execution.

***

### llmMetadata?

> `optional` **llmMetadata**: [`LLMMetadata`](LLMMetadata.md)

Defined in: [src/types/index.ts:387](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L387)

Aggregated metadata from LLM calls made during the execution.

***

### status

> **status**: `"success"` \| `"error"` \| `"partial"`

Defined in: [src/types/index.ts:375](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L375)

The overall status of the execution ('success', 'error', or 'partial' if some steps failed but a response was generated).

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:369](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L369)

The thread ID associated with this execution cycle.

***

### toolCalls

> **toolCalls**: `number`

Defined in: [src/types/index.ts:381](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L381)

The number of tool execution attempts made by the `ToolSystem`.

***

### totalDurationMs

> **totalDurationMs**: `number`

Defined in: [src/types/index.ts:377](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L377)

The total duration of the `agent.process()` call in milliseconds.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:371](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L371)

The trace ID used during this execution, if provided.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/types/index.ts:373](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L373)

The user ID associated with the execution, if provided.
