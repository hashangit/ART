[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtStandardPrompt

# Type Alias: ArtStandardPrompt

> **ArtStandardPrompt** = [`ArtStandardMessage`](../interfaces/ArtStandardMessage.md)[]

Defined in: [src/types/index.ts:502](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L502)

Represents the entire prompt as an array of standardized messages (`ArtStandardMessage`).
Constructed by agent logic (e.g., `PESAgent`) and optionally validated via
`PromptManager.validatePrompt` before being sent to the `ReasoningEngine` and
translated by a `ProviderAdapter` for provider-specific API formats.
