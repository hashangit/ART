[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ThreadContext

# Interface: ThreadContext

Defined in: [types/index.ts:278](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L278)

Encapsulates the configuration and state for a specific thread.

## Properties

### config

> **config**: [`ThreadConfig`](ThreadConfig.md)

Defined in: [types/index.ts:280](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L280)

The configuration settings (`ThreadConfig`) currently active for the thread.

***

### state

> **state**: `null` \| [`AgentState`](AgentState.md)

Defined in: [types/index.ts:282](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L282)

The persistent state (`AgentState`) associated with the thread, or `null` if no state exists.
