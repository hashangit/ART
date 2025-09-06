[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IConversationRepository

# Interface: IConversationRepository

Defined in: [src/core/interfaces.ts:524](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L524)

Repository for managing ConversationMessages.

## Methods

### addMessages()

> **addMessages**(`threadId`, `messages`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:525](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L525)

#### Parameters

##### threadId

`string`

##### messages

[`ConversationMessage`](ConversationMessage.md)[]

#### Returns

`Promise`\<`void`\>

***

### getMessages()

> **getMessages**(`threadId`, `options?`): `Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>

Defined in: [src/core/interfaces.ts:526](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L526)

#### Parameters

##### threadId

`string`

##### options?

[`MessageOptions`](MessageOptions.md)

#### Returns

`Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>
