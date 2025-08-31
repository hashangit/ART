[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2AAgentInfo

# Interface: A2AAgentInfo

Defined in: [src/types/index.ts:1281](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1281)

Represents agent information for A2A task assignment.

 A2AAgentInfo

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/types/index.ts:1286](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1286)

Unique identifier for the agent.

***

### agentName

> **agentName**: `string`

Defined in: [src/types/index.ts:1291](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1291)

Human-readable name for the agent.

***

### agentType

> **agentType**: `string`

Defined in: [src/types/index.ts:1296](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1296)

The type or role of the agent (e.g., 'reasoning', 'data-processing', 'synthesis').

***

### authentication?

> `optional` **authentication**: `object`

Defined in: [src/types/index.ts:1316](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1316)

Authentication configuration for communicating with the agent.

#### apiKey?

> `optional` **apiKey**: `string`

API key for authorization (if type is 'api_key').

#### token?

> `optional` **token**: `string`

Bearer token for authorization (if type is 'bearer').

#### type

> **type**: `"bearer"` \| `"api_key"` \| `"none"`

Type of authentication required.

***

### capabilities?

> `optional` **capabilities**: `string`[]

Defined in: [src/types/index.ts:1306](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1306)

Agent capabilities or specializations.

***

### endpoint?

> `optional` **endpoint**: `string`

Defined in: [src/types/index.ts:1301](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1301)

Base URL or endpoint for communicating with the agent.

***

### status?

> `optional` **status**: `"available"` \| `"busy"` \| `"offline"`

Defined in: [src/types/index.ts:1311](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1311)

Current load or availability status of the agent.
