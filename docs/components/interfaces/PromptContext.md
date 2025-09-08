[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PromptContext

# Interface: PromptContext

Defined in: [src/types/index.ts:985](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L985)

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

Defined in: [src/types/index.ts:1006](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1006)

The schemas of the tools available for use, potentially pre-formatted for the blueprint
(e.g., with `inputSchemaJson` pre-stringified).

***

### history?

> `optional` **history**: `object`[]

Defined in: [src/types/index.ts:1000](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1000)

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

Defined in: [src/types/index.ts:990](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L990)

The user's current query or input relevant to this prompt generation step.

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/types/index.ts:1017](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1017)

The system prompt string to be used (resolved by agent logic from config or defaults).

***

### toolResults?

> `optional` **toolResults**: [`ToolResult`](ToolResult.md) & `object`[]

Defined in: [src/types/index.ts:1012](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1012)

The results from any tools executed in a previous step, potentially pre-formatted for the blueprint
(e.g., with `outputJson` pre-stringified).
