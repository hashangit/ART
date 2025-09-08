[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptSpec

# Interface: SystemPromptSpec

Defined in: [src/types/index.ts:465](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L465)

Named preset for system prompts, supporting variables and a default merge strategy.

 SystemPromptSpec

## Properties

### defaultVariables?

> `optional` **defaultVariables**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:480](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L480)

Default variables applied if not provided at use time.

***

### id?

> `optional` **id**: `string`

Defined in: [src/types/index.ts:470](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L470)

Optional explicit ID; when in a registry map, the key is typically the tag.

***

### mergeStrategy?

> `optional` **mergeStrategy**: [`SystemPromptMergeStrategy`](../type-aliases/SystemPromptMergeStrategy.md)

Defined in: [src/types/index.ts:485](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L485)

Default strategy to combine this spec with lower levels. Defaults to 'append'.

***

### template

> **template**: `string`

Defined in: [src/types/index.ts:475](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L475)

Template string. Supports simple {{variable}} placeholders and {{fragment:name}} for PromptManager fragments.
