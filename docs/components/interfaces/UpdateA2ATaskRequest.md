[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / UpdateA2ATaskRequest

# Interface: UpdateA2ATaskRequest

Defined in: [src/types/index.ts:1627](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1627)

Represents an update to an existing A2A task.

 UpdateA2ATaskRequest

## Properties

### metadata?

> `optional` **metadata**: `Partial`\<[`A2ATaskMetadata`](A2ATaskMetadata.md)\>

Defined in: [src/types/index.ts:1652](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1652)

Additional metadata updates.

***

### result?

> `optional` **result**: [`A2ATaskResult`](A2ATaskResult.md)

Defined in: [src/types/index.ts:1647](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1647)

Task result (if completing).

***

### status?

> `optional` **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/types/index.ts:1637](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1637)

New task status (if changing).

***

### targetAgent?

> `optional` **targetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1642](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1642)

Target agent assignment (if assigning/reassigning).

***

### taskId

> **taskId**: `string`

Defined in: [src/types/index.ts:1632](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1632)

Task ID to update.
