[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskMetadata

# Interface: A2ATaskMetadata

Defined in: [src/types/index.ts:1340](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1340)

Represents metadata about A2A task execution.

 A2ATaskMetadata

## Properties

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [src/types/index.ts:1360](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1360)

Timestamp when the task was completed/failed (if applicable).

***

### correlationId?

> `optional` **correlationId**: `string`

Defined in: [src/types/index.ts:1380](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1380)

Correlation ID for tracking related tasks across the system.

***

### createdAt

> **createdAt**: `number`

Defined in: [src/types/index.ts:1345](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1345)

Timestamp when the task was created (Unix timestamp in milliseconds).

***

### delegatedAt?

> `optional` **delegatedAt**: `number`

Defined in: [src/types/index.ts:1365](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1365)

Timestamp when the task was delegated to a remote agent (if applicable).

***

### estimatedCompletionMs?

> `optional` **estimatedCompletionMs**: `number`

Defined in: [src/types/index.ts:1400](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1400)

Estimated completion time in milliseconds (if provided by remote agent).

***

### initiatedBy?

> `optional` **initiatedBy**: `string`

Defined in: [src/types/index.ts:1375](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1375)

The user or system that initiated this task.

***

### lastUpdated?

> `optional` **lastUpdated**: `number`

Defined in: [src/types/index.ts:1370](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1370)

Timestamp when the task was last updated (for compatibility).

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/types/index.ts:1390](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1390)

Maximum number of retry attempts allowed.

***

### retryCount?

> `optional` **retryCount**: `number`

Defined in: [src/types/index.ts:1385](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1385)

Number of retry attempts made for this task.

***

### startedAt?

> `optional` **startedAt**: `number`

Defined in: [src/types/index.ts:1355](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1355)

Timestamp when the task was started (if applicable).

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/index.ts:1405](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1405)

Tags or labels for categorizing tasks.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/types/index.ts:1395](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1395)

Timeout duration in milliseconds.

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/types/index.ts:1350](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1350)

Timestamp when the task was last updated (Unix timestamp in milliseconds).
