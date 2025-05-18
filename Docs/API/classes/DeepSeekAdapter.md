[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / DeepSeekAdapter

# Class: DeepSeekAdapter

Defined in: [src/adapters/reasoning/deepseek.ts:87](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/deepseek.ts#L87)

Implements the `ProviderAdapter` interface for interacting with the DeepSeek API,
which uses an OpenAI-compatible Chat Completions endpoint.

Handles formatting requests and parsing responses for DeepSeek models.
Note: Streaming is **not yet implemented** for this adapter. Calls requesting streaming will yield an error and end.

## Implements

## Implements

- [`ProviderAdapter`](../interfaces/ProviderAdapter.md)

## Constructors

### Constructor

> **new DeepSeekAdapter**(`options`): `DeepSeekAdapter`

Defined in: [src/adapters/reasoning/deepseek.ts:98](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/deepseek.ts#L98)

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

Defined in: [src/adapters/reasoning/deepseek.ts:88](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/deepseek.ts#L88)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`providerName`](../interfaces/ProviderAdapter.md#providername)

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`AsyncIterable`\<[`StreamEvent`](../interfaces/StreamEvent.md), `any`, `any`\>\>

Defined in: [src/adapters/reasoning/deepseek.ts:118](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/deepseek.ts#L118)

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

#### Implementation of

[`ProviderAdapter`](../interfaces/ProviderAdapter.md).[`call`](../interfaces/ProviderAdapter.md#call)
