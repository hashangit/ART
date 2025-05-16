[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / CallOptions

# Interface: CallOptions

Defined in: [types/index.ts:377](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L377)

Options for configuring an LLM call, including streaming and context information.

## Indexable

\[`key`: `string`\]: `any`

Additional key-value pairs representing provider-specific parameters (e.g., `temperature`, `max_tokens`, `top_p`). These often override defaults set in `ThreadConfig`.

## Properties

### callContext?

> `optional` **callContext**: `string`

Defined in: [types/index.ts:396](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L396)

Provides context for the LLM call, allowing adapters to differentiate
between agent-level thoughts and final synthesis calls for token typing.
Agent Core MUST provide this.

***

### providerConfig

> **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [types/index.ts:402](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L402)

Carries the specific target provider and configuration for this call.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/index.ts:385](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L385)

Optional session ID.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [types/index.ts:390](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L390)

Request a streaming response from the LLM provider.
Adapters MUST check this flag.

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:379](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L379)

The mandatory thread ID, used by the ReasoningEngine to fetch thread-specific configuration (e.g., model, params) via StateManager.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:381](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L381)

Optional trace ID for correlation.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:383](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L383)

Optional user ID.
