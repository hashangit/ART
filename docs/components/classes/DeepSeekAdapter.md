[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / DeepSeekAdapter

# Class: DeepSeekAdapter

Defined in: [src/integrations/reasoning/deepseek.ts:84](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/deepseek.ts#L84)

This adapter provides a consistent interface for ART agents to use DeepSeek models,
handling the conversion of standard ART prompts to the DeepSeek API format and
parsing the responses into the ART `StreamEvent` format.

## See

[ProviderAdapter](../interfaces/ProviderAdapter.md) for the interface it implements.

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new DeepSeekAdapter**(`options`): `DeepSeekAdapter`

Defined in: [src/integrations/reasoning/deepseek.ts:96](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/deepseek.ts#L96)

Creates an instance of the DeepSeekAdapter.

#### Parameters

##### options

[`DeepSeekAdapterOptions`](../interfaces/DeepSeekAdapterOptions.md)

Configuration options including the API key and optional model/baseURL overrides.

#### Returns

`DeepSeekAdapter`

#### Throws

If the API key is missing.

#### See

https://platform.deepseek.com/api-docs

## Properties

### providerName

> `readonly` **providerName**: `"deepseek"` = `'deepseek'`

Defined in: [src/integrations/reasoning/deepseek.ts:85](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/deepseek.ts#L85)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/integrations/reasoning/deepseek.ts:117](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/integrations/reasoning/deepseek.ts#L117)

Sends a request to the DeepSeek Chat Completions API endpoint.
Translates `ArtStandardPrompt` to the OpenAI-compatible format.

**Note:** Streaming is **not yet implemented**.

#### Parameters

##### prompt

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The standardized prompt messages.

##### options

[`CallOptions`](../interfaces/CallOptions.md)

Call options, including `threadId`, `traceId`, `stream`, and any OpenAI-compatible generation parameters.

#### Returns

`Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

A promise resolving to an AsyncIterable of StreamEvent objects. If streaming is requested, it yields an error event and ends.

#### See

https://platform.deepseek.com/api-docs/api/create-chat-completion/index.html

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
