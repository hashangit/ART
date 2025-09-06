[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IA2ATaskRepository

# Interface: IA2ATaskRepository

Defined in: [src/core/interfaces.ts:550](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L550)

Interface for managing A2A (Agent-to-Agent) task persistence and retrieval.

## Methods

### createTask()

> **createTask**(`task`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:557](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L557)

Creates a new A2A task in the repository.

#### Parameters

##### task

[`A2ATask`](A2ATask.md)

The A2ATask object to create.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the task is successfully stored.

#### Throws

If the task cannot be created (e.g., duplicate taskId, validation errors).

***

### deleteTask()

> **deleteTask**(`taskId`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:582](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L582)

Removes an A2A task from the repository.

#### Parameters

##### taskId

`string`

The unique identifier of the task to delete.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the task is successfully deleted.

#### Throws

If the task is not found or cannot be deleted.

***

### getTask()

> **getTask**(`taskId`): `Promise`\<`null` \| [`A2ATask`](A2ATask.md)\>

Defined in: [src/core/interfaces.ts:565](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L565)

Retrieves an A2A task by its unique identifier.

#### Parameters

##### taskId

`string`

The unique identifier of the task.

#### Returns

`Promise`\<`null` \| [`A2ATask`](A2ATask.md)\>

A promise resolving to the A2ATask object if found, or null if not found.

#### Throws

If an error occurs during retrieval.

***

### getTasksByAgent()

> **getTasksByAgent**(`agentId`, `filter?`): `Promise`\<[`A2ATask`](A2ATask.md)[]\>

Defined in: [src/core/interfaces.ts:602](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L602)

Retrieves tasks assigned to a specific agent.

#### Parameters

##### agentId

`string`

The agent identifier to filter tasks.

##### filter?

Optional filter criteria for task status or priority.

###### priority?

[`A2ATaskPriority`](../enumerations/A2ATaskPriority.md)

###### status?

[`A2ATaskStatus`](../enumerations/A2ATaskStatus.md) \| [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)[]

#### Returns

`Promise`\<[`A2ATask`](A2ATask.md)[]\>

A promise resolving to an array of A2ATask objects assigned to the agent.

***

### getTasksByStatus()

> **getTasksByStatus**(`status`, `options?`): `Promise`\<[`A2ATask`](A2ATask.md)[]\>

Defined in: [src/core/interfaces.ts:613](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L613)

Retrieves tasks based on their current status.

#### Parameters

##### status

The task status(es) to filter by.

[`A2ATaskStatus`](../enumerations/A2ATaskStatus.md) | [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)[]

##### options?

Optional query parameters like limit and pagination.

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<[`A2ATask`](A2ATask.md)[]\>

A promise resolving to an array of A2ATask objects with the specified status.

***

### getTasksByThread()

> **getTasksByThread**(`threadId`, `filter?`): `Promise`\<[`A2ATask`](A2ATask.md)[]\>

Defined in: [src/core/interfaces.ts:590](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L590)

Retrieves tasks associated with a specific thread.

#### Parameters

##### threadId

`string`

The thread identifier to filter tasks.

##### filter?

Optional filter criteria for task status, priority, or assigned agent.

###### assignedAgentId?

`string`

###### priority?

[`A2ATaskPriority`](../enumerations/A2ATaskPriority.md)

###### status?

[`A2ATaskStatus`](../enumerations/A2ATaskStatus.md) \| [`A2ATaskStatus`](../enumerations/A2ATaskStatus.md)[]

#### Returns

`Promise`\<[`A2ATask`](A2ATask.md)[]\>

A promise resolving to an array of A2ATask objects matching the criteria.

***

### updateTask()

> **updateTask**(`taskId`, `updates`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:574](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L574)

Updates an existing A2A task with new information.

#### Parameters

##### taskId

`string`

The unique identifier of the task to update.

##### updates

`Partial`\<[`A2ATask`](A2ATask.md)\>

Partial A2ATask object containing the fields to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the task is successfully updated.

#### Throws

If the task is not found or cannot be updated.
