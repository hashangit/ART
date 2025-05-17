[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / MessageOptions

# Interface: MessageOptions

Defined in: [types/index.ts:544](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L544)

Options for retrieving conversation messages.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [types/index.ts:550](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L550)

Retrieve messages created after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [types/index.ts:548](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L548)

Retrieve messages created before this Unix timestamp (milliseconds).

***

### limit?

> `optional` **limit**: `number`

Defined in: [types/index.ts:546](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L546)

The maximum number of messages to retrieve.

***

### roles?

> `optional` **roles**: [`MessageRole`](../enumerations/MessageRole.md)[]

Defined in: [types/index.ts:552](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L552)

Optionally filter messages by role (e.g., retrieve only 'AI' messages).
