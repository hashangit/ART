[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtStandardPrompt

# Type Alias: ArtStandardPrompt

> **ArtStandardPrompt** = [`ArtStandardMessage`](../interfaces/ArtStandardMessage.md)[]

Defined in: [types/index.ts:472](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L472)

Represents the entire prompt as an array of standardized messages (`ArtStandardMessage`).
This is the standard format produced by `PromptManager.assemblePrompt` and consumed
by `ProviderAdapter.call` for translation into provider-specific API formats.
