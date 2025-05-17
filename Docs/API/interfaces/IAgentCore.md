[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IAgentCore

# Interface: IAgentCore

Defined in: [core/interfaces.ts:54](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L54)

Interface for the central agent orchestrator.

## Methods

### process()

> **process**(`props`): `Promise`\<[`AgentFinalResponse`](AgentFinalResponse.md)\>

Defined in: [core/interfaces.ts:62](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L62)

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
