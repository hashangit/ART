[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ConversationSocket

# Class: ConversationSocket

Defined in: [src/systems/ui/conversation-socket.ts:12](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/conversation-socket.ts#L12)

A specialized TypedSocket for handling ConversationMessage data.
Allows filtering by MessageRole.
Can optionally fetch historical messages from a repository.

## Extends

- [`TypedSocket`](TypedSocket.md)\<[`ConversationMessage`](../interfaces/ConversationMessage.md), [`MessageRole`](../enumerations/MessageRole.md) \| [`MessageRole`](../enumerations/MessageRole.md)[]\>

## Constructors

### Constructor

> **new ConversationSocket**(`conversationRepository?`): `ConversationSocket`

Defined in: [src/systems/ui/conversation-socket.ts:15](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/conversation-socket.ts#L15)

#### Parameters

##### conversationRepository?

[`IConversationRepository`](../interfaces/IConversationRepository.md)

#### Returns

`ConversationSocket`

#### Overrides

[`TypedSocket`](TypedSocket.md).[`constructor`](TypedSocket.md#constructor)

## Methods

### clearAllSubscriptions()

> **clearAllSubscriptions**(): `void`

Defined in: [src/systems/ui/typed-socket.ts:99](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/typed-socket.ts#L99)

Clears all subscriptions. Useful for cleanup.

#### Returns

`void`

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`clearAllSubscriptions`](TypedSocket.md#clearallsubscriptions)

***

### getHistory()

> **getHistory**(`filter?`, `options?`): `Promise`\<[`ConversationMessage`](../interfaces/ConversationMessage.md)[]\>

Defined in: [src/systems/ui/conversation-socket.ts:47](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/conversation-socket.ts#L47)

Retrieves historical messages, optionally filtered by role and thread.
Requires a ConversationRepository to be configured.

#### Parameters

##### filter?

Optional MessageRole or array of roles to filter by.

[`MessageRole`](../enumerations/MessageRole.md) | [`MessageRole`](../enumerations/MessageRole.md)[]

##### options?

Optional threadId and limit.

###### limit?

`number`

###### threadId?

`string`

#### Returns

`Promise`\<[`ConversationMessage`](../interfaces/ConversationMessage.md)[]\>

A promise resolving to an array of messages.

#### Overrides

[`TypedSocket`](TypedSocket.md).[`getHistory`](TypedSocket.md#gethistory)

***

### notify()

> **notify**(`data`, `options?`, `filterCheck?`): `void`

Defined in: [src/systems/ui/typed-socket.ts:55](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/typed-socket.ts#L55)

Notifies all relevant subscribers with new data.

#### Parameters

##### data

[`ConversationMessage`](../interfaces/ConversationMessage.md)

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

### notifyMessage()

> **notifyMessage**(`message`): `void`

Defined in: [src/systems/ui/conversation-socket.ts:25](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/conversation-socket.ts#L25)

Notifies subscribers about a new conversation message.

#### Parameters

##### message

[`ConversationMessage`](../interfaces/ConversationMessage.md)

The conversation message data.

#### Returns

`void`

***

### subscribe()

> **subscribe**(`callback`, `filter?`, `options?`): [`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

Defined in: [src/systems/ui/typed-socket.ts:33](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/ui/typed-socket.ts#L33)

Subscribes a callback function to receive notifications.

#### Parameters

##### callback

(`data`) => `void`

The function to call when new data is notified.

##### filter?

An optional filter to only receive specific types of data.

[`MessageRole`](../enumerations/MessageRole.md) | [`MessageRole`](../enumerations/MessageRole.md)[]

##### options?

Optional configuration, like a threadId for filtering.

###### threadId?

`string`

#### Returns

[`UnsubscribeFunction`](../type-aliases/UnsubscribeFunction.md)

An unsubscribe function.

#### Inherited from

[`TypedSocket`](TypedSocket.md).[`subscribe`](TypedSocket.md#subscribe)
