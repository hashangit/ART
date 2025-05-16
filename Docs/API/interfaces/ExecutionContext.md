[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionContext

# Interface: ExecutionContext

Defined in: [types/index.ts:363](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L363)

Context provided to a tool during its execution.

## Properties

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:365](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L365)

The ID of the thread in which the tool is being executed.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:367](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L367)

The trace ID for this execution cycle, if available.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:369](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L369)

The user ID associated with the execution, if available.
