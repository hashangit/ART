[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / MessageOptions

# Interface: MessageOptions

Defined in: [types/index.ts:313](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L313)

Options for retrieving conversation messages.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [types/index.ts:319](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L319)

Retrieve messages created after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [types/index.ts:317](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L317)

Retrieve messages created before this Unix timestamp (milliseconds).

***

### limit?

> `optional` **limit**: `number`

Defined in: [types/index.ts:315](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L315)

The maximum number of messages to retrieve.

***

### roles?

> `optional` **roles**: [`MessageRole`](../enumerations/MessageRole.md)[]

Defined in: [types/index.ts:321](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L321)

Optionally filter messages by role (e.g., retrieve only 'AI' messages).
