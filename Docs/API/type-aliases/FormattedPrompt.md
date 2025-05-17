[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / FormattedPrompt

# Type Alias: ~~FormattedPrompt~~

> **FormattedPrompt** = [`ArtStandardPrompt`](ArtStandardPrompt.md)

Defined in: [types/index.ts:523](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L523)

Represents the prompt data formatted for a specific LLM provider.
Can be a simple string or a complex object (e.g., for OpenAI Chat Completion API).

## Deprecated

Use `ArtStandardPrompt` as the standard intermediate format. ProviderAdapters handle final formatting.
