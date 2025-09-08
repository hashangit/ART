[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtInstance

# Interface: ArtInstance

Defined in: [src/core/interfaces.ts:662](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L662)

## Properties

### authManager?

> `readonly` `optional` **authManager**: `null` \| [`AuthManager`](../classes/AuthManager.md)

Defined in: [src/core/interfaces.ts:676](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L676)

Accessor for the Auth Manager, used for handling authentication.

***

### conversationManager

> `readonly` **conversationManager**: [`ConversationManager`](ConversationManager.md)

Defined in: [src/core/interfaces.ts:670](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L670)

Accessor for the Conversation Manager, used for managing message history.

***

### observationManager

> `readonly` **observationManager**: [`ObservationManager`](ObservationManager.md)

Defined in: [src/core/interfaces.ts:674](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L674)

Accessor for the Observation Manager, used for recording and retrieving observations.

***

### process()

> `readonly` **process**: (`props`) => `Promise`\<[`AgentFinalResponse`](AgentFinalResponse.md)\>

Defined in: [src/core/interfaces.ts:664](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L664)

The main method to process a user query using the configured Agent Core.

Processes a user query through the configured agent reasoning pattern (e.g., PES).
Orchestrates interactions between various ART subsystems.

#### Parameters

##### props

[`AgentProps`](AgentProps.md)

The input properties for the agent execution, including the query, thread ID, and injected dependencies.

#### Returns

`Promise`\<[`AgentFinalResponse`](AgentFinalResponse.md)\>

A promise that resolves with the final agent response and execution metadata.

#### Throws

If a critical error occurs during orchestration that prevents completion.

***

### stateManager

> `readonly` **stateManager**: `StateManager`

Defined in: [src/core/interfaces.ts:668](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L668)

Accessor for the State Manager, used for managing thread configuration and state.

***

### toolRegistry

> `readonly` **toolRegistry**: `ToolRegistry`

Defined in: [src/core/interfaces.ts:672](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L672)

Accessor for the Tool Registry, used for managing available tools.

***

### uiSystem

> `readonly` **uiSystem**: `UISystem`

Defined in: [src/core/interfaces.ts:666](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L666)

Accessor for the UI System, used to get sockets for subscriptions.
