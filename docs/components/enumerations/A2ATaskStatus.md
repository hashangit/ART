[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskStatus

# Enumeration: A2ATaskStatus

Defined in: [src/types/index.ts:1266](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1266)

Represents the possible states of an A2A (Agent-to-Agent) task.

## Enumeration Members

### CANCELLED

> **CANCELLED**: `"CANCELLED"`

Defined in: [src/types/index.ts:1276](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1276)

Task has been cancelled before completion.

***

### COMPLETED

> **COMPLETED**: `"COMPLETED"`

Defined in: [src/types/index.ts:1272](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1272)

Task has been completed successfully.

***

### FAILED

> **FAILED**: `"FAILED"`

Defined in: [src/types/index.ts:1274](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1274)

Task has failed during execution.

***

### IN\_PROGRESS

> **IN\_PROGRESS**: `"IN_PROGRESS"`

Defined in: [src/types/index.ts:1270](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1270)

Task has been assigned to an agent and is being processed.

***

### PENDING

> **PENDING**: `"PENDING"`

Defined in: [src/types/index.ts:1268](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1268)

Task has been created but not yet assigned to an agent.

***

### REVIEW

> **REVIEW**: `"REVIEW"`

Defined in: [src/types/index.ts:1280](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1280)

Task is being reviewed for quality assurance.

***

### WAITING

> **WAITING**: `"WAITING"`

Defined in: [src/types/index.ts:1278](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1278)

Task is waiting for external dependencies or manual intervention.
