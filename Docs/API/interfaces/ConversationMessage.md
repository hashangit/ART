[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ConversationMessage

# Interface: ConversationMessage

Defined in: [types/index.ts:30](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L30)

Represents a single message within a conversation thread.

## Properties

### content

> **content**: `string`

Defined in: [types/index.ts:38](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L38)

The textual content of the message.

***

### messageId

> **messageId**: `string`

Defined in: [types/index.ts:32](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L32)

A unique identifier for this specific message.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:42](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L42)

Optional metadata associated with the message (e.g., related observation IDs, tool call info, UI state).

***

### role

> **role**: [`MessageRole`](../enumerations/MessageRole.md)

Defined in: [types/index.ts:36](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L36)

The role of the sender (User, AI, System, or Tool).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:34](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L34)

The identifier of the conversation thread this message belongs to.

***

### timestamp

> **timestamp**: `number`

Defined in: [types/index.ts:40](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L40)

A Unix timestamp (in milliseconds) indicating when the message was created.
