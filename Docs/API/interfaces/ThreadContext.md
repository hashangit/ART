[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ThreadContext

# Interface: ThreadContext

Defined in: [types/index.ts:182](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L182)

Encapsulates the configuration and state for a specific thread.

## Properties

### config

> **config**: [`ThreadConfig`](ThreadConfig.md)

Defined in: [types/index.ts:184](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L184)

The configuration settings (`ThreadConfig`) currently active for the thread.

***

### state

> **state**: `null` \| [`AgentState`](AgentState.md)

Defined in: [types/index.ts:186](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L186)

The persistent state (`AgentState`) associated with the thread, or `null` if no state exists.
