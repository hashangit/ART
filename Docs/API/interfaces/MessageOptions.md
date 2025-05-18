[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / MessageOptions

# Interface: MessageOptions

Defined in: [src/types/index.ts:562](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L562)

Options for retrieving conversation messages.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [src/types/index.ts:568](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L568)

Retrieve messages created after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [src/types/index.ts:566](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L566)

Retrieve messages created before this Unix timestamp (milliseconds).

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/index.ts:564](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L564)

The maximum number of messages to retrieve.

***

### roles?

> `optional` **roles**: [`MessageRole`](../enumerations/MessageRole.md)[]

Defined in: [src/types/index.ts:570](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L570)

Optionally filter messages by role (e.g., retrieve only 'AI' messages).
