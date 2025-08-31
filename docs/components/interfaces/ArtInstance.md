[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtInstance

# Interface: ArtInstance

Defined in: [src/core/interfaces.ts:647](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L647)

## Properties

### authManager?

> `readonly` `optional` **authManager**: `null` \| [`AuthManager`](../classes/AuthManager.md)

Defined in: [src/core/interfaces.ts:661](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L661)

Accessor for the Auth Manager, used for handling authentication.

***

### conversationManager

> `readonly` **conversationManager**: [`ConversationManager`](ConversationManager.md)

Defined in: [src/core/interfaces.ts:655](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L655)

Accessor for the Conversation Manager, used for managing message history.

***

### observationManager

> `readonly` **observationManager**: [`ObservationManager`](ObservationManager.md)

Defined in: [src/core/interfaces.ts:659](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L659)

Accessor for the Observation Manager, used for recording and retrieving observations.

***

### process()

> `readonly` **process**: (`props`) => `Promise`\<[`AgentFinalResponse`](AgentFinalResponse.md)\>

Defined in: [src/core/interfaces.ts:649](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L649)

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

> `readonly` **stateManager**: [`StateManager`](StateManager.md)

Defined in: [src/core/interfaces.ts:653](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L653)

Accessor for the State Manager, used for managing thread configuration and state.

***

### toolRegistry

> `readonly` **toolRegistry**: [`ToolRegistry`](ToolRegistry.md)

Defined in: [src/core/interfaces.ts:657](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L657)

Accessor for the Tool Registry, used for managing available tools.

***

### uiSystem

> `readonly` **uiSystem**: [`UISystem`](UISystem.md)

Defined in: [src/core/interfaces.ts:651](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L651)

Accessor for the UI System, used to get sockets for subscriptions.
