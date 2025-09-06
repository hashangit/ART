[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtStandardPrompt

# Type Alias: ArtStandardPrompt

> **ArtStandardPrompt** = [`ArtStandardMessage`](../interfaces/ArtStandardMessage.md)[]

Defined in: [src/types/index.ts:961](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L961)

Represents the entire prompt as an array of standardized messages (`ArtStandardMessage`).

## Remarks

Constructed by agent logic (e.g., `PESAgent`) and optionally validated via
`PromptManager.validatePrompt` before being sent to the `ReasoningEngine` and
translated by a `ProviderAdapter` for provider-specific API formats.
