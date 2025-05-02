[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionContext

# Interface: ExecutionContext

Defined in: [types/index.ts:279](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L279)

Context provided to a tool during its execution.

## Properties

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:281](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L281)

The ID of the thread in which the tool is being executed.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:283](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L283)

The trace ID for this execution cycle, if available.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:285](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L285)

The user ID associated with the execution, if available.
