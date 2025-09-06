[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptsRegistry

# Interface: SystemPromptsRegistry

Defined in: [src/types/index.ts:482](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L482)

Registry of available system prompt presets (tags) at the instance level.

 SystemPromptsRegistry

## Properties

### defaultTag?

> `optional` **defaultTag**: `string`

Defined in: [src/types/index.ts:487](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L487)

Tag to use when no other tag is specified.

***

### specs

> **specs**: `Record`\<`string`, [`SystemPromptSpec`](SystemPromptSpec.md)\>

Defined in: [src/types/index.ts:492](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L492)

Mapping of tag -> spec.
