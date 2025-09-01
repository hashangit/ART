[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PromptBlueprint

# Interface: PromptBlueprint

Defined in: [src/types/index.ts:1020](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1020)

Represents a Mustache template that can be rendered with a PromptContext to produce an ArtStandardPrompt.
Used by the PromptManager.assemblePrompt method.

 PromptBlueprint

## Properties

### template

> **template**: `string`

Defined in: [src/types/index.ts:1025](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1025)

The Mustache template string that will be rendered with context data to produce a JSON string representing an ArtStandardPrompt
