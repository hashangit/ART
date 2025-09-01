[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IToolExecutor

# Interface: IToolExecutor

Defined in: [src/core/interfaces.ts:191](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L191)

Interface for the executable logic of a tool.

## Properties

### schema

> `readonly` **schema**: [`ToolSchema`](ToolSchema.md)

Defined in: [src/core/interfaces.ts:193](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L193)

The schema definition for this tool.

## Methods

### execute()

> **execute**(`input`, `context`): `Promise`\<[`ToolResult`](ToolResult.md)\>

Defined in: [src/core/interfaces.ts:201](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L201)

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
