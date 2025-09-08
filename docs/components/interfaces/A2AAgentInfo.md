[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2AAgentInfo

# Interface: A2AAgentInfo

Defined in: [src/types/index.ts:1304](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1304)

Represents agent information for A2A task assignment.

 A2AAgentInfo

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/types/index.ts:1309](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1309)

Unique identifier for the agent.

***

### agentName

> **agentName**: `string`

Defined in: [src/types/index.ts:1314](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1314)

Human-readable name for the agent.

***

### agentType

> **agentType**: `string`

Defined in: [src/types/index.ts:1319](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1319)

The type or role of the agent (e.g., 'reasoning', 'data-processing', 'synthesis').

***

### authentication?

> `optional` **authentication**: `object`

Defined in: [src/types/index.ts:1339](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1339)

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

Defined in: [src/types/index.ts:1329](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1329)

Agent capabilities or specializations.

***

### endpoint?

> `optional` **endpoint**: `string`

Defined in: [src/types/index.ts:1324](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1324)

Base URL or endpoint for communicating with the agent.

***

### status?

> `optional` **status**: `"available"` \| `"busy"` \| `"offline"`

Defined in: [src/types/index.ts:1334](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1334)

Current load or availability status of the agent.
