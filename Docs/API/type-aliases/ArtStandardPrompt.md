[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtStandardPrompt

# Type Alias: ArtStandardPrompt

> **ArtStandardPrompt** = [`ArtStandardMessage`](../interfaces/ArtStandardMessage.md)[]

Defined in: [src/types/index.ts:498](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L498)

Represents the entire prompt as an array of standardized messages (`ArtStandardMessage`).
This is the standard format produced by `PromptManager.assemblePrompt` and consumed
by `ProviderAdapter.call` for translation into provider-specific API formats.
