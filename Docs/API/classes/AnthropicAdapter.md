[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AnthropicAdapter

# Class: AnthropicAdapter

Defined in: [src/adapters/reasoning/anthropic.ts:55](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/adapters/reasoning/anthropic.ts#L55)

Implements the `ProviderAdapter` interface for interacting with Anthropic's
Messages API (Claude models) using the official SDK.

Handles formatting requests, parsing responses, streaming, and tool use.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new AnthropicAdapter**(`options`): `AnthropicAdapter`

Defined in: [src/adapters/reasoning/anthropic.ts:67](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/adapters/reasoning/anthropic.ts#L67)

Creates an instance of the AnthropicAdapter.

#### Parameters

##### options

`AnthropicAdapterOptions`

Configuration options including the API key and optional model/baseURL/defaults.

#### Returns

`AnthropicAdapter`

#### Throws

If the API key is missing.

## Properties

### providerName

> `readonly` **providerName**: `"anthropic"` = `'anthropic'`

Defined in: [src/adapters/reasoning/anthropic.ts:56](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/adapters/reasoning/anthropic.ts#L56)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/adapters/reasoning/anthropic.ts:94](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/adapters/reasoning/anthropic.ts#L94)

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
