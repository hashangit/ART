[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskResult

# Interface: A2ATaskResult

Defined in: [src/types/index.ts:1413](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1413)

Represents the result of an A2A task execution.

 A2ATaskResult

## Properties

### data?

> `optional` **data**: `any`

Defined in: [src/types/index.ts:1423](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1423)

The data returned by the task execution.

***

### durationMs?

> `optional` **durationMs**: `number`

Defined in: [src/types/index.ts:1445](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1445)

Execution duration in milliseconds.

***

### error?

> `optional` **error**: `string`

Defined in: [src/types/index.ts:1428](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1428)

Error message if the task failed.

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/types/index.ts:1433](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1433)

Additional metadata about the execution.

#### Index Signature

\[`key`: `string`\]: `any`

#### sources?

> `optional` **sources**: `object`[]

##### Index Signature

\[`key`: `string`\]: `any`

***

### success

> **success**: `boolean`

Defined in: [src/types/index.ts:1418](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1418)

Whether the task execution was successful.
