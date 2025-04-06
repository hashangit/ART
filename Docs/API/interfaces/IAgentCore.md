[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IAgentCore

# Interface: IAgentCore

Defined in: [core/interfaces.ts:26](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L26)

Interface for the central agent orchestrator.

## Methods

### process()

> **process**(`props`): `Promise`\<[`AgentFinalResponse`](AgentFinalResponse.md)\>

Defined in: [core/interfaces.ts:34](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L34)

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
