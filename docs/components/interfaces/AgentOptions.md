[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentOptions

# Interface: AgentOptions

Defined in: [src/types/index.ts:669](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L669)

Options to override agent behavior at runtime.

 AgentOptions

## Properties

### forceTools?

> `optional` **forceTools**: `string`[]

Defined in: [src/types/index.ts:684](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L684)

Force the use of specific tools, potentially overriding the thread's `enabledTools` for this call (use with caution).

***

### llmParams?

> `optional` **llmParams**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:674](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L674)

Override specific LLM parameters (e.g., temperature, max_tokens) for this call only.

***

### overrideModel?

> `optional` **overrideModel**: `object`

Defined in: [src/types/index.ts:689](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L689)

Specify a particular reasoning model to use for this call, overriding the thread's default.

#### model

> **model**: `string`

#### provider

> **provider**: `string`

***

### persona?

> `optional` **persona**: `Partial`\<[`AgentPersona`](AgentPersona.md)\>

Defined in: [src/types/index.ts:710](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L710)

Optional: Defines the identity and high-level guidance for the agent for this specific call.
This overrides both the instance-level and thread-level persona.

***

### promptTemplateId?

> `optional` **promptTemplateId**: `string`

Defined in: [src/types/index.ts:699](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L699)

Override the prompt template used for this specific call.

***

### providerConfig?

> `optional` **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [src/types/index.ts:679](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L679)

Override provider configuration for this specific call.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/types/index.ts:694](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L694)

Request a streaming response for this specific agent process call.

***

### systemPrompt?

> `optional` **systemPrompt**: `string` \| [`SystemPromptOverride`](SystemPromptOverride.md)

Defined in: [src/types/index.ts:704](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L704)

Optional system prompt override/tag to override thread, instance, or agent defaults for this specific call.
