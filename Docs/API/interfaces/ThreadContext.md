[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ThreadContext

# Interface: ThreadContext

Defined in: [types/index.ts:202](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L202)

Encapsulates the configuration and state for a specific thread.

## Properties

### config

> **config**: [`ThreadConfig`](ThreadConfig.md)

Defined in: [types/index.ts:204](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L204)

The configuration settings (`ThreadConfig`) currently active for the thread.

***

### state

> **state**: `null` \| [`AgentState`](AgentState.md)

Defined in: [types/index.ts:206](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L206)

The persistent state (`AgentState`) associated with the thread, or `null` if no state exists.
