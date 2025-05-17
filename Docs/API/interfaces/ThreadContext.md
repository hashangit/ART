[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ThreadContext

# Interface: ThreadContext

Defined in: [types/index.ts:286](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L286)

Encapsulates the configuration and state for a specific thread.

## Properties

### config

> **config**: [`ThreadConfig`](ThreadConfig.md)

Defined in: [types/index.ts:288](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L288)

The configuration settings (`ThreadConfig`) currently active for the thread.

***

### state

> **state**: `null` \| [`AgentState`](AgentState.md)

Defined in: [types/index.ts:290](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L290)

The persistent state (`AgentState`) associated with the thread, or `null` if no state exists.
