[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / OpenAIAdapter

# Class: OpenAIAdapter

Defined in: [adapters/reasoning/openai.ts:57](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openai.ts#L57)

Implements the `ProviderAdapter` interface for interacting with OpenAI's
Chat Completions API (compatible models like GPT-3.5, GPT-4, GPT-4o).

Handles formatting requests and parsing responses for OpenAI.
Note: This basic version does not implement streaming or the `onThought` callback.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new OpenAIAdapter**(`options`): `OpenAIAdapter`

Defined in: [adapters/reasoning/openai.ts:68](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openai.ts#L68)

Creates an instance of the OpenAIAdapter.

#### Parameters

##### options

`OpenAIAdapterOptions`

Configuration options including the API key and optional model/baseURL overrides.

#### Returns

`OpenAIAdapter`

#### Throws

If the API key is missing.

## Properties

### providerName

> `readonly` **providerName**: `"openai"` = `'openai'`

Defined in: [adapters/reasoning/openai.ts:58](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openai.ts#L58)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`string`\>

Defined in: [adapters/reasoning/openai.ts:92](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/openai.ts#L92)

/**
 * Sends a request to the OpenAI Chat Completions API.
 *
 * **Note:** This is a basic implementation.
 * - It currently assumes `prompt` is the primary user message content (string). It does not yet parse complex `FormattedPrompt` objects containing history or system roles directly. These would need to be handled by the `PromptManager` creating the input string.
 * - Streaming and the `onThought` callback are **not implemented** in this version.
 * - Error handling is basic; specific OpenAI error codes are not parsed in detail.
 *
 *

#### Parameters

##### prompt

[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)

The prompt content, treated as the user message in this basic implementation.
 *

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, and any OpenAI-specific parameters (like `temperature`, `max_tokens`) passed through.
 *

#### Returns

`Promise`\<`string`\>

A promise resolving to the content string of the assistant's response.
 *

#### Throws

If the API request fails (network error, invalid API key, bad request, etc.).

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
