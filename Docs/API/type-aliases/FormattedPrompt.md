[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / FormattedPrompt

# Type Alias: ~~FormattedPrompt~~

> **FormattedPrompt** = [`ArtStandardPrompt`](ArtStandardPrompt.md)

Defined in: [types/index.ts:515](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L515)

Represents the prompt data formatted for a specific LLM provider.
Can be a simple string or a complex object (e.g., for OpenAI Chat Completion API).

## Deprecated

Use `ArtStandardPrompt` as the standard intermediate format. ProviderAdapters handle final formatting.
