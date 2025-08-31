[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptOverride

# Interface: SystemPromptOverride

Defined in: [src/types/index.ts:501](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L501)

Override provided at instance/thread/call level to select a tag and/or provide variables,
or to provide freeform content and a merge strategy.

 SystemPromptOverride

## Properties

### content?

> `optional` **content**: `string`

Defined in: [src/types/index.ts:516](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L516)

Freeform content to apply directly (escape hatch).

***

### strategy?

> `optional` **strategy**: [`SystemPromptMergeStrategy`](../type-aliases/SystemPromptMergeStrategy.md)

Defined in: [src/types/index.ts:521](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L521)

Merge behavior against previous level: append | prepend.

***

### tag?

> `optional` **tag**: `string`

Defined in: [src/types/index.ts:506](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L506)

Preset tag from the registry (e.g., 'default', 'legal_advisor').

***

### variables?

> `optional` **variables**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:511](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L511)

Variables to substitute in the selected template.
