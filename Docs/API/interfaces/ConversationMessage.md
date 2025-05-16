[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ConversationMessage

# Interface: ConversationMessage

Defined in: [types/index.ts:26](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L26)

Represents a single message within a conversation thread.

## Properties

### content

> **content**: `string`

Defined in: [types/index.ts:34](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L34)

The textual content of the message.

***

### messageId

> **messageId**: `string`

Defined in: [types/index.ts:28](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L28)

A unique identifier for this specific message.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:38](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L38)

Optional metadata associated with the message (e.g., related observation IDs, tool call info, UI state).

***

### role

> **role**: [`MessageRole`](../enumerations/MessageRole.md)

Defined in: [types/index.ts:32](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L32)

The role of the sender (User, AI, System, or Tool).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:30](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L30)

The identifier of the conversation thread this message belongs to.

***

### timestamp

> **timestamp**: `number`

Defined in: [types/index.ts:36](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L36)

A Unix timestamp (in milliseconds) indicating when the message was created.
