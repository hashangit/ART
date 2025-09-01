[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / UISystem

# Interface: UISystem

Defined in: [src/core/interfaces.ts:463](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L463)

Interface for the system providing access to UI communication sockets.

## Methods

### getA2ATaskSocket()

> **getA2ATaskSocket**(): [`A2ATaskSocket`](../classes/A2ATaskSocket.md)

Defined in: [src/core/interfaces.ts:471](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L471)

Returns the singleton instance of the A2ATaskSocket.

#### Returns

[`A2ATaskSocket`](../classes/A2ATaskSocket.md)

***

### getConversationSocket()

> **getConversationSocket**(): [`ConversationSocket`](../classes/ConversationSocket.md)

Defined in: [src/core/interfaces.ts:467](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L467)

Returns the singleton instance of the ConversationSocket.

#### Returns

[`ConversationSocket`](../classes/ConversationSocket.md)

***

### getLLMStreamSocket()

> **getLLMStreamSocket**(): [`LLMStreamSocket`](../classes/LLMStreamSocket.md)

Defined in: [src/core/interfaces.ts:469](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L469)

Returns the singleton instance of the LLMStreamSocket.

#### Returns

[`LLMStreamSocket`](../classes/LLMStreamSocket.md)

***

### getObservationSocket()

> **getObservationSocket**(): [`ObservationSocket`](../classes/ObservationSocket.md)

Defined in: [src/core/interfaces.ts:465](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L465)

Returns the singleton instance of the ObservationSocket.

#### Returns

[`ObservationSocket`](../classes/ObservationSocket.md)
