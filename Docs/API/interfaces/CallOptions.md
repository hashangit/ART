[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / CallOptions

# Interface: CallOptions

Defined in: [src/types/index.ts:403](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L403)

Options for configuring an LLM call, including streaming and context information.

## Indexable

\[`key`: `string`\]: `any`

Additional key-value pairs representing provider-specific parameters (e.g., `temperature`, `max_tokens`, `top_p`). These often override defaults set in `ThreadConfig`.

## Properties

### callContext?

> `optional` **callContext**: `string`

Defined in: [src/types/index.ts:422](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L422)

Provides context for the LLM call, allowing adapters to differentiate
between agent-level thoughts and final synthesis calls for token typing.
Agent Core MUST provide this.

***

### providerConfig

> **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [src/types/index.ts:428](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L428)

Carries the specific target provider and configuration for this call.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [src/types/index.ts:411](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L411)

Optional session ID.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/types/index.ts:416](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L416)

Request a streaming response from the LLM provider.
Adapters MUST check this flag.

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:405](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L405)

The mandatory thread ID, used by the ReasoningEngine to fetch thread-specific configuration (e.g., model, params) via StateManager.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:407](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L407)

Optional trace ID for correlation.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/types/index.ts:409](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L409)

Optional user ID.
