[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentState

# Interface: AgentState

Defined in: [types/index.ts:194](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L194)

Represents non-configuration state associated with an agent or thread.
Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)

## Indexable

\[`key`: `string`\]: `any`

A flexible object to store persistent, non-configuration data associated with a thread or user (e.g., preferences, summaries, intermediate results). Structure is application-defined.
