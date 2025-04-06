[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IToolExecutor

# Interface: IToolExecutor

Defined in: [core/interfaces.ts:138](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L138)

Interface for the executable logic of a tool.

## Properties

### schema

> `readonly` **schema**: [`ToolSchema`](ToolSchema.md)

Defined in: [core/interfaces.ts:140](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L140)

The schema definition for this tool.

## Methods

### execute()

> **execute**(`input`, `context`): `Promise`\<[`ToolResult`](ToolResult.md)\>

Defined in: [core/interfaces.ts:148](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L148)

Executes the tool's logic.

#### Parameters

##### input

`any`

Validated input arguments matching the tool's inputSchema.

##### context

[`ExecutionContext`](ExecutionContext.md)

Execution context containing threadId, traceId, etc.

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\>

A promise resolving to the structured tool result.
