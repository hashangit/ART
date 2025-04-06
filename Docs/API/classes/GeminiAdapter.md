[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / GeminiAdapter

# Class: GeminiAdapter

Defined in: [adapters/reasoning/gemini.ts:68](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/gemini.ts#L68)

Implements the `ProviderAdapter` interface for interacting with Google's
Generative AI API (Gemini models).

Handles formatting requests for the `generateContent` endpoint and parsing responses.
Note: This basic version does not implement streaming or the `onThought` callback.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new GeminiAdapter**(`options`): `GeminiAdapter`

Defined in: [adapters/reasoning/gemini.ts:80](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/gemini.ts#L80)

Creates an instance of the GeminiAdapter.

#### Parameters

##### options

`GeminiAdapterOptions`

Configuration options including the API key and optional model/baseURL/apiVersion overrides.

#### Returns

`GeminiAdapter`

#### Throws

If the API key is missing.

## Properties

### providerName

> `readonly` **providerName**: `"gemini"` = `'gemini'`

Defined in: [adapters/reasoning/gemini.ts:69](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/gemini.ts#L69)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`string`\>

Defined in: [adapters/reasoning/gemini.ts:105](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/adapters/reasoning/gemini.ts#L105)

/**
 * Sends a request to the Google Generative AI API (`generateContent` endpoint).
 *
 * **Note:** This is a basic implementation.
 * - It currently assumes `prompt` is the primary user message content (string) and places it in the `contents` array. It does not yet parse complex `FormattedPrompt` objects containing history or specific roles. These would need to be handled by the `PromptManager`.
 * - Streaming and the `onThought` callback are **not implemented** in this version.
 * - Error handling is basic; specific Gemini error reasons (e.g., safety blocks) are not parsed in detail but are logged.
 *
 *

#### Parameters

##### prompt

[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)

The prompt content, treated as the user message in this basic implementation.
 *

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, and any Gemini-specific generation parameters (like `temperature`, `maxOutputTokens`, `topP`, `topK`) passed through.
 *

#### Returns

`Promise`\<`string`\>

A promise resolving to the combined text content from the first candidate's response parts.
 *

#### Throws

If the API request fails (network error, invalid API key, bad request, blocked content, etc.).

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
