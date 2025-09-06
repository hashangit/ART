[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskFilter

# Interface: A2ATaskFilter

Defined in: [src/systems/ui/a2a-task-socket.ts:10](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L10)

Filter type for A2A task notifications.
Allows filtering by task status, task type, agent, or priority.

## Properties

### priority?

> `optional` **priority**: `string`

Defined in: [src/systems/ui/a2a-task-socket.ts:20](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L20)

Filter by task priority

***

### sourceAgentId?

> `optional` **sourceAgentId**: `string`

Defined in: [src/systems/ui/a2a-task-socket.ts:16](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L16)

Filter by source agent ID

***

### status?

> `optional` **status**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md) \| [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)[]

Defined in: [src/systems/ui/a2a-task-socket.ts:12](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L12)

Filter by task status (single status or array of statuses)

***

### targetAgentId?

> `optional` **targetAgentId**: `string`

Defined in: [src/systems/ui/a2a-task-socket.ts:18](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L18)

Filter by target agent ID

***

### taskType?

> `optional` **taskType**: `string` \| `string`[]

Defined in: [src/systems/ui/a2a-task-socket.ts:14](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L14)

Filter by task type (e.g., 'analyze', 'synthesize', 'transform')

***

### threadId?

> `optional` **threadId**: `string`

Defined in: [src/systems/ui/a2a-task-socket.ts:22](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L22)

Filter by thread ID
