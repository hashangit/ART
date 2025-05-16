[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / LLMMetadata

# Interface: LLMMetadata

Defined in: [types/index.ts:188](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L188)

Structure for holding metadata about an LLM call, typically received via a `METADATA` `StreamEvent`
or parsed from a non-streaming response. Fields are optional as availability varies by provider and stream state.

## Properties

### inputTokens?

> `optional` **inputTokens**: `number`

Defined in: [types/index.ts:190](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L190)

The number of tokens in the input prompt, if available.

***

### outputTokens?

> `optional` **outputTokens**: `number`

Defined in: [types/index.ts:192](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L192)

The number of tokens generated in the output response, if available.

***

### providerRawUsage?

> `optional` **providerRawUsage**: `any`

Defined in: [types/index.ts:202](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L202)

Optional raw usage data provided directly by the LLM provider for extensibility (structure depends on provider).

***

### stopReason?

> `optional` **stopReason**: `string`

Defined in: [types/index.ts:200](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L200)

The reason the LLM stopped generating tokens (e.g., 'stop_sequence', 'max_tokens', 'tool_calls'), if available.

***

### thinkingTokens?

> `optional` **thinkingTokens**: `number`

Defined in: [types/index.ts:194](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L194)

The number of tokens identified as part of the LLM's internal thinking process (if available from provider).

***

### timeToFirstTokenMs?

> `optional` **timeToFirstTokenMs**: `number`

Defined in: [types/index.ts:196](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L196)

The time elapsed (in milliseconds) until the first token was generated in a streaming response, if applicable and available.

***

### totalGenerationTimeMs?

> `optional` **totalGenerationTimeMs**: `number`

Defined in: [types/index.ts:198](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L198)

The total time elapsed (in milliseconds) for the entire generation process, if available.

***

### traceId?

> `optional` **traceId**: `string`

Defined in: [types/index.ts:204](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L204)

The trace ID associated with the LLM call, useful for correlating metadata with the specific request.
