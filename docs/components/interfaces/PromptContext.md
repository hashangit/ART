[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PromptContext

# Interface: PromptContext

Defined in: [src/types/index.ts:962](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L962)

Represents the contextual data gathered by Agent Logic (e.g., `PESAgent`) to be injected
into a Mustache blueprint/template by the `PromptManager.assemblePrompt` method.

## Remarks

Contains standard fields commonly needed for prompts, plus allows for arbitrary
additional properties required by specific agent blueprints. Agent logic is responsible
for populating this context appropriately before calling `assemblePrompt`.

 PromptContext

## Indexable

\[`key`: `string`\]: `any`

Allows agent patterns (like PES) to pass any other custom data needed by their specific blueprints (e.g., `intent`, `plan`).

## Properties

### availableTools?

> `optional` **availableTools**: [`ToolSchema`](ToolSchema.md) & `object`[]

Defined in: [src/types/index.ts:983](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L983)

The schemas of the tools available for use, potentially pre-formatted for the blueprint
(e.g., with `inputSchemaJson` pre-stringified).

***

### history?

> `optional` **history**: `object`[]

Defined in: [src/types/index.ts:977](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L977)

The conversation history, typically formatted as an array suitable for the blueprint
(e.g., array of objects with `role` and `content`). Agent logic should pre-format this.

#### Index Signature

\[`key`: `string`\]: `any`

#### content

> **content**: `string`

#### role

> **role**: `string`

#### Remarks

While `ArtStandardPrompt` could be used, simpler structures might be preferred for blueprints.

***

### query?

> `optional` **query**: `string`

Defined in: [src/types/index.ts:967](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L967)

The user's current query or input relevant to this prompt generation step.

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/types/index.ts:994](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L994)

The system prompt string to be used (resolved by agent logic from config or defaults).

***

### toolResults?

> `optional` **toolResults**: [`ToolResult`](ToolResult.md) & `object`[]

Defined in: [src/types/index.ts:989](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L989)

The results from any tools executed in a previous step, potentially pre-formatted for the blueprint
(e.g., with `outputJson` pre-stringified).
