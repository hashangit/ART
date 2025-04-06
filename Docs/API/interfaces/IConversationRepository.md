[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IConversationRepository

# Interface: IConversationRepository

Defined in: [core/interfaces.ts:412](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L412)

Repository for managing ConversationMessages.

## Methods

### addMessages()

> **addMessages**(`threadId`, `messages`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:413](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L413)

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

Defined in: [core/interfaces.ts:414](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L414)

#### Parameters

##### threadId

`string`

##### options?

[`MessageOptions`](MessageOptions.md)

#### Returns

`Promise`\<[`ConversationMessage`](ConversationMessage.md)[]\>
