[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / CreateA2ATaskRequest

# Interface: CreateA2ATaskRequest

Defined in: [src/types/index.ts:1559](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1559)

Represents a request to create a new A2A task.

 CreateA2ATaskRequest

## Properties

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [src/types/index.ts:1604](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1604)

Callback URL for notifications.

***

### dependencies?

> `optional` **dependencies**: `string`[]

Defined in: [src/types/index.ts:1599](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1599)

Task dependencies.

***

### input

> **input**: `any`

Defined in: [src/types/index.ts:1569](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1569)

Input data for the task.

***

### instructions?

> `optional` **instructions**: `string`

Defined in: [src/types/index.ts:1574](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1574)

Instructions for task execution.

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/types/index.ts:1614](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1614)

Maximum retry attempts.

***

### parameters?

> `optional` **parameters**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:1579](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1579)

Task parameters.

***

### preferredTargetAgent?

> `optional` **preferredTargetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1594](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1594)

Preferred target agent (if any).

***

### priority?

> `optional` **priority**: [`A2ATaskPriority`](../enumerations/A2ATaskPriority.md)

Defined in: [src/types/index.ts:1584](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1584)

Task priority.

***

### sourceAgent

> **sourceAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1589](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1589)

Source agent information.

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/index.ts:1619](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1619)

Task tags.

***

### taskType

> **taskType**: `string`

Defined in: [src/types/index.ts:1564](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1564)

The type of task to be executed.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/types/index.ts:1609](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1609)

Task timeout in milliseconds.
