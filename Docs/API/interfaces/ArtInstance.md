[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtInstance

# Interface: ArtInstance

Defined in: [core/interfaces.ts:468](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/core/interfaces.ts#L468)

Represents the fully initialized and configured ART Framework client instance.
This object is the main entry point for interacting with the framework after setup.
It provides access to the core processing method and key subsystems.

## Properties

### conversationManager

> `readonly` **conversationManager**: [`ConversationManager`](ConversationManager.md)

Defined in: [core/interfaces.ts:476](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/core/interfaces.ts#L476)

Accessor for the Conversation Manager, used for managing message history.

***

### observationManager

> `readonly` **observationManager**: [`ObservationManager`](ObservationManager.md)

Defined in: [core/interfaces.ts:480](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/core/interfaces.ts#L480)

Accessor for the Observation Manager, used for recording and retrieving observations.

***

### process()

> `readonly` **process**: (`props`) => `Promise`\<[`AgentFinalResponse`](AgentFinalResponse.md)\>

Defined in: [core/interfaces.ts:470](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/core/interfaces.ts#L470)

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

Defined in: [core/interfaces.ts:474](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/core/interfaces.ts#L474)

Accessor for the State Manager, used for managing thread configuration and state.

***

### toolRegistry

> `readonly` **toolRegistry**: [`ToolRegistry`](ToolRegistry.md)

Defined in: [core/interfaces.ts:478](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/core/interfaces.ts#L478)

Accessor for the Tool Registry, used for managing available tools.

***

### uiSystem

> `readonly` **uiSystem**: [`UISystem`](UISystem.md)

Defined in: [core/interfaces.ts:472](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/core/interfaces.ts#L472)

Accessor for the UI System, used to get sockets for subscriptions.
