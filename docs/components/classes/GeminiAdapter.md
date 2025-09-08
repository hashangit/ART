[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / GeminiAdapter

# Class: GeminiAdapter

Defined in: [src/integrations/reasoning/gemini.ts:33](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/gemini.ts#L33)

Adapter for Google's Gemini models.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new GeminiAdapter**(`options`): `GeminiAdapter`

Defined in: [src/integrations/reasoning/gemini.ts:45](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/gemini.ts#L45)

Creates an instance of GeminiAdapter.

#### Parameters

##### options

[`GeminiAdapterOptions`](../interfaces/GeminiAdapterOptions.md)

Configuration options for the adapter.

#### Returns

`GeminiAdapter`

#### Throws

If `apiKey` is missing in the options.

#### See

https://ai.google.dev/api/rest

## Properties

### providerName

> `readonly` **providerName**: `"gemini"` = `'gemini'`

Defined in: [src/integrations/reasoning/gemini.ts:34](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/gemini.ts#L34)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/integrations/reasoning/gemini.ts:111](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/gemini.ts#L111)

Makes a call to the configured Gemini model.
Translates the `ArtStandardPrompt` into the Gemini API format, sends the request
using the `@google/genai` SDK, and yields `StreamEvent` objects representing
the response (tokens, metadata, errors, end signal).

Handles both streaming and non-streaming requests based on `options.stream`.

Thinking tokens (Gemini):
- On supported Gemini models (e.g., `gemini-2.5-*`), you can enable thought output via `config.thinkingConfig`.
- This adapter reads provider-specific flags from the call options:
  - `options.gemini.thinking.includeThoughts: boolean` — when `true`, requests thought (reasoning) output.
  - `options.gemini.thinking.thinkingBudget?: number` — optional token budget for thinking.
- When enabled and supported, the adapter will attempt to differentiate thought vs response parts and set
  `StreamEvent.tokenType` accordingly:
  - For planning calls (`callContext === 'AGENT_THOUGHT'`): `AGENT_THOUGHT_LLM_THINKING` or `AGENT_THOUGHT_LLM_RESPONSE`.
  - For synthesis calls (`callContext === 'FINAL_SYNTHESIS'`): `FINAL_SYNTHESIS_LLM_THINKING` or `FINAL_SYNTHESIS_LLM_RESPONSE`.
- `LLMMetadata.thinkingTokens` will be populated if the provider reports separate thinking token usage.
- If the SDK/model does not expose thought parts, the adapter falls back to labeling tokens as `...LLM_RESPONSE`.

#### Parameters

##### prompt

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The standardized prompt messages.

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Options for the LLM call, including streaming preference, model override, and execution context.

#### Returns

`Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

An async iterable that yields `StreamEvent` objects.
  - `TOKEN`: Contains a chunk of the response text. `tokenType` indicates if it's part of agent thought or final synthesis.
            When Gemini thinking is enabled and available, `tokenType` may be one of the `...LLM_THINKING` or
            `...LLM_RESPONSE` variants to separate thought vs response tokens.
  - `METADATA`: Contains information like stop reason, token counts, and timing, yielded once at the end.
  - `ERROR`: Contains any error encountered during translation, SDK call, or response processing.
  - `END`: Signals the completion of the stream.

#### See

 - 
 - 
 - 
 - 
 - https://ai.google.dev/api/rest/v1beta/models/generateContent

#### Example

```ts
// Enable Gemini thinking (if supported by the selected model)
const stream = await geminiAdapter.call(prompt, {
  threadId,
  stream: true,
  callContext: 'FINAL_SYNTHESIS',
  providerConfig, // your RuntimeProviderConfig
  gemini: {
    thinking: { includeThoughts: true, thinkingBudget: 8096 }
  }
});
for await (const evt of stream) {
  if (evt.type === 'TOKEN') {
    // evt.tokenType may be FINAL_SYNTHESIS_LLM_THINKING or FINAL_SYNTHESIS_LLM_RESPONSE
  }
}
```

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
