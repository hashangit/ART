[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / CallOptions

# Interface: CallOptions

Defined in: [types/index.ts:293](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L293)

Options for configuring an LLM call.

## Indexable

\[`key`: `string`\]: `any`

Additional key-value pairs representing provider-specific parameters (e.g., `temperature`, `max_tokens`, `model`). These often override defaults set in `ThreadConfig`.

## Properties

### onThought()?

> `optional` **onThought**: (`thought`) => `void`

Defined in: [types/index.ts:303](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L303)

An optional callback function invoked when the LLM streams intermediate 'thoughts' or reasoning steps.

#### Parameters

##### thought

`string`

#### Returns

`void`

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/index.ts:301](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L301)

Optional session ID.

***

### threadId

> **threadId**: `string`

Defined in: [types/index.ts:295](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L295)

The mandatory thread ID, used by the ReasoningEngine to fetch thread-specific configuration (e.g., model, params) via StateManager.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:297](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L297)

Optional trace ID for correlation.

***

### userId?

> `optional` **userId**: `string`

Defined in: [types/index.ts:299](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L299)

Optional user ID.
