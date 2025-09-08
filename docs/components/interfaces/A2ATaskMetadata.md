[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskMetadata

# Interface: A2ATaskMetadata

Defined in: [src/types/index.ts:1363](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1363)

Represents metadata about A2A task execution.

 A2ATaskMetadata

## Properties

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [src/types/index.ts:1383](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1383)

Timestamp when the task was completed/failed (if applicable).

***

### correlationId?

> `optional` **correlationId**: `string`

Defined in: [src/types/index.ts:1403](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1403)

Correlation ID for tracking related tasks across the system.

***

### createdAt

> **createdAt**: `number`

Defined in: [src/types/index.ts:1368](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1368)

Timestamp when the task was created (Unix timestamp in milliseconds).

***

### delegatedAt?

> `optional` **delegatedAt**: `number`

Defined in: [src/types/index.ts:1388](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1388)

Timestamp when the task was delegated to a remote agent (if applicable).

***

### estimatedCompletionMs?

> `optional` **estimatedCompletionMs**: `number`

Defined in: [src/types/index.ts:1423](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1423)

Estimated completion time in milliseconds (if provided by remote agent).

***

### initiatedBy?

> `optional` **initiatedBy**: `string`

Defined in: [src/types/index.ts:1398](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1398)

The user or system that initiated this task.

***

### lastUpdated?

> `optional` **lastUpdated**: `number`

Defined in: [src/types/index.ts:1393](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1393)

Timestamp when the task was last updated (for compatibility).

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/types/index.ts:1413](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1413)

Maximum number of retry attempts allowed.

***

### retryCount?

> `optional` **retryCount**: `number`

Defined in: [src/types/index.ts:1408](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1408)

Number of retry attempts made for this task.

***

### startedAt?

> `optional` **startedAt**: `number`

Defined in: [src/types/index.ts:1378](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1378)

Timestamp when the task was started (if applicable).

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/index.ts:1428](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1428)

Tags or labels for categorizing tasks.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/types/index.ts:1418](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1418)

Timeout duration in milliseconds.

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/types/index.ts:1373](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1373)

Timestamp when the task was last updated (Unix timestamp in milliseconds).
