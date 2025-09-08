[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentOptions

# Interface: AgentOptions

Defined in: [src/types/index.ts:680](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L680)

Options to override agent behavior at runtime.

 AgentOptions

## Properties

### forceTools?

> `optional` **forceTools**: `string`[]

Defined in: [src/types/index.ts:695](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L695)

Force the use of specific tools, potentially overriding the thread's `enabledTools` for this call (use with caution).

***

### llmParams?

> `optional` **llmParams**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:685](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L685)

Override specific LLM parameters (e.g., temperature, max_tokens) for this call only.

***

### overrideModel?

> `optional` **overrideModel**: `object`

Defined in: [src/types/index.ts:700](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L700)

Specify a particular reasoning model to use for this call, overriding the thread's default.

#### model

> **model**: `string`

#### provider

> **provider**: `string`

***

### persona?

> `optional` **persona**: `Partial`\<[`AgentPersona`](AgentPersona.md)\>

Defined in: [src/types/index.ts:721](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L721)

Optional: Defines the identity and high-level guidance for the agent for this specific call.
This overrides both the instance-level and thread-level persona.

***

### promptTemplateId?

> `optional` **promptTemplateId**: `string`

Defined in: [src/types/index.ts:710](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L710)

Override the prompt template used for this specific call.

***

### providerConfig?

> `optional` **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [src/types/index.ts:690](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L690)

Override provider configuration for this specific call.

***

### stream?

> `optional` **stream**: `boolean`

Defined in: [src/types/index.ts:705](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L705)

Request a streaming response for this specific agent process call.

***

### systemPrompt?

> `optional` **systemPrompt**: `string` \| [`SystemPromptOverride`](SystemPromptOverride.md)

Defined in: [src/types/index.ts:715](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L715)

Optional system prompt override/tag to override thread, instance, or agent defaults for this specific call.
