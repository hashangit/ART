[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PromptBlueprint

# Interface: PromptBlueprint

Defined in: [src/types/index.ts:1031](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1031)

Represents a Mustache template that can be rendered with a PromptContext to produce an ArtStandardPrompt.
Used by the PromptManager.assemblePrompt method.

 PromptBlueprint

## Properties

### template

> **template**: `string`

Defined in: [src/types/index.ts:1036](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1036)

The Mustache template string that will be rendered with context data to produce a JSON string representing an ArtStandardPrompt
