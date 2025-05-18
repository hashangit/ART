[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / LLMMetadata

# Interface: LLMMetadata

Defined in: [src/types/index.ts:210](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L210)

Structure for holding metadata about an LLM call, typically received via a `METADATA` `StreamEvent`
or parsed from a non-streaming response. Fields are optional as availability varies by provider and stream state.

## Properties

### inputTokens?

> `optional` **inputTokens**: `number`

Defined in: [src/types/index.ts:212](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L212)

The number of tokens in the input prompt, if available.

***

### outputTokens?

> `optional` **outputTokens**: `number`

Defined in: [src/types/index.ts:214](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L214)

The number of tokens generated in the output response, if available.

***

### providerRawUsage?

> `optional` **providerRawUsage**: `any`

Defined in: [src/types/index.ts:224](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L224)

Optional raw usage data provided directly by the LLM provider for extensibility (structure depends on provider).

***

### stopReason?

> `optional` **stopReason**: `string`

Defined in: [src/types/index.ts:222](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L222)

The reason the LLM stopped generating tokens (e.g., 'stop_sequence', 'max_tokens', 'tool_calls'), if available.

***

### thinkingTokens?

> `optional` **thinkingTokens**: `number`

Defined in: [src/types/index.ts:216](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L216)

The number of tokens identified as part of the LLM's internal thinking process (if available from provider).

***

### timeToFirstTokenMs?

> `optional` **timeToFirstTokenMs**: `number`

Defined in: [src/types/index.ts:218](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L218)

The time elapsed (in milliseconds) until the first token was generated in a streaming response, if applicable and available.

***

### totalGenerationTimeMs?

> `optional` **totalGenerationTimeMs**: `number`

Defined in: [src/types/index.ts:220](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L220)

The total time elapsed (in milliseconds) for the entire generation process, if available.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [src/types/index.ts:226](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L226)

The trace ID associated with the LLM call, useful for correlating metadata with the specific request.
