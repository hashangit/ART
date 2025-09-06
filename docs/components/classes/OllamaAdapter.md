[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OllamaAdapter

# Class: OllamaAdapter

Defined in: [src/integrations/reasoning/ollama.ts:68](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/ollama.ts#L68)

Implements the `ProviderAdapter` interface for interacting with Ollama's
OpenAI-compatible API endpoint.

Handles formatting requests, parsing responses, streaming, and tool use.

## See

 - [ProviderAdapter](../interfaces/ProviderAdapter.md) for the interface definition.
 - [OllamaAdapterOptions](../interfaces/OllamaAdapterOptions.md) for configuration options.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new OllamaAdapter**(`options`): `OllamaAdapter`

Defined in: [src/integrations/reasoning/ollama.ts:78](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/ollama.ts#L78)

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

Defined in: [src/integrations/reasoning/ollama.ts:69](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/ollama.ts#L69)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/integrations/reasoning/ollama.ts:102](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/ollama.ts#L102)

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

Defined in: [src/integrations/reasoning/ollama.ts:481](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/ollama.ts#L481)

Optional method for graceful shutdown. For Ollama, which is typically a separate
local server, this adapter doesn't manage persistent connections that need explicit closing.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the shutdown is complete.

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`shutdown`](../interfaces/ProviderAdapter.md#shutdown)
