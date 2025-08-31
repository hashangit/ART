[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentState

# Interface: AgentState

Defined in: [src/types/index.ts:582](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L582)

Represents non-configuration state associated with an agent or thread.
Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)

 AgentState

## Indexable

\[`key`: `string`\]: `any`

Allows for other arbitrary properties to be stored in the agent's state.

## Properties

### data

> **data**: `any`

Defined in: [src/types/index.ts:587](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L587)

The primary data payload of the agent's state. Structure is application-defined.

***

### version?

> `optional` **version**: `number`

Defined in: [src/types/index.ts:592](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L592)

An optional version number for the agent's state, useful for migrations or tracking changes.
