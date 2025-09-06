[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AnthropicAdapter

# Class: AnthropicAdapter

Defined in: [src/integrations/reasoning/anthropic.ts:56](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L56)

Implements the `ProviderAdapter` interface for interacting with Anthropic's
Messages API (Claude models) using the official SDK.

Handles formatting requests, parsing responses, streaming, and tool use.

## See

 - [ProviderAdapter](../interfaces/ProviderAdapter.md) for the interface definition.
 - [AnthropicAdapterOptions](../interfaces/AnthropicAdapterOptions.md) for configuration options.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new AnthropicAdapter**(`options`): `AnthropicAdapter`

Defined in: [src/integrations/reasoning/anthropic.ts:68](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L68)

Creates an instance of the AnthropicAdapter.

#### Parameters

##### options

[`AnthropicAdapterOptions`](../interfaces/AnthropicAdapterOptions.md)

Configuration options including the API key and optional model/baseURL/defaults.

#### Returns

`AnthropicAdapter`

#### Throws

If the API key is missing.

## Properties

### providerName

> `readonly` **providerName**: `"anthropic"` = `'anthropic'`

Defined in: [src/integrations/reasoning/anthropic.ts:57](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L57)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/integrations/reasoning/anthropic.ts:95](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L95)

Sends a request to the Anthropic Messages API.
Translates `ArtStandardPrompt` to the Anthropic format and handles streaming and tool use.

#### Parameters

##### prompt

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The standardized prompt messages.

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, `stream`, `callContext`,
                               `model` (override), `tools` (available tools), and Anthropic-specific
                               generation parameters from `providerConfig.adapterOptions`.

#### Returns

`Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

A promise resolving to an AsyncIterable of StreamEvent objects.

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
