[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ProviderAdapter

# Interface: ProviderAdapter

Defined in: [core/interfaces.ts:128](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L128)

Base interface for LLM Provider Adapters, extending the core ReasoningEngine.
Implementations will handle provider-specific API calls, authentication, etc.

## Extends

- [`ReasoningEngine`](ReasoningEngine.md)

## Properties

### providerName

> `readonly` **providerName**: `string`

Defined in: [core/interfaces.ts:132](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L132)

The unique identifier name for this provider (e.g., 'openai', 'anthropic').

## Methods

### call()

> **call**(`prompt`, `options`): `Promise`\<`string`\>

Defined in: [core/interfaces.ts:49](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L49)

Executes a call to the configured Large Language Model (LLM).
This method is typically implemented by a specific `ProviderAdapter`.

#### Parameters

##### prompt

[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)

The prompt to send to the LLM, potentially formatted specifically for the provider.

##### options

[`CallOptions`](CallOptions.md)

Options controlling the LLM call, including mandatory `threadId`, tracing IDs, model parameters (like temperature), and callbacks like `onThought`.

#### Returns

`Promise`\<`string`\>

A promise resolving to the raw string response from the LLM.

#### Throws

If the LLM call fails due to API errors, network issues, etc. (typically code `LLM_PROVIDER_ERROR`).

#### Inherited from

[`ReasoningEngine`](ReasoningEngine.md).[`call`](ReasoningEngine.md#call)
