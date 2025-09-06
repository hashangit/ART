[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / GeminiAdapter

# Class: GeminiAdapter

Defined in: [src/integrations/reasoning/gemini.ts:33](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/gemini.ts#L33)

Adapter for Google's Gemini models.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new GeminiAdapter**(`options`): `GeminiAdapter`

Defined in: [src/integrations/reasoning/gemini.ts:45](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/gemini.ts#L45)

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

Defined in: [src/integrations/reasoning/gemini.ts:34](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/gemini.ts#L34)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/integrations/reasoning/gemini.ts:80](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/gemini.ts#L80)

Makes a call to the configured Gemini model.
Translates the `ArtStandardPrompt` into the Gemini API format, sends the request
using the `@google/genai` SDK, and yields `StreamEvent` objects representing
the response (tokens, metadata, errors, end signal).

Handles both streaming and non-streaming requests based on `options.stream`.

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
  - `TOKEN`: Contains a chunk of the response text. `tokenType` indicates if it's part of agent thought or final synthesis. When Gemini thinking is enabled, `tokenType` may use `...LLM_THINKING` and `...LLM_RESPONSE` variants to separately label thought vs response tokens.
  - `METADATA`: Contains information like stop reason, token counts, and timing, yielded once at the end.
  - `ERROR`: Contains any error encountered during translation, SDK call, or response processing.
  - `END`: Signals the completion of the stream.

#### See

 - 
 - 
 - 
 - 
 - https://ai.google.dev/api/rest/v1beta/models/generateContent

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)

### Usage Notes (Thinking Tokens)

- To enable Gemini "thinking" output (supported on select `gemini-2.5-*` models), pass options on the call:
  - `options.gemini.thinking.includeThoughts = true`
  - `options.gemini.thinking.thinkingBudget = 8096` (optional)
- The adapter sends these via the GenAI SDK `config.thinkingConfig`.
- Stream and non-stream modes will attempt to distinguish thought parts from response parts and set `StreamEvent.tokenType` to the appropriate `...LLM_THINKING` or `...LLM_RESPONSE` value based on `callContext`.
- `LLMMetadata.thinkingTokens` is populated when the provider reports it.
