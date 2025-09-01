[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptSpec

# Interface: SystemPromptSpec

Defined in: [src/types/index.ts:454](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L454)

Named preset for system prompts, supporting variables and a default merge strategy.

 SystemPromptSpec

## Properties

### defaultVariables?

> `optional` **defaultVariables**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:469](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L469)

Default variables applied if not provided at use time.

***

### id?

> `optional` **id**: `string`

Defined in: [src/types/index.ts:459](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L459)

Optional explicit ID; when in a registry map, the key is typically the tag.

***

### mergeStrategy?

> `optional` **mergeStrategy**: [`SystemPromptMergeStrategy`](../type-aliases/SystemPromptMergeStrategy.md)

Defined in: [src/types/index.ts:474](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L474)

Default strategy to combine this spec with lower levels. Defaults to 'append'.

***

### template

> **template**: `string`

Defined in: [src/types/index.ts:464](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L464)

Template string. Supports simple {{variable}} placeholders and {{fragment:name}} for PromptManager fragments.
