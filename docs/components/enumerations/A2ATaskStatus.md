[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskStatus

# Enumeration: A2ATaskStatus

Defined in: [src/types/index.ts:1243](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1243)

Represents the possible states of an A2A (Agent-to-Agent) task.

## Enumeration Members

### CANCELLED

> **CANCELLED**: `"CANCELLED"`

Defined in: [src/types/index.ts:1253](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1253)

Task has been cancelled before completion.

***

### COMPLETED

> **COMPLETED**: `"COMPLETED"`

Defined in: [src/types/index.ts:1249](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1249)

Task has been completed successfully.

***

### FAILED

> **FAILED**: `"FAILED"`

Defined in: [src/types/index.ts:1251](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1251)

Task has failed during execution.

***

### IN\_PROGRESS

> **IN\_PROGRESS**: `"IN_PROGRESS"`

Defined in: [src/types/index.ts:1247](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1247)

Task has been assigned to an agent and is being processed.

***

### PENDING

> **PENDING**: `"PENDING"`

Defined in: [src/types/index.ts:1245](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1245)

Task has been created but not yet assigned to an agent.

***

### REVIEW

> **REVIEW**: `"REVIEW"`

Defined in: [src/types/index.ts:1257](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1257)

Task is being reviewed for quality assurance.

***

### WAITING

> **WAITING**: `"WAITING"`

Defined in: [src/types/index.ts:1255](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1255)

Task is waiting for external dependencies or manual intervention.
