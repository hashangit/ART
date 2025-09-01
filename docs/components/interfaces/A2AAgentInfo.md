[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / A2AAgentInfo

# Interface: A2AAgentInfo

Defined in: [src/types/index.ts:1293](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1293)

Represents agent information for A2A task assignment.

 A2AAgentInfo

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/types/index.ts:1298](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1298)

Unique identifier for the agent.

***

### agentName

> **agentName**: `string`

Defined in: [src/types/index.ts:1303](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1303)

Human-readable name for the agent.

***

### agentType

> **agentType**: `string`

Defined in: [src/types/index.ts:1308](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1308)

The type or role of the agent (e.g., 'reasoning', 'data-processing', 'synthesis').

***

### authentication?

> `optional` **authentication**: `object`

Defined in: [src/types/index.ts:1328](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1328)

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

Defined in: [src/types/index.ts:1318](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1318)

Agent capabilities or specializations.

***

### endpoint?

> `optional` **endpoint**: `string`

Defined in: [src/types/index.ts:1313](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1313)

Base URL or endpoint for communicating with the agent.

***

### status?

> `optional` **status**: `"available"` \| `"busy"` \| `"offline"`

Defined in: [src/types/index.ts:1323](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1323)

Current load or availability status of the agent.
