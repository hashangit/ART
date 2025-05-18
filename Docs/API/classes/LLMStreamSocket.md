[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / LLMStreamSocket

# Class: LLMStreamSocket

Defined in: [src/systems/ui/llm-stream-socket.ts:13](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/systems/ui/llm-stream-socket.ts#L13)

A dedicated socket for broadcasting LLM stream events (`StreamEvent`) to UI subscribers.
Extends the generic TypedSocket and implements filtering based on `StreamEvent.type`.

## Extends

- [`TypedSocket`](TypedSocket.md)\<[`StreamEvent`](../interfaces/StreamEvent.md), `StreamEventTypeFilter`\>

## Constructors

### Constructor

> **new LLMStreamSocket**(): `LLMStreamSocket`

Defined in: [src/systems/ui/llm-stream-socket.ts:15](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/systems/ui/llm-stream-socket.ts#L15)

#### Returns

`LLMStreamSocket`

#### Overrides

[`TypedSocket`](TypedSocket.md).[`constructor`](TypedSocket.md#constructor)

## Methods

### clearAllSubscriptions()

> **clearAllSubscriptions**(): `void`

Defined in: [src/systems/ui/typed-socket.ts:99](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/systems/ui/typed-socket.ts#L99)

Clears all subscriptions. Useful for cleanup.

#### Returns

`void`

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`clearAllSubscriptions`](TypedSocket.md#clearallsubscriptions)

***

### getHistory()?

> `optional` **getHistory**(`_filter`?, `_options`?): `Promise`\<[`StreamEvent`](../interfaces/StreamEvent.md)[]\>

Defined in: [src/systems/ui/typed-socket.ts:91](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/systems/ui/typed-socket.ts#L91)

Optional: Retrieves historical data. This base implementation is empty.
Subclasses might implement this by interacting with repositories.

#### Parameters

##### \_filter?

`StreamEventTypeFilter`

##### \_options?

###### limit?

`number`

###### threadId?

`string`

#### Returns

`Promise`\<[`StreamEvent`](../interfaces/StreamEvent.md)[]\>

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`getHistory`](TypedSocket.md#gethistory)

***

### notify()

> **notify**(`data`, `options`?, `filterCheck`?): `void`

Defined in: [src/systems/ui/typed-socket.ts:55](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/systems/ui/typed-socket.ts#L55)

Notifies all relevant subscribers with new data.

#### Parameters

##### data

[`StreamEvent`](../interfaces/StreamEvent.md)

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

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`notify`](TypedSocket.md#notify)

***

### notifyStreamEvent()

> **notifyStreamEvent**(`event`): `void`

Defined in: [src/systems/ui/llm-stream-socket.ts:25](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/systems/ui/llm-stream-socket.ts#L25)

Notifies subscribers about a new LLM stream event.
Filters based on event type if a filter is provided during subscription.

#### Parameters

##### event

[`StreamEvent`](../interfaces/StreamEvent.md)

The StreamEvent data.

#### Returns

`void`

***

### subscribe()

> **subscribe**(`callback`, `filter`?, `options`?): [`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

Defined in: [src/systems/ui/typed-socket.ts:33](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/systems/ui/typed-socket.ts#L33)

Subscribes a callback function to receive notifications.

#### Parameters

##### callback

(`data`) => `void`

The function to call when new data is notified.

##### filter?

`StreamEventTypeFilter`

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
