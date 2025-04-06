[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / DeepSeekAdapter

# Class: DeepSeekAdapter

Defined in: [adapters/reasoning/deepseek.ts:59](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/deepseek.ts#L59)

Implements the `ProviderAdapter` interface for interacting with the DeepSeek API,
which uses an OpenAI-compatible Chat Completions endpoint.

Handles formatting requests and parsing responses for DeepSeek models.
Note: This basic version does not implement streaming or the `onThought` callback.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new DeepSeekAdapter**(`options`): `DeepSeekAdapter`

Defined in: [adapters/reasoning/deepseek.ts:70](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/deepseek.ts#L70)

Creates an instance of the DeepSeekAdapter.

#### Parameters

##### options

`DeepSeekAdapterOptions`

Configuration options including the API key and optional model/baseURL overrides.

#### Returns

`DeepSeekAdapter`

#### Throws

If the API key is missing.

## Properties

### providerName

> `readonly` **providerName**: `"deepseek"` = `'deepseek'`

Defined in: [adapters/reasoning/deepseek.ts:60](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/deepseek.ts#L60)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`string`\>

Defined in: [adapters/reasoning/deepseek.ts:94](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/deepseek.ts#L94)

/**
 * Sends a request to the DeepSeek Chat Completions API endpoint.
 * Uses an OpenAI-compatible payload structure.
 *
 * **Note:** This is a basic implementation.
 * - It currently assumes `prompt` is the primary user message content (string). It does not yet parse complex `FormattedPrompt` objects containing history or system roles directly. These would need to be handled by the `PromptManager`.
 * - Streaming and the `onThought` callback are **not implemented** in this version.
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
