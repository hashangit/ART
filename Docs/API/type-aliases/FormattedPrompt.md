[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / FormattedPrompt

# Type Alias: ~~FormattedPrompt~~

> **FormattedPrompt** = [`ArtStandardPrompt`](ArtStandardPrompt.md)

Defined in: [src/types/index.ts:541](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L541)

Represents the prompt data formatted for a specific LLM provider.
Can be a simple string or a complex object (e.g., for OpenAI Chat Completion API).

## Deprecated

Use `ArtStandardPrompt` as the standard intermediate format. ProviderAdapters handle final formatting.
