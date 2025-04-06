[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / OpenRouterAdapter

# Class: OpenRouterAdapter

Defined in: [adapters/reasoning/openrouter.ts:65](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openrouter.ts#L65)

Implements the `ProviderAdapter` interface for interacting with the OpenRouter API,
which provides access to various LLMs through an OpenAI-compatible interface.

Handles formatting requests and parsing responses for OpenRouter's chat completions endpoint.
Note: This basic version does not implement streaming or the `onThought` callback.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new OpenRouterAdapter**(`options`): `OpenRouterAdapter`

Defined in: [adapters/reasoning/openrouter.ts:78](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openrouter.ts#L78)

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

Defined in: [adapters/reasoning/openrouter.ts:66](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openrouter.ts#L66)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`string`\>

Defined in: [adapters/reasoning/openrouter.ts:108](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openrouter.ts#L108)

/**
 * Sends a request to the OpenRouter Chat Completions API endpoint.
 * Uses an OpenAI-compatible payload structure.
 *
 * **Note:** This is a basic implementation.
 * - It currently assumes `prompt` is the primary user message content (string). It does not yet parse complex `FormattedPrompt` objects containing history or system roles directly. These would need to be handled by the `PromptManager`.
 * - Streaming and the `onThought` callback are **not implemented** in this version.
 * - Includes recommended OpenRouter headers (`HTTP-Referer`, `X-Title`) if configured.
 *
 *

#### Parameters

##### prompt

[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)

The prompt content, treated as the user message in this basic implementation.
 *

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, and any OpenAI-compatible generation parameters (like `temperature`, `max_tokens`, `stop`).
 *

#### Returns

`Promise`\<`string`\>

A promise resolving to the content string of the assistant's response.
 *

#### Throws

If the API request fails (network error, invalid API key, bad request, etc.).

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
