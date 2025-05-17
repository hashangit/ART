[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AgentOptions

# Interface: AgentOptions

Defined in: [types/index.ts:316](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L316)

Options to override agent behavior at runtime.

## Properties

### forceTools?

> `optional` **forceTools**: `string`[]

Defined in: [types/index.ts:322](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L322)

Force the use of specific tools, potentially overriding the thread's `enabledTools` for this call (use with caution).

***

### llmParams?

> `optional` **llmParams**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:318](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L318)

Override specific LLM parameters (e.g., temperature, max_tokens) for this call only.

***

### overrideModel?

> `optional` **overrideModel**: `object`

Defined in: [types/index.ts:324](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L324)

Specify a particular reasoning model to use for this call, overriding the thread's default.

#### model

> **model**: `string`

#### provider

> **provider**: `string`

***

### promptTemplateId?

> `optional` **promptTemplateId**: `string`

Defined in: [types/index.ts:328](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L328)

Override the prompt template used for this specific call.

***

### providerConfig?

> `optional` **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [types/index.ts:320](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L320)

Override provider configuration for this specific call.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [types/index.ts:326](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L326)

Request a streaming response for this specific agent process call.
