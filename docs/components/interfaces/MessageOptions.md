[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / MessageOptions

# Interface: MessageOptions

Defined in: [src/types/index.ts:1075](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1075)

Options for retrieving conversation messages.

 MessageOptions

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [src/types/index.ts:1090](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1090)

Retrieve messages created after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [src/types/index.ts:1085](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1085)

Retrieve messages created before this Unix timestamp (milliseconds).

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/index.ts:1080](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1080)

The maximum number of messages to retrieve.

***

### roles?

> `optional` **roles**: [`MessageRole`](../enumerations/MessageRole.md)[]

Defined in: [src/types/index.ts:1095](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1095)

Optionally filter messages by role (e.g., retrieve only 'AI' messages).
