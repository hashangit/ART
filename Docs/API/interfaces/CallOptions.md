[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / CallOptions

# Interface: CallOptions

Defined in: [types/index.ts:273](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L273)

Options for configuring an LLM call.

## Indexable

\[`key`: `string`\]: `any`

Additional key-value pairs representing provider-specific parameters (e.g., `temperature`, `max_tokens`, `model`). These often override defaults set in `ThreadConfig`.

## Properties

### onThought()?

> `optional` **onThought**: (`thought`) => `void`

Defined in: [types/index.ts:283](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L283)

An optional callback function invoked when the LLM streams intermediate 'thoughts' or reasoning steps.

#### Parameters

##### thought

`string`

#### Returns

`void`

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/index.ts:281](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L281)

Optional session ID.

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:275](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L275)

The mandatory thread ID, used by the ReasoningEngine to fetch thread-specific configuration (e.g., model, params) via StateManager.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:277](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L277)

Optional trace ID for correlation.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:279](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L279)

Optional user ID.
