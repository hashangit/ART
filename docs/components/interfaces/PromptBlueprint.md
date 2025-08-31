[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PromptBlueprint

# Interface: PromptBlueprint

Defined in: [src/types/index.ts:1008](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1008)

Represents a Mustache template that can be rendered with a PromptContext to produce an ArtStandardPrompt.
Used by the PromptManager.assemblePrompt method.

 PromptBlueprint

## Properties

### template

> **template**: `string`

Defined in: [src/types/index.ts:1013](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1013)

The Mustache template string that will be rendered with context data to produce a JSON string representing an ArtStandardPrompt
