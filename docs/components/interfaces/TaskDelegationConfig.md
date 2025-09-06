[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / TaskDelegationConfig

# Interface: TaskDelegationConfig

Defined in: [src/systems/a2a/TaskDelegationService.ts:12](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/TaskDelegationService.ts#L12)

Configuration options for the TaskDelegationService

## Properties

### callbackUrl?

> `optional` **callbackUrl**: `string`

Defined in: [src/systems/a2a/TaskDelegationService.ts:22](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/TaskDelegationService.ts#L22)

The base callback URL for receiving A2A task updates.

***

### defaultTimeoutMs?

> `optional` **defaultTimeoutMs**: `number`

Defined in: [src/systems/a2a/TaskDelegationService.ts:14](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/TaskDelegationService.ts#L14)

Default timeout for task delegation requests in milliseconds

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/systems/a2a/TaskDelegationService.ts:16](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/TaskDelegationService.ts#L16)

Maximum number of retry attempts for failed requests

***

### retryDelayMs?

> `optional` **retryDelayMs**: `number`

Defined in: [src/systems/a2a/TaskDelegationService.ts:18](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/TaskDelegationService.ts#L18)

Base delay between retry attempts in milliseconds

***

### useExponentialBackoff?

> `optional` **useExponentialBackoff**: `boolean`

Defined in: [src/systems/a2a/TaskDelegationService.ts:20](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/TaskDelegationService.ts#L20)

Whether to use exponential backoff for retries
