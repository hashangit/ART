[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ThreadContext

# Interface: ThreadContext

Defined in: [src/types/index.ts:622](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L622)

Encapsulates the configuration and state for a specific thread.

 ThreadContext

## Properties

### config

> **config**: [`ThreadConfig`](ThreadConfig.md)

Defined in: [src/types/index.ts:627](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L627)

The configuration settings (`ThreadConfig`) currently active for the thread.

***

### state

> **state**: `null` \| [`AgentState`](AgentState.md)

Defined in: [src/types/index.ts:632](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L632)

The persistent state (`AgentState`) associated with the thread, or `null` if no state exists.
