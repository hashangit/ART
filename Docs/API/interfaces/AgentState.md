[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentState

# Interface: AgentState

Defined in: [src/types/index.ts:292](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L292)

Represents non-configuration state associated with an agent or thread.
Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)

## Indexable

\[`key`: `string`\]: `any`

Allows for other arbitrary properties to be stored in the agent's state.

## Properties

### data

> **data**: `any`

Defined in: [src/types/index.ts:294](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L294)

The primary data payload of the agent's state. Structure is application-defined.

***

### version?

> `optional` **version**: `number`

Defined in: [src/types/index.ts:296](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L296)

An optional version number for the agent's state, useful for migrations or tracking changes.
