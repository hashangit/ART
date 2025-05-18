[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ExecutionContext

# Interface: ExecutionContext

Defined in: [src/types/index.ts:393](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L393)

Context provided to a tool during its execution.

## Properties

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:395](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L395)

The ID of the thread in which the tool is being executed.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:397](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L397)

The trace ID for this execution cycle, if available.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/types/index.ts:399](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L399)

The user ID associated with the execution, if available.
