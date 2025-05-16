[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / GeminiAdapter

# Class: GeminiAdapter

Defined in: [adapters/reasoning/gemini.ts:33](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/gemini.ts#L33)

Base interface for LLM Provider Adapters, extending the core ReasoningEngine.
Implementations will handle provider-specific API calls, authentication, etc.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new GeminiAdapter**(`options`): `GeminiAdapter`

Defined in: [adapters/reasoning/gemini.ts:44](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/gemini.ts#L44)

Creates an instance of GeminiAdapter.

#### Parameters

##### options

`GeminiAdapterOptions`

Configuration options for the adapter.

#### Returns

`GeminiAdapter`

#### Throws

If `apiKey` is missing in the options.

## Properties

### providerName

> `readonly` **providerName**: `"gemini"` = `'gemini'`

Defined in: [adapters/reasoning/gemini.ts:34](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/gemini.ts#L34)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [adapters/reasoning/gemini.ts:78](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/gemini.ts#L78)

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
  - `TOKEN`: Contains a chunk of the response text. `tokenType` indicates if it's part of agent thought or final synthesis.
  - `METADATA`: Contains information like stop reason, token counts, and timing, yielded once at the end.
  - `ERROR`: Contains any error encountered during translation, SDK call, or response processing.
  - `END`: Signals the completion of the stream.

#### See

 - 
 - 
 - 
 - 

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
