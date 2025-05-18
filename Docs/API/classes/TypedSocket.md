[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / TypedSocket

# Class: TypedSocket\<DataType, FilterType\>

Defined in: [src/systems/ui/typed-socket.ts:18](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/systems/ui/typed-socket.ts#L18)

A generic class for implementing a publish/subscribe pattern with filtering capabilities.
Designed for decoupling components, particularly UI updates from backend events.

## Extended by

- [`LLMStreamSocket`](LLMStreamSocket.md)

## Type Parameters

### DataType

`DataType`

### FilterType

`FilterType` = `any`

## Constructors

### Constructor

> **new TypedSocket**\<`DataType`, `FilterType`\>(): `TypedSocket`\<`DataType`, `FilterType`\>

Defined in: [src/systems/ui/typed-socket.ts:22](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/systems/ui/typed-socket.ts#L22)

#### Returns

`TypedSocket`\<`DataType`, `FilterType`\>

## Methods

### clearAllSubscriptions()

> **clearAllSubscriptions**(): `void`

Defined in: [src/systems/ui/typed-socket.ts:99](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/systems/ui/typed-socket.ts#L99)

Clears all subscriptions. Useful for cleanup.

#### Returns

`void`

***

### getHistory()?

> `optional` **getHistory**(`_filter`?, `_options`?): `Promise`\<`DataType`[]\>

Defined in: [src/systems/ui/typed-socket.ts:91](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/systems/ui/typed-socket.ts#L91)

Optional: Retrieves historical data. This base implementation is empty.
Subclasses might implement this by interacting with repositories.

#### Parameters

##### \_filter?

`FilterType`

##### \_options?

###### limit?

`number`

###### threadId?

`string`

#### Returns

`Promise`\<`DataType`[]\>

***

### notify()

> **notify**(`data`, `options`?, `filterCheck`?): `void`

Defined in: [src/systems/ui/typed-socket.ts:55](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/systems/ui/typed-socket.ts#L55)

Notifies all relevant subscribers with new data.

#### Parameters

##### data

`DataType`

The data payload to send to subscribers.

##### options?

Optional targeting options (e.g., targetThreadId).

###### targetSessionId?

`string`

###### targetThreadId?

`string`

##### filterCheck?

(`data`, `filter`?) => `boolean`

A function to check if a subscription's filter matches the data.

#### Returns

`void`

***

### subscribe()

> **subscribe**(`callback`, `filter`?, `options`?): [`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

Defined in: [src/systems/ui/typed-socket.ts:33](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/systems/ui/typed-socket.ts#L33)

Subscribes a callback function to receive notifications.

#### Parameters

##### callback

(`data`) => `void`

The function to call when new data is notified.

##### filter?

`FilterType`

An optional filter to only receive specific types of data.

##### options?

Optional configuration, like a threadId for filtering.

###### threadId?

`string`

#### Returns

[`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

An unsubscribe function.
