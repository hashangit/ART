[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ObservationSocket

# Class: ObservationSocket

Defined in: [src/systems/ui/observation-socket.ts:12](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/observation-socket.ts#L12)

A specialized TypedSocket for handling Observation data.
Allows filtering by ObservationType.
Can optionally fetch historical observations from a repository.

## Extends

- [`TypedSocket`](TypedSocket.md)\<[`Observation`](../interfaces/Observation.md), [`ObservationType`](../enumerations/ObservationType.md) \| [`ObservationType`](../enumerations/ObservationType.md)[]\>

## Constructors

### Constructor

> **new ObservationSocket**(`observationRepository?`): `ObservationSocket`

Defined in: [src/systems/ui/observation-socket.ts:15](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/observation-socket.ts#L15)

#### Parameters

##### observationRepository?

[`IObservationRepository`](../interfaces/IObservationRepository.md)

#### Returns

`ObservationSocket`

#### Overrides

[`TypedSocket`](TypedSocket.md).[`constructor`](TypedSocket.md#constructor)

## Methods

### clearAllSubscriptions()

> **clearAllSubscriptions**(): `void`

Defined in: [src/systems/ui/typed-socket.ts:99](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/typed-socket.ts#L99)

Clears all subscriptions. Useful for cleanup.

#### Returns

`void`

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`clearAllSubscriptions`](TypedSocket.md#clearallsubscriptions)

***

### getHistory()

> **getHistory**(`filter?`, `options?`): `Promise`\<[`Observation`](../interfaces/Observation.md)[]\>

Defined in: [src/systems/ui/observation-socket.ts:47](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/observation-socket.ts#L47)

Retrieves historical observations, optionally filtered by type and thread.
Requires an ObservationRepository to be configured.

#### Parameters

##### filter?

Optional ObservationType or array of types to filter by.

[`ObservationType`](../enumerations/ObservationType.md) | [`ObservationType`](../enumerations/ObservationType.md)[]

##### options?

Optional threadId and limit.

###### limit?

`number`

###### threadId?

`string`

#### Returns

`Promise`\<[`Observation`](../interfaces/Observation.md)[]\>

A promise resolving to an array of observations.

#### Overrides

[`TypedSocket`](TypedSocket.md).[`getHistory`](TypedSocket.md#gethistory)

***

### notify()

> **notify**(`data`, `options?`, `filterCheck?`): `void`

Defined in: [src/systems/ui/typed-socket.ts:55](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/typed-socket.ts#L55)

Notifies all relevant subscribers with new data.

#### Parameters

##### data

[`Observation`](../interfaces/Observation.md)

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

### notifyObservation()

> **notifyObservation**(`observation`): `void`

Defined in: [src/systems/ui/observation-socket.ts:25](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/observation-socket.ts#L25)

Notifies subscribers about a new observation.

#### Parameters

##### observation

[`Observation`](../interfaces/Observation.md)

The observation data.

#### Returns

`void`

***

### subscribe()

> **subscribe**(`callback`, `filter?`, `options?`): [`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

Defined in: [src/systems/ui/typed-socket.ts:33](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/typed-socket.ts#L33)

Subscribes a callback function to receive notifications.

#### Parameters

##### callback

(`data`) => `void`

The function to call when new data is notified.

##### filter?

An optional filter to only receive specific types of data.

[`ObservationType`](../enumerations/ObservationType.md) | [`ObservationType`](../enumerations/ObservationType.md)[]

##### options?

Optional configuration, like a threadId for filtering.

###### threadId?

`string`

#### Returns

[`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

An unsubscribe function.

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`subscribe`](TypedSocket.md#subscribe)
