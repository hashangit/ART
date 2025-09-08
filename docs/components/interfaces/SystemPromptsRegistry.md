[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptsRegistry

# Interface: SystemPromptsRegistry

Defined in: [src/types/index.ts:493](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L493)

Registry of available system prompt presets (tags) at the instance level.

 SystemPromptsRegistry

## Properties

### defaultTag?

> `optional` **defaultTag**: `string`

Defined in: [src/types/index.ts:498](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L498)

Tag to use when no other tag is specified.

***

### specs

> **specs**: `Record`\<`string`, [`SystemPromptSpec`](SystemPromptSpec.md)\>

Defined in: [src/types/index.ts:503](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L503)

Mapping of tag -> spec.
