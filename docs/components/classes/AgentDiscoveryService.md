[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentDiscoveryService

# Class: AgentDiscoveryService

Defined in: [src/systems/a2a/AgentDiscoveryService.ts:82](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/AgentDiscoveryService.ts#L82)

Service for discovering A2A protocol compatible agents.
Implements the A2A discovery standards for finding and identifying compatible agents.

## Constructors

### Constructor

> **new AgentDiscoveryService**(`config?`): `AgentDiscoveryService`

Defined in: [src/systems/a2a/AgentDiscoveryService.ts:91](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/AgentDiscoveryService.ts#L91)

Creates an instance of AgentDiscoveryService.

#### Parameters

##### config?

`Partial`\<[`AgentDiscoveryConfig`](../interfaces/AgentDiscoveryConfig.md)\>

The configuration for the service.

#### Returns

`AgentDiscoveryService`

#### See

A2AAgentCard

## Methods

### clearCache()

> **clearCache**(): `void`

Defined in: [src/systems/a2a/AgentDiscoveryService.ts:359](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/AgentDiscoveryService.ts#L359)

Clears the agent cache.

#### Returns

`void`

***

### discoverAgents()

> **discoverAgents**(`traceId?`): `Promise`\<[`A2AAgentInfo`](../interfaces/A2AAgentInfo.md)[]\>

Defined in: [src/systems/a2a/AgentDiscoveryService.ts:109](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/AgentDiscoveryService.ts#L109)

Discovers all available A2A agents from the discovery endpoint.

#### Parameters

##### traceId?

`string`

Optional trace ID for request tracking

#### Returns

`Promise`\<[`A2AAgentInfo`](../interfaces/A2AAgentInfo.md)[]\>

Promise resolving to array of discovered A2A agents

#### Throws

If discovery fails or no agents are found

***

### findAgentsByCapabilities()

> **findAgentsByCapabilities**(`capabilities`, `traceId?`): `Promise`\<[`A2AAgentInfo`](../interfaces/A2AAgentInfo.md)[]\>

Defined in: [src/systems/a2a/AgentDiscoveryService.ts:340](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/AgentDiscoveryService.ts#L340)

Finds agents by specific capabilities.

#### Parameters

##### capabilities

`string`[]

Array of required capabilities

##### traceId?

`string`

Optional trace ID for request tracking

#### Returns

`Promise`\<[`A2AAgentInfo`](../interfaces/A2AAgentInfo.md)[]\>

Promise resolving to agents that have all specified capabilities

***

### findTopAgentsForTask()

> **findTopAgentsForTask**(`taskType`, `topK`, `traceId?`): `Promise`\<[`A2AAgentInfo`](../interfaces/A2AAgentInfo.md)[]\>

Defined in: [src/systems/a2a/AgentDiscoveryService.ts:199](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/a2a/AgentDiscoveryService.ts#L199)

Finds the top K A2A agents for a specific task type, ranked by suitability.
This method acts as a pre-filter, returning a list of the most promising candidates
for an LLM to make the final selection from.

#### Parameters

##### taskType

`string`

The type of task (e.g., 'analysis', 'research', 'generation')

##### topK

`number` = `3`

The maximum number of agents to return.

##### traceId?

`string`

Optional trace ID for request tracking.

#### Returns

`Promise`\<[`A2AAgentInfo`](../interfaces/A2AAgentInfo.md)[]\>

Promise resolving to a ranked array of matching agents.

#### Remarks

TODO: Revisit and enhance the scoring algorithm.
