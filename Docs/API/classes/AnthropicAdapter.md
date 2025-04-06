[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AnthropicAdapter

# Class: AnthropicAdapter

Defined in: [adapters/reasoning/anthropic.ts:59](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/anthropic.ts#L59)

Implements the `ProviderAdapter` interface for interacting with Anthropic's
Messages API (Claude models).

Handles formatting requests and parsing responses for Anthropic.
Note: This basic version does not implement streaming or the `onThought` callback.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new AnthropicAdapter**(`options`): `AnthropicAdapter`

Defined in: [adapters/reasoning/anthropic.ts:74](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/anthropic.ts#L74)

Creates an instance of the AnthropicAdapter.

#### Parameters

##### options

`AnthropicAdapterOptions`

Configuration options including the API key and optional model/apiVersion/baseURL overrides.

#### Returns

`AnthropicAdapter`

#### Throws

If the API key is missing.

## Properties

### providerName

> `readonly` **providerName**: `"anthropic"` = `'anthropic'`

Defined in: [adapters/reasoning/anthropic.ts:60](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/anthropic.ts#L60)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`string`\>

Defined in: [adapters/reasoning/anthropic.ts:101](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/anthropic.ts#L101)

/**
 * Sends a request to the Anthropic Messages API.
 *
 * **Note:** This is a basic implementation.
 * - It currently assumes `prompt` is the primary user message content (string) and places it in the `messages` array. It does not yet parse complex `FormattedPrompt` objects containing history or specific roles. These would need to be handled by the `PromptManager`.
 * - It supports passing a `system` prompt via `options.system` or `options.system_prompt`.
 * - Streaming and the `onThought` callback are **not implemented** in this version.
 * - Requires `max_tokens` (or alias) in the options, as it's mandatory for the Anthropic API.
 *
 *

#### Parameters

##### prompt

[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)

The prompt content, treated as the user message in this basic implementation.
 *

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, `system` prompt, and any Anthropic-specific generation parameters (like `temperature`, `max_tokens`, `top_p`, `top_k`).
 *

#### Returns

`Promise`\<`string`\>

A promise resolving to the text content from the assistant's response.
 *

#### Throws

If the API request fails (network error, invalid API key, bad request, etc.) or if `max_tokens` is missing.

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
