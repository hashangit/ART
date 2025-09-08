[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OpenRouterAdapter

# Class: OpenRouterAdapter

Defined in: [src/integrations/reasoning/openrouter.ts:89](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L89)

This adapter provides a unified interface for various LLM providers through OpenRouter,
handling prompt conversion and response parsing into the ART `StreamEvent` format.

## See

 - [ProviderAdapter](../interfaces/ProviderAdapter.md) for the interface it implements.
 - [OpenRouterAdapterOptions](../interfaces/OpenRouterAdapterOptions.md) for configuration options.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new OpenRouterAdapter**(`options`): `OpenRouterAdapter`

Defined in: [src/integrations/reasoning/openrouter.ts:103](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L103)

Creates an instance of the OpenRouterAdapter.

#### Parameters

##### options

[`OpenRouterAdapterOptions`](../interfaces/OpenRouterAdapterOptions.md)

Configuration options including the API key, the specific OpenRouter model identifier, and optional headers/baseURL.

#### Returns

`OpenRouterAdapter`

#### Throws

If the API key or model identifier is missing.

#### See

https://openrouter.ai/docs

## Properties

### providerName

> `readonly` **providerName**: `"openrouter"` = `'openrouter'`

Defined in: [src/integrations/reasoning/openrouter.ts:90](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L90)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/integrations/reasoning/openrouter.ts:129](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L129)

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

#### See

https://openrouter.ai/docs#api-reference-chat-completions

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
