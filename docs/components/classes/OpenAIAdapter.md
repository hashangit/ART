[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OpenAIAdapter

# Class: OpenAIAdapter

Defined in: [src/integrations/reasoning/openai.ts:90](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/openai.ts#L90)

Implements the `ProviderAdapter` interface for interacting with OpenAI's
Chat Completions API (compatible models like GPT-3.5, GPT-4, GPT-4o).

Handles formatting requests and parsing responses for OpenAI.
Uses raw `fetch` for now.

## See

[ProviderAdapter](../interfaces/ProviderAdapter.md) for the interface definition.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new OpenAIAdapter**(`options`): `OpenAIAdapter`

Defined in: [src/integrations/reasoning/openai.ts:102](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/openai.ts#L102)

Creates an instance of the OpenAIAdapter.

#### Parameters

##### options

[`OpenAIAdapterOptions`](../interfaces/OpenAIAdapterOptions.md)

Configuration options including the API key and optional model/baseURL overrides.

#### Returns

`OpenAIAdapter`

#### Throws

If the API key is missing.

#### See

https://platform.openai.com/docs/api-reference

## Properties

### providerName

> `readonly` **providerName**: `"openai"` = `'openai'`

Defined in: [src/integrations/reasoning/openai.ts:91](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/openai.ts#L91)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/integrations/reasoning/openai.ts:121](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/openai.ts#L121)

Sends a request to the OpenAI Chat Completions API.
Translates `ArtStandardPrompt` to the OpenAI format, handles streaming and non-streaming responses.

#### Parameters

##### prompt

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The standardized prompt messages.

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, `stream` preference, and any OpenAI-specific parameters (like `temperature`, `max_tokens`) passed through.

#### Returns

`Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

A promise resolving to an AsyncIterable of StreamEvent objects.

#### See

https://platform.openai.com/docs/api-reference/chat/create

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
