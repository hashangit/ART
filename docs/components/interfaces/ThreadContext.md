[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ThreadContext

# Interface: ThreadContext

Defined in: [src/types/index.ts:605](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L605)

Encapsulates the configuration and state for a specific thread.

 ThreadContext

## Properties

### config

> **config**: [`ThreadConfig`](ThreadConfig.md)

Defined in: [src/types/index.ts:610](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L610)

The configuration settings (`ThreadConfig`) currently active for the thread.

***

### state

> **state**: `null` \| [`AgentState`](AgentState.md)

Defined in: [src/types/index.ts:615](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L615)

The persistent state (`AgentState`) associated with the thread, or `null` if no state exists.
