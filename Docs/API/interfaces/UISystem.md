[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / UISystem

# Interface: UISystem

Defined in: [core/interfaces.ts:393](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L393)

Interface for the system providing access to UI communication sockets.

## Methods

### getConversationSocket()

> **getConversationSocket**(): `ConversationSocket`

Defined in: [core/interfaces.ts:397](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L397)

Returns the singleton instance of the ConversationSocket.

#### Returns

`ConversationSocket`

***

### getLLMStreamSocket()

> **getLLMStreamSocket**(): `LLMStreamSocket`

Defined in: [core/interfaces.ts:399](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L399)

Returns the singleton instance of the LLMStreamSocket.

#### Returns

`LLMStreamSocket`

***

### getObservationSocket()

> **getObservationSocket**(): `ObservationSocket`

Defined in: [core/interfaces.ts:395](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L395)

Returns the singleton instance of the ObservationSocket.

#### Returns

`ObservationSocket`
