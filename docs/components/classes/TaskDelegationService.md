[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / TaskDelegationService

# Class: TaskDelegationService

Defined in: [src/systems/a2a/TaskDelegationService.ts:73](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/a2a/TaskDelegationService.ts#L73)

Service responsible for delegating A2A tasks to remote agents.
Implements the A2A protocol for task submission, tracking, and completion.

This service handles:
- Finding suitable agents for specific task types
- Submitting tasks to remote agents via HTTP API
- Tracking task status and handling updates
- Managing task lifecycle according to A2A protocol
- Error handling and retry logic
- Integration with local task repository for persistence

## Constructors

### Constructor

> **new TaskDelegationService**(`taskRepository`, `config?`): `TaskDelegationService`

Defined in: [src/systems/a2a/TaskDelegationService.ts:82](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/a2a/TaskDelegationService.ts#L82)

Creates an instance of TaskDelegationService.

#### Parameters

##### taskRepository

[`IA2ATaskRepository`](../interfaces/IA2ATaskRepository.md)

The repository for persisting task status.

##### config?

[`TaskDelegationConfig`](../interfaces/TaskDelegationConfig.md) = `{}`

Configuration for the service.

#### Returns

`TaskDelegationService`

## Methods

### cancelTask()

> **cancelTask**(`task`, `traceId?`): `Promise`\<`boolean`\>

Defined in: [src/systems/a2a/TaskDelegationService.ts:460](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/a2a/TaskDelegationService.ts#L460)

Cancels a delegated task on the remote agent.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The A2A task to cancel

##### traceId?

`string`

Optional trace ID for request tracking

#### Returns

`Promise`\<`boolean`\>

Promise resolving to whether cancellation was successful

***

### checkTaskStatus()

> **checkTaskStatus**(`task`, `traceId?`): `Promise`\<`null` \| [`TaskStatusResponse`](../interfaces/TaskStatusResponse.md)\>

Defined in: [src/systems/a2a/TaskDelegationService.ts:338](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/a2a/TaskDelegationService.ts#L338)

Checks the status of a delegated task from the remote agent.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The A2A task to check status for

##### traceId?

`string`

Optional trace ID for request tracking

#### Returns

`Promise`\<`null` \| [`TaskStatusResponse`](../interfaces/TaskStatusResponse.md)\>

Promise resolving to the current task status

***

### delegateTask()

> **delegateTask**(`task`, `traceId?`): `Promise`\<`null` \| [`A2ATask`](../interfaces/A2ATask.md)\>

Defined in: [src/systems/a2a/TaskDelegationService.ts:140](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/a2a/TaskDelegationService.ts#L140)

Delegates a single A2A task to a suitable remote agent.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The A2A task to delegate

##### traceId?

`string`

Optional trace ID for request tracking

#### Returns

`Promise`\<`null` \| [`A2ATask`](../interfaces/A2ATask.md)\>

Promise resolving to the updated task or null if delegation failed

***

### delegateTasks()

> **delegateTasks**(`tasks`, `traceId?`): `Promise`\<[`A2ATask`](../interfaces/A2ATask.md)[]\>

Defined in: [src/systems/a2a/TaskDelegationService.ts:108](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/a2a/TaskDelegationService.ts#L108)

Delegates a list of A2A tasks to suitable remote agents.
For each task, finds the best agent and submits the task.

#### Parameters

##### tasks

[`A2ATask`](../interfaces/A2ATask.md)[]

Array of A2A tasks to delegate

##### traceId?

`string`

Optional trace ID for request tracking

#### Returns

`Promise`\<[`A2ATask`](../interfaces/A2ATask.md)[]\>

Promise resolving to array of successfully delegated tasks

***

### updateTaskFromRemoteStatus()

> **updateTaskFromRemoteStatus**(`task`, `statusResponse`, `traceId?`): `Promise`\<[`A2ATask`](../interfaces/A2ATask.md)\>

Defined in: [src/systems/a2a/TaskDelegationService.ts:394](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/a2a/TaskDelegationService.ts#L394)

Updates a local A2A task based on remote status information.

#### Parameters

##### task

[`A2ATask`](../interfaces/A2ATask.md)

The local A2A task to update

##### statusResponse

[`TaskStatusResponse`](../interfaces/TaskStatusResponse.md)

The status response from the remote agent

##### traceId?

`string`

Optional trace ID for request tracking

#### Returns

`Promise`\<[`A2ATask`](../interfaces/A2ATask.md)\>

Promise resolving to the updated task
