[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / UISystem

# Class: UISystem

Defined in: [src/systems/ui/ui-system.ts:18](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/ui-system.ts#L18)

Provides access to the UI communication sockets (Observation, Conversation, LLM Stream, and A2A Task).
Instantiates the sockets with their required dependencies.

## Implements

- `UISystem`

## Constructors

### Constructor

> **new UISystem**(`observationRepository`, `conversationRepository`, `a2aTaskRepository?`): `UISystem`

Defined in: [src/systems/ui/ui-system.ts:30](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/ui-system.ts#L30)

Creates an instance of UISystem.

#### Parameters

##### observationRepository

[`IObservationRepository`](../interfaces/IObservationRepository.md)

Repository for observation data, passed to ObservationSocket.

##### conversationRepository

[`IConversationRepository`](../interfaces/IConversationRepository.md)

Repository for conversation data, passed to ConversationSocket.

##### a2aTaskRepository?

[`IA2ATaskRepository`](../interfaces/IA2ATaskRepository.md)

Optional repository for A2A task data, passed to A2ATaskSocket.

#### Returns

`UISystem`

## Methods

### getA2ATaskSocket()

> **getA2ATaskSocket**(): [`A2ATaskSocket`](A2ATaskSocket.md)

Defined in: [src/systems/ui/ui-system.ts:70](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/ui-system.ts#L70)

Gets the singleton instance of the A2ATaskSocket.

#### Returns

[`A2ATaskSocket`](A2ATaskSocket.md)

The A2ATaskSocket instance.

#### Implementation of

`IUISystem.getA2ATaskSocket`

***

### getConversationSocket()

> **getConversationSocket**(): [`ConversationSocket`](ConversationSocket.md)

Defined in: [src/systems/ui/ui-system.ts:54](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/ui-system.ts#L54)

Gets the singleton instance of the ConversationSocket.

#### Returns

[`ConversationSocket`](ConversationSocket.md)

The ConversationSocket instance.

#### Implementation of

`IUISystem.getConversationSocket`

***

### getLLMStreamSocket()

> **getLLMStreamSocket**(): [`LLMStreamSocket`](LLMStreamSocket.md)

Defined in: [src/systems/ui/ui-system.ts:62](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/ui-system.ts#L62)

Gets the singleton instance of the LLMStreamSocket.

#### Returns

[`LLMStreamSocket`](LLMStreamSocket.md)

The LLMStreamSocket instance.

#### Implementation of

`IUISystem.getLLMStreamSocket`

***

### getObservationSocket()

> **getObservationSocket**(): [`ObservationSocket`](ObservationSocket.md)

Defined in: [src/systems/ui/ui-system.ts:46](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/ui/ui-system.ts#L46)

Gets the singleton instance of the ObservationSocket.

#### Returns

[`ObservationSocket`](ObservationSocket.md)

The ObservationSocket instance.

#### Implementation of

`IUISystem.getObservationSocket`
