[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2ATaskSocket

# Class: A2ATaskSocket

Defined in: [src/systems/ui/a2a-task-socket.ts:54](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L54)

A specialized TypedSocket for handling A2A task status updates and events.
Allows filtering by task status, type, agent, and other criteria.
Can optionally fetch historical task data from a repository.

## Extends

- [`TypedSocket`](TypedSocket.md)\<[`A2ATaskEvent`](../interfaces/A2ATaskEvent.md), [`A2ATaskFilter`](../interfaces/A2ATaskFilter.md)\>

## Constructors

### Constructor

> **new A2ATaskSocket**(`taskRepository?`): `A2ATaskSocket`

Defined in: [src/systems/ui/a2a-task-socket.ts:57](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L57)

#### Parameters

##### taskRepository?

[`IA2ATaskRepository`](../interfaces/IA2ATaskRepository.md)

#### Returns

`A2ATaskSocket`

#### Overrides

[`TypedSocket`](TypedSocket.md).[`constructor`](TypedSocket.md#constructor)

## Methods

### clearAllSubscriptions()

> **clearAllSubscriptions**(): `void`

Defined in: [src/systems/ui/typed-socket.ts:99](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/typed-socket.ts#L99)

Clears all subscriptions. Useful for cleanup.

#### Returns

`void`

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`clearAllSubscriptions`](TypedSocket.md#clearallsubscriptions)

***

### getHistory()

> **getHistory**(`filter?`, `options?`): `Promise`\<[`A2ATaskEvent`](../interfaces/A2ATaskEvent.md)[]\>

Defined in: [src/systems/ui/a2a-task-socket.ts:175](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L175)

Retrieves historical A2A task events, optionally filtered by criteria.
Note: This method constructs events from stored tasks, not from a dedicated event log.

#### Parameters

##### filter?

[`A2ATaskFilter`](../interfaces/A2ATaskFilter.md)

Optional A2ATaskFilter to filter the tasks.

##### options?

Optional threadId and limit.

###### limit?

`number`

###### threadId?

`string`

#### Returns

`Promise`\<[`A2ATaskEvent`](../interfaces/A2ATaskEvent.md)[]\>

A promise resolving to an array of A2A task events.

#### Overrides

[`TypedSocket`](TypedSocket.md).[`getHistory`](TypedSocket.md#gethistory)

***

### notify()

> **notify**(`data`, `options?`, `filterCheck?`): `void`

Defined in: [src/systems/ui/typed-socket.ts:55](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/typed-socket.ts#L55)

Notifies all relevant subscribers with new data.

#### Parameters

##### data

[`A2ATaskEvent`](../interfaces/A2ATaskEvent.md)

The data payload to send to subscribers.

##### options?

Optional targeting options (e.g., targetThreadId).

###### targetSessionId?

`string`

###### targetThreadId?

`string`

##### filterCheck?

(`data`, `filter?`) => `boolean`

A function to check if a subscription's filter matches the data.

#### Returns

`void`

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`notify`](TypedSocket.md#notify)

***

### notifyTaskCompleted()

> **notifyTaskCompleted**(`task`, `metadata?`): `void`

Defined in: [src/systems/ui/a2a-task-socket.ts:145](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L145)

Convenience method to notify about task completion.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The completed A2A task.

##### metadata?

Optional additional metadata about the completion.

###### automatic?

`boolean`

Whether this was an automatic update or manual

###### context?

`Record`\<`string`, `any`\>

Any additional context

###### source?

`string`

The component that triggered the update

#### Returns

`void`

***

### notifyTaskCreated()

> **notifyTaskCreated**(`task`, `metadata?`): `void`

Defined in: [src/systems/ui/a2a-task-socket.ts:85](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L85)

Convenience method to notify about a task creation.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The newly created A2A task.

##### metadata?

Optional additional metadata about the creation.

###### automatic?

`boolean`

Whether this was an automatic update or manual

###### context?

`Record`\<`string`, `any`\>

Any additional context

###### source?

`string`

The component that triggered the update

#### Returns

`void`

***

### notifyTaskDelegated()

> **notifyTaskDelegated**(`task`, `metadata?`): `void`

Defined in: [src/systems/ui/a2a-task-socket.ts:131](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L131)

Convenience method to notify about task delegation.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The delegated A2A task.

##### metadata?

Optional additional metadata about the delegation.

###### automatic?

`boolean`

Whether this was an automatic update or manual

###### context?

`Record`\<`string`, `any`\>

Any additional context

###### source?

`string`

The component that triggered the update

#### Returns

`void`

***

### notifyTaskEvent()

> **notifyTaskEvent**(`event`): `void`

Defined in: [src/systems/ui/a2a-task-socket.ts:67](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L67)

Notifies subscribers about a new A2A task event.

#### Parameters

##### event

[`A2ATaskEvent`](../interfaces/A2ATaskEvent.md)

The A2A task event data.

#### Returns

`void`

***

### notifyTaskFailed()

> **notifyTaskFailed**(`task`, `metadata?`): `void`

Defined in: [src/systems/ui/a2a-task-socket.ts:159](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L159)

Convenience method to notify about task failure.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The failed A2A task.

##### metadata?

Optional additional metadata about the failure.

###### automatic?

`boolean`

Whether this was an automatic update or manual

###### context?

`Record`\<`string`, `any`\>

Any additional context

###### source?

`string`

The component that triggered the update

#### Returns

`void`

***

### notifyTaskUpdated()

> **notifyTaskUpdated**(`task`, `previousStatus?`, `metadata?`): `void`

Defined in: [src/systems/ui/a2a-task-socket.ts:100](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/a2a-task-socket.ts#L100)

Convenience method to notify about a task update.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The updated A2A task.

##### previousStatus?

[`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)

The previous status of the task (if status changed).

##### metadata?

Optional additional metadata about the update.

###### automatic?

`boolean`

Whether this was an automatic update or manual

###### context?

`Record`\<`string`, `any`\>

Any additional context

###### source?

`string`

The component that triggered the update

#### Returns

`void`

***

### subscribe()

> **subscribe**(`callback`, `filter?`, `options?`): [`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

Defined in: [src/systems/ui/typed-socket.ts:33](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/typed-socket.ts#L33)

Subscribes a callback function to receive notifications.

#### Parameters

##### callback

(`data`) => `void`

The function to call when new data is notified.

##### filter?

[`A2ATaskFilter`](../interfaces/A2ATaskFilter.md)

An optional filter to only receive specific types of data.

##### options?

Optional configuration, like a threadId for filtering.

###### threadId?

`string`

#### Returns

[`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

An unsubscribe function.

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`subscribe`](TypedSocket.md#subscribe)
