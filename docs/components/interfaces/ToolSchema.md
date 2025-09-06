[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ToolSchema

# Interface: ToolSchema

Defined in: [src/types/index.ts:369](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L369)

Defines the schema for a tool, including its input parameters.
Uses JSON Schema format for inputSchema.

 ToolSchema

## Properties

### description

> **description**: `string`

Defined in: [src/types/index.ts:379](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L379)

A clear description of what the tool does, intended for the LLM to understand its purpose and usage.

***

### examples?

> `optional` **examples**: `object`[]

Defined in: [src/types/index.ts:394](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L394)

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

Defined in: [src/types/index.ts:384](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L384)

A JSON Schema object defining the structure, types, and requirements of the input arguments the tool expects.

***

### name

> **name**: `string`

Defined in: [src/types/index.ts:374](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L374)

A unique name identifying the tool (used in LLM prompts and registry lookups). Must be unique.

***

### outputSchema?

> `optional` **outputSchema**: [`JsonSchema`](../type-aliases/JsonSchema.md)

Defined in: [src/types/index.ts:389](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L389)

An optional JSON Schema object defining the expected structure of the data returned in the `output` field of a successful `ToolResult`.
