[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / CalculatorTool

# Class: CalculatorTool

Defined in: [src/tools/CalculatorTool.ts:62](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/tools/CalculatorTool.ts#L62)

An ART Framework tool that safely evaluates mathematical expressions using the mathjs library.
It supports basic arithmetic, variables via a scope, complex numbers, and a predefined list of safe functions.

## Implements

## Implements

- [`IToolExecutor`](../interfaces/IToolExecutor.md)

## Constructors

### Constructor

> **new CalculatorTool**(): `CalculatorTool`

#### Returns

`CalculatorTool`

## Properties

### schema

> `readonly` **schema**: [`ToolSchema`](../interfaces/ToolSchema.md)

Defined in: [src/tools/CalculatorTool.ts:75](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/tools/CalculatorTool.ts#L75)

The schema definition for the CalculatorTool, conforming to the `ToolSchema` interface.
It defines the tool's name, description, input parameters (expression and optional scope),
and provides examples for the LLM.

#### Implementation of

[`IToolExecutor`](../interfaces/IToolExecutor.md).[`schema`](../interfaces/IToolExecutor.md#schema)

***

### toolName

> `readonly` `static` **toolName**: `"calculator"` = `"calculator"`

Defined in: [src/tools/CalculatorTool.ts:64](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/tools/CalculatorTool.ts#L64)

The unique name identifier for this tool.

## Methods

### execute()

> **execute**(`input`, `context`): `Promise`\<[`ToolResult`](../interfaces/ToolResult.md)\>

Defined in: [src/tools/CalculatorTool.ts:128](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/tools/CalculatorTool.ts#L128)

Executes the calculator tool by evaluating the provided mathematical expression.
It uses a restricted scope including only allowed mathjs functions and any variables
passed in the `input.scope`. Handles basic number and complex number results.

#### Parameters

##### input

`any`

An object containing the `expression` (string) and optional `scope` (object). Must match `inputSchema`.

##### context

[`ExecutionContext`](../interfaces/ExecutionContext.md)

The execution context containing `threadId`, `traceId`, etc.

#### Returns

`Promise`\<[`ToolResult`](../interfaces/ToolResult.md)\>

A promise resolving to a `ToolResult` object.
         On success, `status` is 'success' and `output` is `{ result: number | string }`.
         On failure, `status` is 'error' and `error` contains the error message.

#### Implementation of

[`IToolExecutor`](../interfaces/IToolExecutor.md).[`execute`](../interfaces/IToolExecutor.md#execute)
