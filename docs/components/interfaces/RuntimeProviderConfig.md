[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / RuntimeProviderConfig

# Interface: RuntimeProviderConfig

Defined in: [src/types/providers.ts:58](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/providers.ts#L58)

Configuration passed AT RUNTIME for a specific LLM call.

 RuntimeProviderConfig

## Properties

### adapterOptions

> **adapterOptions**: `any`

Defined in: [src/types/providers.ts:73](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/providers.ts#L73)

Specific options for THIS instance (apiKey, temperature, contextSize, baseUrl, etc.).

***

### modelId

> **modelId**: `string`

Defined in: [src/types/providers.ts:68](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/providers.ts#L68)

Specific model identifier (e.g., 'gpt-4o', 'llama3:latest').

***

### providerName

> **providerName**: `string`

Defined in: [src/types/providers.ts:63](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/providers.ts#L63)

Must match a name in AvailableProviderEntry.
