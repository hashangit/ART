[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskEvent

# Interface: A2ATaskEvent

Defined in: [src/systems/ui/a2a-task-socket.ts:29](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/ui/a2a-task-socket.ts#L29)

Event data structure for A2A task updates.
Contains the updated task and metadata about the change.

## Properties

### eventType

> **eventType**: `"created"` \| `"updated"` \| `"completed"` \| `"failed"` \| `"cancelled"` \| `"status_changed"` \| `"delegated"`

Defined in: [src/systems/ui/a2a-task-socket.ts:33](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/ui/a2a-task-socket.ts#L33)

The type of event that occurred

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/systems/ui/a2a-task-socket.ts:39](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/ui/a2a-task-socket.ts#L39)

Additional metadata about the event

#### automatic?

> `optional` **automatic**: `boolean`

Whether this was an automatic update or manual

#### context?

> `optional` **context**: `Record`\<`string`, `any`\>

Any additional context

#### source?

> `optional` **source**: `string`

The component that triggered the update

***

### previousStatus?

> `optional` **previousStatus**: [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

Defined in: [src/systems/ui/a2a-task-socket.ts:37](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/ui/a2a-task-socket.ts#L37)

Previous status (if applicable) for status change events

***

### task

> **task**: [`A2ATask`](A2ATask.md)

Defined in: [src/systems/ui/a2a-task-socket.ts:31](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/ui/a2a-task-socket.ts#L31)

The A2A task that was updated

***

### timestamp

> **timestamp**: `number`

Defined in: [src/systems/ui/a2a-task-socket.ts:35](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/ui/a2a-task-socket.ts#L35)

Timestamp when the event occurred
