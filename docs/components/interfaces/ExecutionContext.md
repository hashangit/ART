[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ExecutionContext

# Interface: ExecutionContext

Defined in: [src/types/index.ts:795](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L795)

Context provided to a tool during its execution.

 ExecutionContext

## Properties

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:800](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L800)

The ID of the thread in which the tool is being executed.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:805](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L805)

The trace ID for this execution cycle, if available.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/types/index.ts:810](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L810)

The user ID associated with the execution, if available.
