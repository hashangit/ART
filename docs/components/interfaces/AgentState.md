[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentState

# Interface: AgentState

Defined in: [src/types/index.ts:599](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L599)

Represents non-configuration state associated with an agent or thread.
Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)

 AgentState

## Indexable

\[`key`: `string`\]: `any`

Allows for other arbitrary properties to be stored in the agent's state.

## Properties

### data

> **data**: `any`

Defined in: [src/types/index.ts:604](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L604)

The primary data payload of the agent's state. Structure is application-defined.

***

### version?

> `optional` **version**: `number`

Defined in: [src/types/index.ts:609](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L609)

An optional version number for the agent's state, useful for migrations or tracking changes.
