[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskStatus

# Enumeration: A2ATaskStatus

Defined in: [src/types/index.ts:1255](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1255)

Represents the possible states of an A2A (Agent-to-Agent) task.

## Enumeration Members

### CANCELLED

> **CANCELLED**: `"CANCELLED"`

Defined in: [src/types/index.ts:1265](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1265)

Task has been cancelled before completion.

***

### COMPLETED

> **COMPLETED**: `"COMPLETED"`

Defined in: [src/types/index.ts:1261](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1261)

Task has been completed successfully.

***

### FAILED

> **FAILED**: `"FAILED"`

Defined in: [src/types/index.ts:1263](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1263)

Task has failed during execution.

***

### IN\_PROGRESS

> **IN\_PROGRESS**: `"IN_PROGRESS"`

Defined in: [src/types/index.ts:1259](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1259)

Task has been assigned to an agent and is being processed.

***

### PENDING

> **PENDING**: `"PENDING"`

Defined in: [src/types/index.ts:1257](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1257)

Task has been created but not yet assigned to an agent.

***

### REVIEW

> **REVIEW**: `"REVIEW"`

Defined in: [src/types/index.ts:1269](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1269)

Task is being reviewed for quality assurance.

***

### WAITING

> **WAITING**: `"WAITING"`

Defined in: [src/types/index.ts:1267](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1267)

Task is waiting for external dependencies or manual intervention.
