[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ToolResult

# Interface: ToolResult

Defined in: [src/types/index.ts:401](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L401)

Represents the structured result of a tool execution.

 ToolResult

## Properties

### callId

> **callId**: `string`

Defined in: [src/types/index.ts:406](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L406)

The unique identifier of the corresponding `ParsedToolCall` that initiated this execution attempt.

***

### error?

> `optional` **error**: `string`

Defined in: [src/types/index.ts:426](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L426)

A descriptive error message if the execution failed (`status` is 'error').

***

### metadata?

> `optional` **metadata**: `object`

Defined in: [src/types/index.ts:431](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L431)

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

Defined in: [src/types/index.ts:421](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L421)

The data returned by the tool upon successful execution. Structure may be validated against `outputSchema`.

***

### status

> **status**: `"error"` \| `"success"`

Defined in: [src/types/index.ts:416](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L416)

Indicates whether the tool execution succeeded or failed.

***

### toolName

> **toolName**: `string`

Defined in: [src/types/index.ts:411](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L411)

The name of the tool that was executed.
