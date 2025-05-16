[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / TypedSocket

# Interface: TypedSocket\<DataType, FilterType\>

Defined in: [core/interfaces.ts:327](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L327)

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

Defined in: [core/interfaces.ts:356](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L356)

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

Defined in: [core/interfaces.ts:346](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L346)

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

Defined in: [core/interfaces.ts:335](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L335)

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
