[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentOptions

# Interface: AgentOptions

Defined in: [types/index.ts:212](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L212)

Options to override agent behavior at runtime.

## Properties

### forceTools?

> `optional` **forceTools**: `string`[]

Defined in: [types/index.ts:216](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L216)

Force the use of specific tools, potentially overriding the thread's `enabledTools` for this call (use with caution).

***

### llmParams?

> `optional` **llmParams**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:214](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L214)

Override specific LLM parameters (e.g., temperature, max_tokens) for this call only.

***

### overrideModel?

> `optional` **overrideModel**: `object`

Defined in: [types/index.ts:218](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L218)

Specify a particular reasoning model to use for this call, overriding the thread's default.

#### model

> **model**: `string`

#### provider

> **provider**: `string`
