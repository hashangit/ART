[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentState

# Interface: AgentState

Defined in: [types/index.ts:174](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L174)

Represents non-configuration state associated with an agent or thread.
Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)

## Indexable

\[`key`: `string`\]: `any`

A flexible object to store persistent, non-configuration data associated with a thread or user (e.g., preferences, summaries, intermediate results). Structure is application-defined.
