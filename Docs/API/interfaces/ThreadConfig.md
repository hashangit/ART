[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ThreadConfig

# Interface: ThreadConfig

Defined in: [types/index.ts:170](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L170)

Configuration specific to a conversation thread.

## Properties

### enabledTools

> **enabledTools**: `string`[]

Defined in: [types/index.ts:182](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L182)

An array of tool names (matching `ToolSchema.name`) that are permitted for use within this thread.

***

### historyLimit

> **historyLimit**: `number`

Defined in: [types/index.ts:184](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L184)

The maximum number of past messages (`ConversationMessage` objects) to retrieve for context.

***

### reasoning

> **reasoning**: `object`

Defined in: [types/index.ts:172](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L172)

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

Defined in: [types/index.ts:186](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L186)

An optional system prompt string that overrides any default system prompt for this thread.
