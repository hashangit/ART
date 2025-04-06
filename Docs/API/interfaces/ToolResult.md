[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ToolResult

# Interface: ToolResult

Defined in: [types/index.ts:120](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L120)

Represents the structured result of a tool execution.

## Properties

### callId

> **callId**: `string`

Defined in: [types/index.ts:122](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L122)

The unique identifier of the corresponding `ParsedToolCall` that initiated this execution attempt.

***

### error?

> `optional` **error**: `string`

Defined in: [types/index.ts:130](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L130)

A descriptive error message if the execution failed (`status` is 'error').

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:132](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L132)

Optional metadata about the execution (e.g., duration, cost, logs).

***

### output?

> `optional` **output**: `any`

Defined in: [types/index.ts:128](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L128)

The data returned by the tool upon successful execution. Structure may be validated against `outputSchema`.

***

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/index.ts:126](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L126)

Indicates whether the tool execution succeeded or failed.

***

### toolName

> **toolName**: `string`

Defined in: [types/index.ts:124](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/types/index.ts#L124)

The name of the tool that was executed.
