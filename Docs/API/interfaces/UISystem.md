[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / UISystem

# Interface: UISystem

Defined in: [core/interfaces.ts:381](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L381)

Interface for the system providing access to UI communication sockets.

## Methods

### getConversationSocket()

> **getConversationSocket**(): `ConversationSocket`

Defined in: [core/interfaces.ts:385](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L385)

Returns the singleton instance of the ConversationSocket.

#### Returns

`ConversationSocket`

***

### getLLMStreamSocket()

> **getLLMStreamSocket**(): `LLMStreamSocket`

Defined in: [core/interfaces.ts:387](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L387)

Returns the singleton instance of the LLMStreamSocket.

#### Returns

`LLMStreamSocket`

***

### getObservationSocket()

> **getObservationSocket**(): `ObservationSocket`

Defined in: [core/interfaces.ts:383](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L383)

Returns the singleton instance of the ObservationSocket.

#### Returns

`ObservationSocket`
