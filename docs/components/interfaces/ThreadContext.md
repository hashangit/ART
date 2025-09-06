[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ThreadContext

# Interface: ThreadContext

Defined in: [src/types/index.ts:611](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L611)

Encapsulates the configuration and state for a specific thread.

 ThreadContext

## Properties

### config

> **config**: [`ThreadConfig`](ThreadConfig.md)

Defined in: [src/types/index.ts:616](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L616)

The configuration settings (`ThreadConfig`) currently active for the thread.

***

### state

> **state**: `null` \| [`AgentState`](AgentState.md)

Defined in: [src/types/index.ts:621](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L621)

The persistent state (`AgentState`) associated with the thread, or `null` if no state exists.
