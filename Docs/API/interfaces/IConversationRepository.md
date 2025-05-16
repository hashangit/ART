[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IConversationRepository

# Interface: IConversationRepository

Defined in: [core/interfaces.ts:440](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L440)

Repository for managing ConversationMessages.

## Methods

### addMessages()

> **addMessages**(`threadId`, `messages`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:441](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L441)

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

Defined in: [core/interfaces.ts:442](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L442)

#### Parameters

##### threadId

`string`

##### options?

[`MessageOptions`](MessageOptions.md)

#### Returns

`Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>
