[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IToolExecutor

# Interface: IToolExecutor

Defined in: [src/core/interfaces.ts:206](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L206)

Interface for the executable logic of a tool.

## Properties

### schema

> `readonly` **schema**: [`ToolSchema`](ToolSchema.md)

Defined in: [src/core/interfaces.ts:208](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L208)

The schema definition for this tool.

## Methods

### execute()

> **execute**(`input`, `context`): `Promise`\<[`ToolResult`](ToolResult.md)\>

Defined in: [src/core/interfaces.ts:216](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L216)

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
