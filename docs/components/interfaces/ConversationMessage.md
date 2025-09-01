[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ConversationMessage

# Interface: ConversationMessage

Defined in: [src/types/index.ts:73](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L73)

Represents a single message within a conversation thread.

 ConversationMessage

## Properties

### content

> **content**: `string`

Defined in: [src/types/index.ts:93](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L93)

The textual content of the message.

***

### messageId

> **messageId**: `string`

Defined in: [src/types/index.ts:78](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L78)

A unique identifier for this specific message.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:103](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L103)

Optional metadata associated with the message (e.g., related observation IDs, tool call info, UI state).

***

### role

> **role**: [`MessageRole`](../enumerations/MessageRole.md)

Defined in: [src/types/index.ts:88](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L88)

The role of the sender (User, AI, System, or Tool).

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:83](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L83)

The identifier of the conversation thread this message belongs to.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/types/index.ts:98](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L98)

A Unix timestamp (in milliseconds) indicating when the message was created.
