[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ConversationSocket

# Interface: ConversationSocket

Defined in: [core/interfaces.ts:372](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L372)

TypedSocket specifically for ConversationMessage data.
FilterType is MessageRole or array of MessageRole.

## Extends

- [`TypedSocket`](TypedSocket.md)\<[`ConversationMessage`](ConversationMessage.md), [`MessageRole`](../enumerations/MessageRole.md) \| [`MessageRole`](../enumerations/MessageRole.md)[]\>

## Methods

### getHistory()?

> `optional` **getHistory**(`filter`?, `options`?): `Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>

Defined in: [core/interfaces.ts:356](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L356)

Optional method to retrieve historical data from the socket's source.

#### Parameters

##### filter?

Optional filter criteria.

[`MessageRole`](../enumerations/MessageRole.md) | [`MessageRole`](../enumerations/MessageRole.md)[]

##### options?

Optional configuration like threadId and limit.

###### limit?

`number`

###### threadId?

`string`

#### Returns

`Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`getHistory`](TypedSocket.md#gethistory)

***

### notify()

> **notify**(`data`, `options`?): `void`

Defined in: [core/interfaces.ts:346](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L346)

Notifies subscribers of new data.

#### Parameters

##### data

[`ConversationMessage`](ConversationMessage.md)

The data payload.

##### options?

Optional targeting information (e.g., specific thread).

###### targetSessionId?

`string`

###### targetThreadId?

`string`

#### Returns

`void`

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`notify`](TypedSocket.md#notify)

***

### subscribe()

> **subscribe**(`callback`, `filter`?, `options`?): () => `void`

Defined in: [core/interfaces.ts:335](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L335)

Subscribes a callback function to receive data updates.

#### Parameters

##### callback

(`data`) => `void`

The function to call with new data.

##### filter?

Optional filter criteria specific to the socket type.

[`MessageRole`](../enumerations/MessageRole.md) | [`MessageRole`](../enumerations/MessageRole.md)[]

##### options?

Optional configuration like target threadId.

###### threadId?

`string`

#### Returns

An unsubscribe function.

> (): `void`

##### Returns

`void`

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`subscribe`](TypedSocket.md#subscribe)
