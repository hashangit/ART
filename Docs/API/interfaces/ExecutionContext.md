[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionContext

# Interface: ExecutionContext

Defined in: [types/index.ts:259](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L259)

Context provided to a tool during its execution.

## Properties

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:261](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L261)

The ID of the thread in which the tool is being executed.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:263](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L263)

The trace ID for this execution cycle, if available.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:265](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L265)

The user ID associated with the execution, if available.
