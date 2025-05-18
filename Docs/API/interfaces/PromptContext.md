[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / PromptContext

# Interface: PromptContext

Defined in: [src/types/index.ts:508](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L508)

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

Defined in: [src/types/index.ts:521](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L521)

The schemas of the tools available for use, potentially pre-formatted for the blueprint
(e.g., with `inputSchemaJson` pre-stringified).

***

### history?

> `optional` **history**: `object`[]

Defined in: [src/types/index.ts:516](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L516)

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

Defined in: [src/types/index.ts:510](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L510)

The user's current query or input relevant to this prompt generation step.

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/types/index.ts:528](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L528)

The system prompt string to be used (resolved by agent logic from config or defaults).

***

### toolResults?

> `optional` **toolResults**: [`ToolResult`](ToolResult.md) & `object`[]

Defined in: [src/types/index.ts:526](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L526)

The results from any tools executed in a previous step, potentially pre-formatted for the blueprint
(e.g., with `outputJson` pre-stringified).
