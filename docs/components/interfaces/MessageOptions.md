[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / MessageOptions

# Interface: MessageOptions

Defined in: [src/types/index.ts:1063](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1063)

Options for retrieving conversation messages.

 MessageOptions

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [src/types/index.ts:1078](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1078)

Retrieve messages created after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [src/types/index.ts:1073](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1073)

Retrieve messages created before this Unix timestamp (milliseconds).

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/index.ts:1068](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1068)

The maximum number of messages to retrieve.

***

### roles?

> `optional` **roles**: [`MessageRole`](../enumerations/MessageRole.md)[]

Defined in: [src/types/index.ts:1083](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1083)

Optionally filter messages by role (e.g., retrieve only 'AI' messages).
