[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtStandardPrompt

# Type Alias: ArtStandardPrompt

> **ArtStandardPrompt** = [`ArtStandardMessage`](../interfaces/ArtStandardMessage.md)[]

Defined in: [src/types/index.ts:972](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L972)

Represents the entire prompt as an array of standardized messages (`ArtStandardMessage`).

## Remarks

Constructed by agent logic (e.g., `PESAgent`) and optionally validated via
`PromptManager.validatePrompt` before being sent to the `ReasoningEngine` and
translated by a `ProviderAdapter` for provider-specific API formats.
