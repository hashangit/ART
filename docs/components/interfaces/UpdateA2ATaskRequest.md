[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / UpdateA2ATaskRequest

# Interface: UpdateA2ATaskRequest

Defined in: [src/types/index.ts:1615](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1615)

Represents an update to an existing A2A task.

 UpdateA2ATaskRequest

## Properties

### metadata?

> `optional` **metadata**: `Partial`\<[`A2ATaskMetadata`](A2ATaskMetadata.md)\>

Defined in: [src/types/index.ts:1640](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1640)

Additional metadata updates.

***

### result?

> `optional` **result**: [`A2ATaskResult`](A2ATaskResult.md)

Defined in: [src/types/index.ts:1635](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1635)

Task result (if completing).

***

### status?

> `optional` **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/types/index.ts:1625](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1625)

New task status (if changing).

***

### targetAgent?

> `optional` **targetAgent**: [`A2AAgentInfo`](A2AAgentInfo.md)

Defined in: [src/types/index.ts:1630](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1630)

Target agent assignment (if assigning/reassigning).

***

### taskId

> **taskId**: `string`

Defined in: [src/types/index.ts:1620](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1620)

Task ID to update.
