[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptsRegistry

# Interface: SystemPromptsRegistry

Defined in: [src/types/index.ts:482](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L482)

Registry of available system prompt presets (tags) at the instance level.

 SystemPromptsRegistry

## Properties

### defaultTag?

> `optional` **defaultTag**: `string`

Defined in: [src/types/index.ts:487](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L487)

Tag to use when no other tag is specified.

***

### specs

> **specs**: `Record`\<`string`, [`SystemPromptSpec`](SystemPromptSpec.md)\>

Defined in: [src/types/index.ts:492](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L492)

Mapping of tag -> spec.
