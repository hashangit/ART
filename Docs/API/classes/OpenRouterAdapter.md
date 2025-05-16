[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / OpenRouterAdapter

# Class: OpenRouterAdapter

Defined in: [adapters/reasoning/openrouter.ts:93](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/openrouter.ts#L93)

Implements the `ProviderAdapter` interface for interacting with the OpenRouter API,
which provides access to various LLMs through an OpenAI-compatible interface.

Handles formatting requests and parsing responses for OpenRouter's chat completions endpoint.
Handles formatting requests and parsing responses for OpenRouter's chat completions endpoint.
Note: Streaming is **not yet implemented** for this adapter. Calls requesting streaming will yield an error and end.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new OpenRouterAdapter**(`options`): `OpenRouterAdapter`

Defined in: [adapters/reasoning/openrouter.ts:106](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/openrouter.ts#L106)

Creates an instance of the OpenRouterAdapter.

#### Parameters

##### options

`OpenRouterAdapterOptions`

Configuration options including the API key, the specific OpenRouter model identifier, and optional headers/baseURL.

#### Returns

`OpenRouterAdapter`

#### Throws

If the API key or model identifier is missing.

## Properties

### providerName

> `readonly` **providerName**: `"openrouter"` = `'openrouter'`

Defined in: [adapters/reasoning/openrouter.ts:94](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/openrouter.ts#L94)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [adapters/reasoning/openrouter.ts:131](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/openrouter.ts#L131)

Sends a request to the OpenRouter Chat Completions API endpoint.
Translates `ArtStandardPrompt` to the OpenAI-compatible format.

**Note:** Streaming is **not yet implemented**.

#### Parameters

##### prompt

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The standardized prompt messages.

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, `stream`, and any OpenAI-compatible generation parameters.

#### Returns

`Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

A promise resolving to an AsyncIterable of StreamEvent objects. If streaming is requested, it yields an error event and ends.

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
