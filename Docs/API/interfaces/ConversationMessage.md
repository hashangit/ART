[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ConversationMessage

# Interface: ConversationMessage

Defined in: [types/index.ts:16](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L16)

Represents a single message within a conversation thread.

## Properties

### content

> **content**: `string`

Defined in: [types/index.ts:24](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L24)

The textual content of the message.

***

### messageId

> **messageId**: `string`

Defined in: [types/index.ts:18](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L18)

A unique identifier for this specific message.

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:28](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L28)

Optional metadata associated with the message (e.g., related observation IDs, tool call info, UI state).

***

### role

> **role**: [`MessageRole`](../enumerations/MessageRole.md)

Defined in: [types/index.ts:22](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L22)

The role of the sender (User, AI, System, or Tool).

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:20](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L20)

The identifier of the conversation thread this message belongs to.

***

### timestamp

> **timestamp**: `number`

Defined in: [types/index.ts:26](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L26)

A Unix timestamp (in milliseconds) indicating when the message was created.
