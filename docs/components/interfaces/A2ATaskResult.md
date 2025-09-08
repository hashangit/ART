[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskResult

# Interface: A2ATaskResult

Defined in: [src/types/index.ts:1436](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1436)

Represents the result of an A2A task execution.

 A2ATaskResult

## Properties

### data?

> `optional` **data**: `any`

Defined in: [src/types/index.ts:1446](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1446)

The data returned by the task execution.

***

### durationMs?

> `optional` **durationMs**: `number`

Defined in: [src/types/index.ts:1468](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1468)

Execution duration in milliseconds.

***

### error?

> `optional` **error**: `string`

Defined in: [src/types/index.ts:1451](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1451)

Error message if the task failed.

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/types/index.ts:1456](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1456)

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

Defined in: [src/types/index.ts:1441](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1441)

Whether the task execution was successful.
