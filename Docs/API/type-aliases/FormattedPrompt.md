[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / FormattedPrompt

# Type Alias: ~~FormattedPrompt~~

> **FormattedPrompt** = [`ArtStandardPrompt`](ArtStandardPrompt.md)

Defined in: [src/types/index.ts:545](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L545)

Represents the prompt data formatted for a specific LLM provider.
Can be a simple string or a complex object (e.g., for OpenAI Chat Completion API).

## Deprecated

Use `ArtStandardPrompt` as the standard intermediate format. ProviderAdapters handle final formatting.
