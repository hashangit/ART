[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentState

# Interface: AgentState

Defined in: [types/index.ts:270](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L270)

Represents non-configuration state associated with an agent or thread.
Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)

## Indexable

\[`key`: `string`\]: `any`

A flexible object to store persistent, non-configuration data associated with a thread or user (e.g., preferences, summaries, intermediate results). Structure is application-defined.
