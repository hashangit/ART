[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ToolResult

# Interface: ToolResult

Defined in: [src/types/index.ts:412](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L412)

Represents the structured result of a tool execution.

 ToolResult

## Properties

### callId

> **callId**: `string`

Defined in: [src/types/index.ts:417](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L417)

The unique identifier of the corresponding `ParsedToolCall` that initiated this execution attempt.

***

### error?

> `optional` **error**: `string`

Defined in: [src/types/index.ts:437](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L437)

A descriptive error message if the execution failed (`status` is 'error').

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/types/index.ts:442](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L442)

Optional metadata about the execution (e.g., duration, cost, logs).

#### Index Signature

\[`key`: `string`\]: `any`

#### sources?

> `optional` **sources**: `object`[]

##### Index Signature

\[`key`: `string`\]: `any`

***

### output?

> `optional` **output**: `any`

Defined in: [src/types/index.ts:432](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L432)

The data returned by the tool upon successful execution. Structure may be validated against `outputSchema`.

***

### status

> **status**: `"error"` \| `"success"`

Defined in: [src/types/index.ts:427](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L427)

Indicates whether the tool execution succeeded or failed.

***

### toolName

> **toolName**: `string`

Defined in: [src/types/index.ts:422](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L422)

The name of the tool that was executed.
