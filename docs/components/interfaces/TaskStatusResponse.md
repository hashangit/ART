[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / TaskStatusResponse

# Interface: TaskStatusResponse

Defined in: [src/systems/a2a/TaskDelegationService.ts:46](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/a2a/TaskDelegationService.ts#L46)

Response structure for A2A task status queries

## Properties

### error?

> `optional` **error**: `string`

Defined in: [src/systems/a2a/TaskDelegationService.ts:56](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/a2a/TaskDelegationService.ts#L56)

Error information if failed

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [src/systems/a2a/TaskDelegationService.ts:58](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/a2a/TaskDelegationService.ts#L58)

Additional metadata

***

### progress?

> `optional` **progress**: `number`

Defined in: [src/systems/a2a/TaskDelegationService.ts:52](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/a2a/TaskDelegationService.ts#L52)

Progress percentage (0-100) if available

***

### result?

> `optional` **result**: [`A2ATaskResult`](A2ATaskResult.md)

Defined in: [src/systems/a2a/TaskDelegationService.ts:54](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/a2a/TaskDelegationService.ts#L54)

Task result if completed

***

### status

> **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/systems/a2a/TaskDelegationService.ts:50](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/a2a/TaskDelegationService.ts#L50)

Current status of the task

***

### taskId

> **taskId**: `string`

Defined in: [src/systems/a2a/TaskDelegationService.ts:48](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/a2a/TaskDelegationService.ts#L48)

The task ID
