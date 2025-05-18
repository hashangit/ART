# Built-in Tool: `CalculatorTool`

The `CalculatorTool` is a built-in tool provided by the ART Framework that allows agents to evaluate mathematical expressions. It uses the [mathjs](https
://mathjs.org/) library in a sandboxed environment to perform calculations safely.

*   **Source:** `src/tools/CalculatorTool.ts`
*   **Implements:** `IToolExecutor`

## Features

*   **Safe Evaluation:** Uses `mathjs.evaluate()` with a restricted scope to prevent execution of arbitrary or unsafe code.
*   **Supported Operations:**
    *   Basic arithmetic: `+`, `-`, `*`, `/`, `%` (modulo), `^` (power).
    *   Parentheses for grouping.
    *   Complex numbers (e.g., `sqrt(-4)`, `(1+i)*(2-i)`).
*   **Allowed Functions:** A predefined set of safe mathematical functions from `mathjs` are exposed, including:
    *   Roots: `sqrt`, `cbrt`
    *   Absolute value: `abs`
    *   Exponentials & Logarithms: `exp`, `log` (natural), `log10`, `log2`
    *   Trigonometry: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`
    *   Rounding: `round`, `floor`, `ceil`
    *   Statistical: `mean`, `median`, `std`, `variance`, `max`, `min`
    *   Combinatorics: `factorial`, `gamma`, `combinations`, `permutations`
    *   Formatting: `format`
*   **Variable Scope:** Supports passing variables and their numeric values via an optional `scope` object in the input.
*   **Previous Result (`ans` variable):** The tool remembers the result of the last calculation *within the same thread* and makes it available as a special variable named `ans` for subsequent calculations in that thread.

## Schema (`ToolSchema`)

The `CalculatorTool.schema` property defines its interface for the LLM and the `ToolSystem`:

```typescript
{
  name: "calculator",
  description: "Evaluates mathematical expressions using a sandboxed mathjs environment.\nYou can reference previous calculation results using the 'ans' variable.\nSupports standard operators (+, -, *, /, %, ^), variables via 'scope', complex numbers, and a predefined list of allowed functions...", // (truncated for brevity, see source for full list)
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(a)", "a * b", "sqrt(-4)", "factorial(5)", "ans + 10").',
      },
      scope: {
        type: 'object',
        description: 'An optional object containing variables and their values (numbers only) to be used in the expression (e.g., {"a": 16, "b": 3}).',
        additionalProperties: { type: 'number' },
        default: {},
      },
    },
    required: ['expression'],
  },
  examples: [
    // ... (see source or tests for full list of examples)
    { input: { expression: "2 + 2" }, output: { result: 4 } },
    { input: { expression: "a + b", scope: { a: 7, b: 3 } }, output: { result: 10 } },
    { input: { expression: "sqrt(-4)" }, output: { result: "2i" } },
    { input: { expression: "ans + 10" }, output: { result: 130 }, description: "Using previous result (assuming previous result was 120)" },
  ]
}
```

**Input:**

*   `expression: string` (Required): The mathematical expression to evaluate.
*   `scope?: object` (Optional): An object where keys are variable names and values are their **numeric** values.

**Output (on success):**

*   An object: `{ result: number | string }`
    *   `result`: The numerical result of the calculation, or a string representation if the result is a complex number (e.g., "2i", "-1 + 5i").

## `execute` Method

`async execute(input: any, context: ExecutionContext): Promise<ToolResult>`

1.  Retrieves the `expression` and optional `scope` from the `input`.
2.  Retrieves the `threadId` from the `context` to manage the `ans` variable correctly per thread.
3.  Fetches the previous calculation result (`ans`) for the current `threadId` from an internal `resultStore` (a `Map`).
4.  Constructs an `executionScope` for `mathjs.evaluate()`:
    *   Starts with the `allowedFunctions`.
    *   Merges in the user-provided `input.scope`.
    *   If a previous result (`ans`) exists for the thread, it's added to the scope.
5.  Calls `mathjs.evaluate(expression, executionScope)`.
6.  **Result Handling:**
    *   If the result is a finite `number`, it's used directly.
    *   If the result is a `Complex` number object from `mathjs`, it's converted to its string representation (e.g., `"2 + 3i"`).
    *   If the evaluation results in any other type (e.g., a function definition `f(x)=x^2`, a matrix), it's treated as an error because the tool is designed to return simple numerical or complex string results.
7.  Stores the new numerical or complex result (the actual `mathjs` object, not just the string for complex numbers if further calculations are needed) in the `resultStore` for the current `threadId`, making it available as `ans` for the next calculation in that thread.
8.  Returns a `ToolResult`:
    *   On success: `{ status: 'success', output: { result: outputResult } }`.
    *   On error (e.g., invalid expression, undefined symbol, disallowed function, unsupported result type): `{ status: 'error', error: "Failed to evaluate expression: <error_message>" }`.

## Usage

To use the `CalculatorTool`:

1.  Instantiate it: `new CalculatorTool()`.
2.  Register it with the `ToolRegistry` by including it in the `tools` array of `ArtInstanceConfig` when calling `createArtInstance`.
3.  Ensure your agent's planning prompt informs the LLM about the "calculator" tool, its description, and its input schema (especially the `expression` and optional `scope` arguments, and the `ans` variable).

**Example LLM Interaction:**

*User Query:* "What is 5 times 3, and then add 10 to that result?"

*Agent Plan (Simplified LLM Output):*
```
Intent: Perform two calculations.
Plan:
1. Calculate 5 * 3.
2. Add 10 to the previous result.
Tool Calls: [
  {"callId": "calc1", "toolName": "calculator", "arguments": {"expression": "5 * 3"}},
  {"callId": "calc2", "toolName": "calculator", "arguments": {"expression": "ans + 10"}}
]
```

The `ToolSystem` would execute these sequentially. After the first call, `resultStore` for the thread would hold `15`. The second call would use `ans` (which resolves to `15`) to calculate `15 + 10`.