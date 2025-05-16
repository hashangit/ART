[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ToolResult

# Interface: ToolResult

Defined in: [types/index.ts:226](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L226)

Represents the structured result of a tool execution.

## Properties

### callId

> **callId**: `string`

Defined in: [types/index.ts:228](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L228)

The unique identifier of the corresponding `ParsedToolCall` that initiated this execution attempt.

***

### error?

> `optional` **error**: `string`

Defined in: [types/index.ts:236](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L236)

A descriptive error message if the execution failed (`status` is 'error').

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:238](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L238)

Optional metadata about the execution (e.g., duration, cost, logs).

***

### output?

> `optional` **output**: `any`

Defined in: [types/index.ts:234](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L234)

The data returned by the tool upon successful execution. Structure may be validated against `outputSchema`.

***

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/index.ts:232](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L232)

Indicates whether the tool execution succeeded or failed.

***

### toolName

> **toolName**: `string`

Defined in: [types/index.ts:230](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/types/index.ts#L230)

The name of the tool that was executed.
