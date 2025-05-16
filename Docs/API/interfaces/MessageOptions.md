[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / MessageOptions

# Interface: MessageOptions

Defined in: [types/index.ts:536](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L536)

Options for retrieving conversation messages.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [types/index.ts:542](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L542)

Retrieve messages created after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [types/index.ts:540](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L540)

Retrieve messages created before this Unix timestamp (milliseconds).

***

### limit?

> `optional` **limit**: `number`

Defined in: [types/index.ts:538](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L538)

The maximum number of messages to retrieve.

***

### roles?

> `optional` **roles**: [`MessageRole`](../enumerations/MessageRole.md)[]

Defined in: [types/index.ts:544](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L544)

Optionally filter messages by role (e.g., retrieve only 'AI' messages).
