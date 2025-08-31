[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATask

# Interface: A2ATask

Defined in: [src/types/index.ts:1454](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1454)

Represents a task for Agent-to-Agent (A2A) communication and delegation.
Used for asynchronous task delegation between AI agents in distributed systems.

 A2ATask

## Properties

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [src/types/index.ts:1533](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1533)

Callback URL or identifier for task completion notifications.

***

### dependencies?

> `optional` **dependencies**: `string`[]

Defined in: [src/types/index.ts:1539](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1539)

Dependencies that must be completed before this task can start.

***

### metadata

> **metadata**: [`A2ATaskMetadata`](A2ATaskMetadata.md)

Defined in: [src/types/index.ts:1521](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1521)

Task execution metadata.

***

### payload

> **payload**: `object`

Defined in: [src/types/index.ts:1476](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1476)

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

Defined in: [src/types/index.ts:1515](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1515)

Task priority level.

***

### result?

> `optional` **result**: [`A2ATaskResult`](A2ATaskResult.md)

Defined in: [src/types/index.ts:1527](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1527)

The result of task execution (if completed).

***

### sourceAgent

> **sourceAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1503](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1503)

Information about the agent that created/requested this task.

***

### status

> **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/types/index.ts:1470](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1470)

Current status of the task.

***

### targetAgent?

> `optional` **targetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1509](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1509)

Information about the agent assigned to execute this task (if assigned).

***

### taskId

> **taskId**: `string`

Defined in: [src/types/index.ts:1459](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1459)

Unique identifier for the task.

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:1464](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1464)

The thread this task belongs to (top-level for efficient filtering).
