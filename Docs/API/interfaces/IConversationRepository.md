[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IConversationRepository

# Interface: IConversationRepository

Defined in: [core/interfaces.ts:452](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L452)

Repository for managing ConversationMessages.

## Methods

### addMessages()

> **addMessages**(`threadId`, `messages`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:453](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L453)

#### Parameters

##### threadId

`string`

##### messages

[`ConversationMessage`](ConversationMessage.md)[]

#### Returns

`Promise`\<`void`\>

***

### getMessages()

> **getMessages**(`threadId`, `options`?): `Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>

Defined in: [core/interfaces.ts:454](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L454)

#### Parameters

##### threadId

`string`

##### options?

[`MessageOptions`](MessageOptions.md)

#### Returns

`Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>
