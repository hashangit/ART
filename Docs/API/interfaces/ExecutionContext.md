[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionContext

# Interface: ExecutionContext

Defined in: [types/index.ts:371](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L371)

Context provided to a tool during its execution.

## Properties

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:373](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L373)

The ID of the thread in which the tool is being executed.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:375](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L375)

The trace ID for this execution cycle, if available.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:377](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L377)

The user ID associated with the execution, if available.
