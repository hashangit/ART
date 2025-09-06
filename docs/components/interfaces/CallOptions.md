[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / CallOptions

# Interface: CallOptions

Defined in: [src/types/index.ts:820](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L820)

Options for configuring an LLM call, including streaming and context information.

 CallOptions

## Indexable

\[`key`: `string`\]: `any`

Additional key-value pairs representing provider-specific parameters (e.g., `temperature`, `max_tokens`, `top_p`). These often override defaults set in `ThreadConfig`.

## Properties

### callContext?

> `optional` **callContext**: `string`

Defined in: [src/types/index.ts:853](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L853)

Provides context for the LLM call, allowing adapters to differentiate
between agent-level thoughts and final synthesis calls for token typing.
Agent Core MUST provide this.

***

### providerConfig

> **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [src/types/index.ts:863](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L863)

Carries the specific target provider and configuration for this call.

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [src/types/index.ts:840](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L840)

Optional session ID.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/types/index.ts:846](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L846)

Request a streaming response from the LLM provider.
Adapters MUST check this flag.

***

### threadId

> **threadId**: `string`

Defined in: [src/types/index.ts:825](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L825)

The mandatory thread ID, used by the ReasoningEngine to fetch thread-specific configuration (e.g., model, params) via StateManager.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:830](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L830)

Optional trace ID for correlation.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/types/index.ts:835](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L835)

Optional user ID.
