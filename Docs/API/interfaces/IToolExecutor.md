[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IToolExecutor

# Interface: IToolExecutor

Defined in: [src/core/interfaces.ts:164](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/core/interfaces.ts#L164)

Interface for the executable logic of a tool.

## Properties

### schema

> `readonly` **schema**: [`ToolSchema`](ToolSchema.md)

Defined in: [src/core/interfaces.ts:166](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/core/interfaces.ts#L166)

The schema definition for this tool.

## Methods

### execute()

> **execute**(`input`, `context`): `Promise`\<[`ToolResult`](ToolResult.md)\>

Defined in: [src/core/interfaces.ts:174](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/core/interfaces.ts#L174)

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
