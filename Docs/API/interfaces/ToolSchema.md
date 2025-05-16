[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ToolSchema

# Interface: ToolSchema

Defined in: [types/index.ts:211](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L211)

Defines the schema for a tool, including its input parameters.
Uses JSON Schema format for inputSchema.

## Properties

### description

> **description**: `string`

Defined in: [types/index.ts:215](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L215)

A clear description of what the tool does, intended for the LLM to understand its purpose and usage.

***

### examples?

> `optional` **examples**: `object`[]

Defined in: [types/index.ts:221](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L221)

Optional array of examples demonstrating how to use the tool, useful for few-shot prompting of the LLM.

#### description?

> `optional` **description**: `string`

#### input

> **input**: `any`

#### output?

> `optional` **output**: `any`

***

### inputSchema

> **inputSchema**: [`JsonSchema`](../type-aliases/JsonSchema.md)

Defined in: [types/index.ts:217](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L217)

A JSON Schema object defining the structure, types, and requirements of the input arguments the tool expects.

***

### name

> **name**: `string`

Defined in: [types/index.ts:213](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L213)

A unique name identifying the tool (used in LLM prompts and registry lookups). Must be unique.

***

### outputSchema?

> `optional` **outputSchema**: [`JsonSchema`](../type-aliases/JsonSchema.md)

Defined in: [types/index.ts:219](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L219)

An optional JSON Schema object defining the expected structure of the data returned in the `output` field of a successful `ToolResult`.
