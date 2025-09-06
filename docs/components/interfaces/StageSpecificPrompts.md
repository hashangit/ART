[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StageSpecificPrompts

# Interface: StageSpecificPrompts

Defined in: [src/types/index.ts:1682](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1682)

Defines stage-specific system prompts for planning and synthesis.

 StageSpecificPrompts

## Properties

### planning?

> `optional` **planning**: `string`

Defined in: [src/types/index.ts:1688](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1688)

System prompt to guide the planning phase.
Focuses on reasoning, expertise, and tool selection.

***

### synthesis?

> `optional` **synthesis**: `string`

Defined in: [src/types/index.ts:1695](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L1695)

System prompt to guide the synthesis phase.
Focuses on tone, formatting, and final response structure.
