[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATask

# Interface: A2ATask

Defined in: [src/types/index.ts:1466](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1466)

Represents a task for Agent-to-Agent (A2A) communication and delegation.
Used for asynchronous task delegation between AI agents in distributed systems.

 A2ATask

## Properties

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [src/types/index.ts:1545](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1545)

Callback URL or identifier for task completion notifications.

***

### dependencies?

> `optional` **dependencies**: `string`[]

Defined in: [src/types/index.ts:1551](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1551)

Dependencies that must be completed before this task can start.

***

### metadata

> **metadata**: [`A2ATaskMetadata`](A2ATaskMetadata.md)

Defined in: [src/types/index.ts:1533](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1533)

Task execution metadata.

***

### payload

> **payload**: `object`

Defined in: [src/types/index.ts:1488](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1488)

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

Defined in: [src/types/index.ts:1527](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1527)

Task priority level.

***

### result?

> `optional` **result**: [`A2ATaskResult`](A2ATaskResult.md)

Defined in: [src/types/index.ts:1539](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1539)

The result of task execution (if completed).

***

### sourceAgent

> **sourceAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1515](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1515)

Information about the agent that created/requested this task.

***

### status

> **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/types/index.ts:1482](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1482)

Current status of the task.

***

### targetAgent?

> `optional` **targetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1521](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1521)

Information about the agent assigned to execute this task (if assigned).

***

### taskId

> **taskId**: `string`

Defined in: [src/types/index.ts:1471](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1471)

Unique identifier for the task.

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:1476](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1476)

The thread this task belongs to (top-level for efficient filtering).
