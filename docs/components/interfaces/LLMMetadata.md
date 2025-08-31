[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / LLMMetadata

# Interface: LLMMetadata

Defined in: [src/types/index.ts:320](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L320)

Structure for holding metadata about an LLM call, typically received via a `METADATA` `StreamEvent`
or parsed from a non-streaming response. Fields are optional as availability varies by provider and stream state.

 LLMMetadata

## Properties

### inputTokens?

> `optional` **inputTokens**: `number`

Defined in: [src/types/index.ts:325](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L325)

The number of tokens in the input prompt, if available.

***

### outputTokens?

> `optional` **outputTokens**: `number`

Defined in: [src/types/index.ts:330](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L330)

The number of tokens generated in the output response, if available.

***

### providerRawUsage?

> `optional` **providerRawUsage**: `any`

Defined in: [src/types/index.ts:355](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L355)

Optional raw usage data provided directly by the LLM provider for extensibility (structure depends on provider).

***

### stopReason?

> `optional` **stopReason**: `string`

Defined in: [src/types/index.ts:350](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L350)

The reason the LLM stopped generating tokens (e.g., 'stop_sequence', 'max_tokens', 'tool_calls'), if available.

***

### thinkingTokens?

> `optional` **thinkingTokens**: `number`

Defined in: [src/types/index.ts:335](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L335)

The number of tokens identified as part of the LLM's internal thinking process (if available from provider).

***

### timeToFirstTokenMs?

> `optional` **timeToFirstTokenMs**: `number`

Defined in: [src/types/index.ts:340](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L340)

The time elapsed (in milliseconds) until the first token was generated in a streaming response, if applicable and available.

***

### totalGenerationTimeMs?

> `optional` **totalGenerationTimeMs**: `number`

Defined in: [src/types/index.ts:345](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L345)

The total time elapsed (in milliseconds) for the entire generation process, if available.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:360](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L360)

The trace ID associated with the LLM call, useful for correlating metadata with the specific request.
