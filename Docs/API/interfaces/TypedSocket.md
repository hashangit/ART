[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / TypedSocket

# Interface: TypedSocket\<DataType, FilterType\>

Defined in: [core/interfaces.ts:301](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L301)

Generic interface for a typed publish/subscribe socket.

## Extended by

- [`ObservationSocket`](ObservationSocket.md)
- [`ConversationSocket`](ConversationSocket.md)

## Type Parameters

### DataType

`DataType`

### FilterType

`FilterType` = `any`

## Methods

### getHistory()?

> `optional` **getHistory**(`filter`?, `options`?): `Promise`\<`DataType`[]\>

Defined in: [core/interfaces.ts:330](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L330)

Optional method to retrieve historical data from the socket's source.

#### Parameters

##### filter?

`FilterType`

Optional filter criteria.

##### options?

Optional configuration like threadId and limit.

###### limit?

`number`

###### threadId?

`string`

#### Returns

`Promise`\<`DataType`[]\>

***

### notify()

> **notify**(`data`, `options`?): `void`

Defined in: [core/interfaces.ts:320](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L320)

Notifies subscribers of new data.

#### Parameters

##### data

`DataType`

The data payload.

##### options?

Optional targeting information (e.g., specific thread).

###### targetSessionId?

`string`

###### targetThreadId?

`string`

#### Returns

`void`

***

### subscribe()

> **subscribe**(`callback`, `filter`?, `options`?): () => `void`

Defined in: [core/interfaces.ts:309](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/interfaces.ts#L309)

Subscribes a callback function to receive data updates.

#### Parameters

##### callback

(`data`) => `void`

The function to call with new data.

##### filter?

`FilterType`

Optional filter criteria specific to the socket type.

##### options?

Optional configuration like target threadId.

###### threadId?

`string`

#### Returns

An unsubscribe function.

> (): `void`

##### Returns

`void`
