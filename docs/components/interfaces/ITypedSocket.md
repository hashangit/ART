[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ITypedSocket

# Interface: ITypedSocket\<DataType, FilterType\>

Defined in: [src/core/interfaces.ts:424](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L424)

Generic interface for a typed publish/subscribe socket.

## Type Parameters

### DataType

`DataType`

### FilterType

`FilterType` = `any`

## Methods

### getHistory()?

> `optional` **getHistory**(`filter?`, `options?`): `Promise`\<`DataType`[]\>

Defined in: [src/core/interfaces.ts:453](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L453)

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

> **notify**(`data`, `options?`): `void`

Defined in: [src/core/interfaces.ts:443](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L443)

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

> **subscribe**(`callback`, `filter?`, `options?`): () => `void`

Defined in: [src/core/interfaces.ts:432](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L432)

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
