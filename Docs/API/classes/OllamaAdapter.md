[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / OllamaAdapter

# Class: OllamaAdapter

Defined in: [adapters/reasoning/ollama.ts:67](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/ollama.ts#L67)

Implements the `ProviderAdapter` interface for interacting with Ollama's
OpenAI-compatible API endpoint.

Handles formatting requests, parsing responses, streaming, and tool use.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new OllamaAdapter**(`options`): `OllamaAdapter`

Defined in: [adapters/reasoning/ollama.ts:77](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/ollama.ts#L77)

Creates an instance of the OllamaAdapter.

#### Parameters

##### options

[`OllamaAdapterOptions`](../interfaces/OllamaAdapterOptions.md)

Configuration options.

#### Returns

`OllamaAdapter`

## Properties

### providerName

> `readonly` **providerName**: `"ollama"` = `'ollama'`

Defined in: [adapters/reasoning/ollama.ts:68](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/ollama.ts#L68)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [adapters/reasoning/ollama.ts:101](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/ollama.ts#L101)

Sends a request to the Ollama API.
Translates `ArtStandardPrompt` to the OpenAI format and handles streaming and tool use.

#### Parameters

##### prompt

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The standardized prompt messages.

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options.

#### Returns

`Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

A promise resolving to an AsyncIterable of StreamEvent objects.

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)

***

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [adapters/reasoning/ollama.ts:467](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/adapters/reasoning/ollama.ts#L467)

Optional method for graceful shutdown.
For Ollama, which is typically a separate local server, this adapter
doesn't manage persistent connections that need explicit closing.
The OpenAI client used internally might have its own cleanup, but
it's generally handled by garbage collection.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`shutdown`](../interfaces/ProviderAdapter.md#shutdown)
