[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATask

# Interface: A2ATask

Defined in: [src/types/index.ts:1477](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1477)

Represents a task for Agent-to-Agent (A2A) communication and delegation.
Used for asynchronous task delegation between AI agents in distributed systems.

 A2ATask

## Properties

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [src/types/index.ts:1556](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1556)

Callback URL or identifier for task completion notifications.

***

### dependencies?

> `optional` **dependencies**: `string`[]

Defined in: [src/types/index.ts:1562](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1562)

Dependencies that must be completed before this task can start.

***

### metadata

> **metadata**: [`A2ATaskMetadata`](A2ATaskMetadata.md)

Defined in: [src/types/index.ts:1544](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1544)

Task execution metadata.

***

### payload

> **payload**: `object`

Defined in: [src/types/index.ts:1499](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1499)

The data payload containing task parameters and context.

#### input

> **input**: `any`

Input data required for task execution.

#### instructions?

> `optional` **instructions**: `string`

Instructions or configuration for the task.

#### parameters?

> `optional` **parameters**: `Record`\<`string`, `any`\>

Additional parameters specific to the task type.

#### taskType

> **taskType**: `string`

The type of task to be executed (e.g., 'analyze', 'synthesize', 'transform').

***

### priority

> **priority**: [`A2ATaskPriority`](../enumerations/A2ATaskPriority.md)

Defined in: [src/types/index.ts:1538](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1538)

Task priority level.

***

### result?

> `optional` **result**: [`A2ATaskResult`](A2ATaskResult.md)

Defined in: [src/types/index.ts:1550](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1550)

The result of task execution (if completed).

***

### sourceAgent

> **sourceAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1526](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1526)

Information about the agent that created/requested this task.

***

### status

> **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/types/index.ts:1493](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1493)

Current status of the task.

***

### targetAgent?

> `optional` **targetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1532](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1532)

Information about the agent assigned to execute this task (if assigned).

***

### taskId

> **taskId**: `string`

Defined in: [src/types/index.ts:1482](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1482)

Unique identifier for the task.

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:1487](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1487)

The thread this task belongs to (top-level for efficient filtering).
