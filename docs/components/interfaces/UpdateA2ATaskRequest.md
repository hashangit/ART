[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / UpdateA2ATaskRequest

# Interface: UpdateA2ATaskRequest

Defined in: [src/types/index.ts:1638](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1638)

Represents an update to an existing A2A task.

 UpdateA2ATaskRequest

## Properties

### metadata?

> `optional` **metadata**: `Partial`\<[`A2ATaskMetadata`](A2ATaskMetadata.md)\>

Defined in: [src/types/index.ts:1663](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1663)

Additional metadata updates.

***

### result?

> `optional` **result**: [`A2ATaskResult`](A2ATaskResult.md)

Defined in: [src/types/index.ts:1658](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1658)

Task result (if completing).

***

### status?

> `optional` **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/types/index.ts:1648](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1648)

New task status (if changing).

***

### targetAgent?

> `optional` **targetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1653](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1653)

Target agent assignment (if assigning/reassigning).

***

### taskId

> **taskId**: `string`

Defined in: [src/types/index.ts:1643](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1643)

Task ID to update.
