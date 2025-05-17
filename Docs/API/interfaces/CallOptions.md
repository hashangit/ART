[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / CallOptions

# Interface: CallOptions

Defined in: [types/index.ts:385](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L385)

Options for configuring an LLM call, including streaming and context information.

## Indexable

\[`key`: `string`\]: `any`

Additional key-value pairs representing provider-specific parameters (e.g., `temperature`, `max_tokens`, `top_p`). These often override defaults set in `ThreadConfig`.

## Properties

### callContext?

> `optional` **callContext**: `string`

Defined in: [types/index.ts:404](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L404)

Provides context for the LLM call, allowing adapters to differentiate
between agent-level thoughts and final synthesis calls for token typing.
Agent Core MUST provide this.

***

### providerConfig

> **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [types/index.ts:410](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L410)

Carries the specific target provider and configuration for this call.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/index.ts:393](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L393)

Optional session ID.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [types/index.ts:398](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L398)

Request a streaming response from the LLM provider.
Adapters MUST check this flag.

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:387](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L387)

The mandatory thread ID, used by the ReasoningEngine to fetch thread-specific configuration (e.g., model, params) via StateManager.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:389](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L389)

Optional trace ID for correlation.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:391](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L391)

Optional user ID.
