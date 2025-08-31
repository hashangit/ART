[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / CreateA2ATaskRequest

# Interface: CreateA2ATaskRequest

Defined in: [src/types/index.ts:1547](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1547)

Represents a request to create a new A2A task.

 CreateA2ATaskRequest

## Properties

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [src/types/index.ts:1592](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1592)

Callback URL for notifications.

***

### dependencies?

> `optional` **dependencies**: `string`[]

Defined in: [src/types/index.ts:1587](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1587)

Task dependencies.

***

### input

> **input**: `any`

Defined in: [src/types/index.ts:1557](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1557)

Input data for the task.

***

### instructions?

> `optional` **instructions**: `string`

Defined in: [src/types/index.ts:1562](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1562)

Instructions for task execution.

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/types/index.ts:1602](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1602)

Maximum retry attempts.

***

### parameters?

> `optional` **parameters**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:1567](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1567)

Task parameters.

***

### preferredTargetAgent?

> `optional` **preferredTargetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1582](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1582)

Preferred target agent (if any).

***

### priority?

> `optional` **priority**: [`A2ATaskPriority`](../enumerations/A2ATaskPriority.md)

Defined in: [src/types/index.ts:1572](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1572)

Task priority.

***

### sourceAgent

> **sourceAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1577](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1577)

Source agent information.

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/index.ts:1607](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1607)

Task tags.

***

### taskType

> **taskType**: `string`

Defined in: [src/types/index.ts:1552](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1552)

The type of task to be executed.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/types/index.ts:1597](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1597)

Task timeout in milliseconds.
