[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / CreateA2ATaskRequest

# Interface: CreateA2ATaskRequest

Defined in: [src/types/index.ts:1570](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1570)

Represents a request to create a new A2A task.

 CreateA2ATaskRequest

## Properties

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [src/types/index.ts:1615](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1615)

Callback URL for notifications.

***

### dependencies?

> `optional` **dependencies**: `string`[]

Defined in: [src/types/index.ts:1610](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1610)

Task dependencies.

***

### input

> **input**: `any`

Defined in: [src/types/index.ts:1580](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1580)

Input data for the task.

***

### instructions?

> `optional` **instructions**: `string`

Defined in: [src/types/index.ts:1585](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1585)

Instructions for task execution.

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/types/index.ts:1625](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1625)

Maximum retry attempts.

***

### parameters?

> `optional` **parameters**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:1590](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1590)

Task parameters.

***

### preferredTargetAgent?

> `optional` **preferredTargetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1605](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1605)

Preferred target agent (if any).

***

### priority?

> `optional` **priority**: [`A2ATaskPriority`](../enumerations/A2ATaskPriority.md)

Defined in: [src/types/index.ts:1595](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1595)

Task priority.

***

### sourceAgent

> **sourceAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1600](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1600)

Source agent information.

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/index.ts:1630](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1630)

Task tags.

***

### taskType

> **taskType**: `string`

Defined in: [src/types/index.ts:1575](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1575)

The type of task to be executed.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/types/index.ts:1620](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1620)

Task timeout in milliseconds.
