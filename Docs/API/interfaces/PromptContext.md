[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / PromptContext

# Interface: PromptContext

Defined in: [types/index.ts:482](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L482)

Represents the contextual data gathered by Agent Logic (e.g., `PESAgent`) to be injected
into a Mustache blueprint/template by the `PromptManager.assemblePrompt` method.

Contains standard fields commonly needed for prompts, plus allows for arbitrary
additional properties required by specific agent blueprints. Agent logic is responsible
for populating this context appropriately before calling `assemblePrompt`.

## Indexable

\[`key`: `string`\]: `any`

Allows agent patterns (like PES) to pass any other custom data needed by their specific blueprints (e.g., `intent`, `plan`).

## Properties

### availableTools?

> `optional` **availableTools**: [`ToolSchema`](ToolSchema.md) & `object`[]

Defined in: [types/index.ts:495](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L495)

The schemas of the tools available for use, potentially pre-formatted for the blueprint
(e.g., with `inputSchemaJson` pre-stringified).

***

### history?

> `optional` **history**: `object`[]

Defined in: [types/index.ts:490](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L490)

The conversation history, typically formatted as an array suitable for the blueprint
(e.g., array of objects with `role` and `content`). Agent logic should pre-format this.
Note: While `ArtStandardPrompt` could be used, simpler structures might be preferred for blueprints.

#### Index Signature

\[`key`: `string`\]: `any`

#### content

> **content**: `string`

#### role

> **role**: `string`

***

### query?

> `optional` **query**: `string`

Defined in: [types/index.ts:484](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L484)

The user's current query or input relevant to this prompt generation step.

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [types/index.ts:502](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L502)

The system prompt string to be used (resolved by agent logic from config or defaults).

***

### toolResults?

> `optional` **toolResults**: [`ToolResult`](ToolResult.md) & `object`[]

Defined in: [types/index.ts:500](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L500)

The results from any tools executed in a previous step, potentially pre-formatted for the blueprint
(e.g., with `outputJson` pre-stringified).
