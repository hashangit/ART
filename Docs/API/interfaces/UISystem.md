[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / UISystem

# Interface: UISystem

Defined in: [src/core/interfaces.ts:393](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L393)

Interface for the system providing access to UI communication sockets.

## Methods

### getConversationSocket()

> **getConversationSocket**(): `ConversationSocket`

Defined in: [src/core/interfaces.ts:397](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L397)

Returns the singleton instance of the ConversationSocket.

#### Returns

`ConversationSocket`

***

### getLLMStreamSocket()

> **getLLMStreamSocket**(): [`LLMStreamSocket`](../classes/LLMStreamSocket.md)

Defined in: [src/core/interfaces.ts:399](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L399)

Returns the singleton instance of the LLMStreamSocket.

#### Returns

[`LLMStreamSocket`](../classes/LLMStreamSocket.md)

***

### getObservationSocket()

> **getObservationSocket**(): `ObservationSocket`

Defined in: [src/core/interfaces.ts:395](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/core/interfaces.ts#L395)

Returns the singleton instance of the ObservationSocket.

#### Returns

`ObservationSocket`
