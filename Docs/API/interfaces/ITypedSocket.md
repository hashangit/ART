[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ITypedSocket

# Interface: ITypedSocket\<DataType, FilterType\>

Defined in: [src/core/interfaces.ts:339](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L339)

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

Defined in: [src/core/interfaces.ts:368](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L368)

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

Defined in: [src/core/interfaces.ts:358](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L358)

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

Defined in: [src/core/interfaces.ts:347](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L347)

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
