[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtStandardPrompt

# Type Alias: ArtStandardPrompt

> **ArtStandardPrompt** = [`ArtStandardMessage`](../interfaces/ArtStandardMessage.md)[]

Defined in: [src/types/index.ts:961](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L961)

Represents the entire prompt as an array of standardized messages (`ArtStandardMessage`).

## Remarks

Constructed by agent logic (e.g., `PESAgent`) and optionally validated via
`PromptManager.validatePrompt` before being sent to the `ReasoningEngine` and
translated by a `ProviderAdapter` for provider-specific API formats.
