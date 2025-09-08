[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StageSpecificPrompts

# Interface: StageSpecificPrompts

Defined in: [src/types/index.ts:1693](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1693)

Defines stage-specific system prompts for planning and synthesis.

 StageSpecificPrompts

## Properties

### planning?

> `optional` **planning**: `string`

Defined in: [src/types/index.ts:1699](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1699)

System prompt to guide the planning phase.
Focuses on reasoning, expertise, and tool selection.

***

### synthesis?

> `optional` **synthesis**: `string`

Defined in: [src/types/index.ts:1706](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1706)

System prompt to guide the synthesis phase.
Focuses on tone, formatting, and final response structure.
