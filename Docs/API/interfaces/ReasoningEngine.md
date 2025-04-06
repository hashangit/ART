[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ReasoningEngine

# Interface: ReasoningEngine

Defined in: [core/interfaces.ts:40](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L40)

Interface for the component responsible for interacting with LLMs.

## Extended by

- [`ProviderAdapter`](ProviderAdapter.md)

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
