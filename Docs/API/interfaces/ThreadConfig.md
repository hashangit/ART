[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ThreadConfig

# Interface: ThreadConfig

Defined in: [types/index.ts:150](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L150)

Configuration specific to a conversation thread.

## Properties

### enabledTools

> **enabledTools**: `string`[]

Defined in: [types/index.ts:162](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L162)

An array of tool names (matching `ToolSchema.name`) that are permitted for use within this thread.

***

### historyLimit

> **historyLimit**: `number`

Defined in: [types/index.ts:164](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L164)

The maximum number of past messages (`ConversationMessage` objects) to retrieve for context.

***

### reasoning

> **reasoning**: `object`

Defined in: [types/index.ts:152](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L152)

Configuration for the Reasoning System for this thread.

#### model

> **model**: `string`

The specific model identifier to use with the provider (e.g., 'gpt-4o', 'claude-3-5-sonnet-20240620').

#### parameters?

> `optional` **parameters**: `Record`\<`string`, `any`\>

Optional provider-specific parameters (e.g., temperature, max_tokens, top_p).

#### provider

> **provider**: `string`

Identifier for the primary LLM provider adapter to use (e.g., 'openai', 'anthropic').

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [types/index.ts:166](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L166)

An optional system prompt string that overrides any default system prompt for this thread.
