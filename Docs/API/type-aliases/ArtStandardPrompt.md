[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtStandardPrompt

# Type Alias: ArtStandardPrompt

> **ArtStandardPrompt** = [`ArtStandardMessage`](../interfaces/ArtStandardMessage.md)[]

Defined in: [types/index.ts:472](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/index.ts#L472)

Represents the entire prompt as an array of standardized messages (`ArtStandardMessage`).
This is the standard format produced by `PromptManager.assemblePrompt` and consumed
by `ProviderAdapter.call` for translation into provider-specific API formats.
