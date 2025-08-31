[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentOptions

# Interface: AgentOptions

Defined in: [src/types/index.ts:663](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L663)

Options to override agent behavior at runtime.

 AgentOptions

## Properties

### forceTools?

> `optional` **forceTools**: `string`[]

Defined in: [src/types/index.ts:678](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L678)

Force the use of specific tools, potentially overriding the thread's `enabledTools` for this call (use with caution).

***

### llmParams?

> `optional` **llmParams**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:668](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L668)

Override specific LLM parameters (e.g., temperature, max_tokens) for this call only.

***

### overrideModel?

> `optional` **overrideModel**: `object`

Defined in: [src/types/index.ts:683](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L683)

Specify a particular reasoning model to use for this call, overriding the thread's default.

#### model

> **model**: `string`

#### provider

> **provider**: `string`

***

### promptTemplateId?

> `optional` **promptTemplateId**: `string`

Defined in: [src/types/index.ts:693](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L693)

Override the prompt template used for this specific call.

***

### providerConfig?

> `optional` **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [src/types/index.ts:673](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L673)

Override provider configuration for this specific call.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/types/index.ts:688](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L688)

Request a streaming response for this specific agent process call.

***

### systemPrompt?

> `optional` **systemPrompt**: `string` \| [`SystemPromptOverride`](SystemPromptOverride.md)

Defined in: [src/types/index.ts:698](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L698)

Optional system prompt override/tag to override thread, instance, or agent defaults for this specific call.
