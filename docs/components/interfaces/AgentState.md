[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentState

# Interface: AgentState

Defined in: [src/types/index.ts:588](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L588)

Represents non-configuration state associated with an agent or thread.
Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)

 AgentState

## Indexable

\[`key`: `string`\]: `any`

Allows for other arbitrary properties to be stored in the agent's state.

## Properties

### data

> **data**: `any`

Defined in: [src/types/index.ts:593](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L593)

The primary data payload of the agent's state. Structure is application-defined.

***

### version?

> `optional` **version**: `number`

Defined in: [src/types/index.ts:598](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L598)

An optional version number for the agent's state, useful for migrations or tracking changes.
