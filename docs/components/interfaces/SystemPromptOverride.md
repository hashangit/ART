[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptOverride

# Interface: SystemPromptOverride

Defined in: [src/types/index.ts:512](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L512)

Override provided at instance/thread/call level to select a tag and/or provide variables,
or to provide freeform content and a merge strategy.

 SystemPromptOverride

## Properties

### content?

> `optional` **content**: `string`

Defined in: [src/types/index.ts:527](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L527)

Freeform content to apply directly (escape hatch).

***

### strategy?

> `optional` **strategy**: [`SystemPromptMergeStrategy`](../type-aliases/SystemPromptMergeStrategy.md)

Defined in: [src/types/index.ts:532](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L532)

Merge behavior against previous level: append | prepend.

***

### tag?

> `optional` **tag**: `string`

Defined in: [src/types/index.ts:517](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L517)

Preset tag from the registry (e.g., 'default', 'legal_advisor').

***

### variables?

> `optional` **variables**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:522](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L522)

Variables to substitute in the selected template.
