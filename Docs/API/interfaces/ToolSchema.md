[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ToolSchema

# Interface: ToolSchema

Defined in: [types/index.ts:104](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L104)

Defines the schema for a tool, including its input parameters.
Uses JSON Schema format for inputSchema.

## Properties

### description

> **description**: `string`

Defined in: [types/index.ts:108](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L108)

A clear description of what the tool does, intended for the LLM to understand its purpose and usage.

***

### examples?

> `optional` **examples**: `object`[]

Defined in: [types/index.ts:114](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L114)

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

Defined in: [types/index.ts:110](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L110)

A JSON Schema object defining the structure, types, and requirements of the input arguments the tool expects.

***

### name

> **name**: `string`

Defined in: [types/index.ts:106](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L106)

A unique name identifying the tool (used in LLM prompts and registry lookups). Must be unique.

***

### outputSchema?

> `optional` **outputSchema**: [`JsonSchema`](../type-aliases/JsonSchema.md)

Defined in: [types/index.ts:112](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L112)

An optional JSON Schema object defining the expected structure of the data returned in the `output` field of a successful `ToolResult`.
