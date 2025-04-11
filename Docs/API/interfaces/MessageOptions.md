[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / MessageOptions

# Interface: MessageOptions

Defined in: [types/index.ts:333](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L333)

Options for retrieving conversation messages.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [types/index.ts:339](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L339)

Retrieve messages created after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [types/index.ts:337](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L337)

Retrieve messages created before this Unix timestamp (milliseconds).

***

### limit?

> `optional` **limit**: `number`

Defined in: [types/index.ts:335](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L335)

The maximum number of messages to retrieve.

***

### roles?

> `optional` **roles**: [`MessageRole`](../enumerations/MessageRole.md)[]

Defined in: [types/index.ts:341](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L341)

Optionally filter messages by role (e.g., retrieve only 'AI' messages).
