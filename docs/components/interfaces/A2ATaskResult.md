[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskResult

# Interface: A2ATaskResult

Defined in: [src/types/index.ts:1425](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1425)

Represents the result of an A2A task execution.

 A2ATaskResult

## Properties

### data?

> `optional` **data**: `any`

Defined in: [src/types/index.ts:1435](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1435)

The data returned by the task execution.

***

### durationMs?

> `optional` **durationMs**: `number`

Defined in: [src/types/index.ts:1457](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1457)

Execution duration in milliseconds.

***

### error?

> `optional` **error**: `string`

Defined in: [src/types/index.ts:1440](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1440)

Error message if the task failed.

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/types/index.ts:1445](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1445)

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

Defined in: [src/types/index.ts:1430](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1430)

Whether the task execution was successful.
