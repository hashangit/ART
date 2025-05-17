[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ToolResult

# Interface: ToolResult

Defined in: [types/index.ts:230](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L230)

Represents the structured result of a tool execution.

## Properties

### callId

> **callId**: `string`

Defined in: [types/index.ts:232](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L232)

The unique identifier of the corresponding `ParsedToolCall` that initiated this execution attempt.

***

### error?

> `optional` **error**: `string`

Defined in: [types/index.ts:240](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L240)

A descriptive error message if the execution failed (`status` is 'error').

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:242](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L242)

Optional metadata about the execution (e.g., duration, cost, logs).

***

### output?

> `optional` **output**: `any`

Defined in: [types/index.ts:238](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L238)

The data returned by the tool upon successful execution. Structure may be validated against `outputSchema`.

***

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/index.ts:236](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L236)

Indicates whether the tool execution succeeded or failed.

***

### toolName

> **toolName**: `string`

Defined in: [types/index.ts:234](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L234)

The name of the tool that was executed.
