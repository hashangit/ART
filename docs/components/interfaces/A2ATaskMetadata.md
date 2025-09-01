[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskMetadata

# Interface: A2ATaskMetadata

Defined in: [src/types/index.ts:1352](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1352)

Represents metadata about A2A task execution.

 A2ATaskMetadata

## Properties

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [src/types/index.ts:1372](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1372)

Timestamp when the task was completed/failed (if applicable).

***

### correlationId?

> `optional` **correlationId**: `string`

Defined in: [src/types/index.ts:1392](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1392)

Correlation ID for tracking related tasks across the system.

***

### createdAt

> **createdAt**: `number`

Defined in: [src/types/index.ts:1357](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1357)

Timestamp when the task was created (Unix timestamp in milliseconds).

***

### delegatedAt?

> `optional` **delegatedAt**: `number`

Defined in: [src/types/index.ts:1377](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1377)

Timestamp when the task was delegated to a remote agent (if applicable).

***

### estimatedCompletionMs?

> `optional` **estimatedCompletionMs**: `number`

Defined in: [src/types/index.ts:1412](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1412)

Estimated completion time in milliseconds (if provided by remote agent).

***

### initiatedBy?

> `optional` **initiatedBy**: `string`

Defined in: [src/types/index.ts:1387](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1387)

The user or system that initiated this task.

***

### lastUpdated?

> `optional` **lastUpdated**: `number`

Defined in: [src/types/index.ts:1382](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1382)

Timestamp when the task was last updated (for compatibility).

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/types/index.ts:1402](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1402)

Maximum number of retry attempts allowed.

***

### retryCount?

> `optional` **retryCount**: `number`

Defined in: [src/types/index.ts:1397](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1397)

Number of retry attempts made for this task.

***

### startedAt?

> `optional` **startedAt**: `number`

Defined in: [src/types/index.ts:1367](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1367)

Timestamp when the task was started (if applicable).

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/index.ts:1417](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1417)

Tags or labels for categorizing tasks.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/types/index.ts:1407](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1407)

Timeout duration in milliseconds.

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/types/index.ts:1362](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1362)

Timestamp when the task was last updated (Unix timestamp in milliseconds).
