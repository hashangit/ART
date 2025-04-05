// src/tools/CalculatorTool.ts
import { IToolExecutor } from '../core/interfaces';
import { ToolSchema, ExecutionContext, ToolResult } from '../types';
import { Logger } from '../utils/logger';
// Import necessary parts from mathjs
import { evaluate, type Complex } from 'mathjs'; // Removed unused MathJsStatic, MathNode
import * as math from 'mathjs'; // Import the full math object to access functions

// Define the allowed functions from mathjs
const allowedFunctions: Record<string, any> = {
  // Basic arithmetic & roots
  sqrt: math.sqrt,
  cbrt: math.cbrt,
  abs: math.abs,
  pow: math.pow, // Note: ^ operator also works
  exp: math.exp,
  log: math.log,
  log10: math.log10,
  log2: math.log2,
  // Trigonometry
  sin: math.sin,
  cos: math.cos,
  tan: math.tan,
  asin: math.asin,
  acos: math.acos,
  atan: math.atan,
  atan2: math.atan2,
  // Rounding & Modulo
  round: math.round,
  floor: math.floor,
  ceil: math.ceil,
  mod: math.mod, // Note: % operator also works
  // Constants (implicitly allowed via evaluate, but good to be aware)
  // pi: math.pi,
  // e: math.e,
};

export class CalculatorTool implements IToolExecutor {
  public static readonly toolName = "calculator";

  readonly schema: ToolSchema = {
    name: CalculatorTool.toolName,
    description: `Evaluates mathematical expressions using a sandboxed mathjs environment. IMPORTANT LIMITATIONS: Each expression is evaluated independently; there is no memory of previous results (e.g., no 'ans' variable). Only a specific list of functions is supported.
Supports standard operators (+, -, *, /, %, ^), variables via 'scope', complex numbers, and the following allowed functions:
sqrt, cbrt, abs, pow, exp, log, log10, log2, sin, cos, tan, asin, acos, atan, atan2, round, floor, ceil, mod.`,
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(a)", "a * b", "sqrt(-4)").',
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
    // Removed outputSchema due to type conflicts with 'oneOf'. Output is { result: number | string }.
    examples: [
      { input: { expression: "2 + 2" }, output: { result: 4 }, description: "Simple addition" },
      { input: { expression: "12 % 5" }, output: { result: 2 }, description: "Modulo operation" },
      { input: { expression: "sqrt(16)" }, output: { result: 4 }, description: "Square root function" },
      { input: { expression: "a + b", scope: { a: 7, b: 3 } }, output: { result: 10 }, description: "Expression with variables" },
      { input: { expression: "result % 13", scope: { result: 347 } }, output: { result: 9 }, description: "Modulo with variable" },
      { input: { expression: "sqrt(-4)" }, output: { result: "2i" }, description: "Square root of negative (complex result)" },
      { input: { expression: "pow(i, 2)" }, output: { result: -1 }, description: "Complex number calculation (i^2)" },
      { input: { expression: "log(10)" }, output: { result: 2.302585092994046 }, description: "Natural logarithm" },
      // Example of a disallowed function (if factorial '!' were disallowed)
      // { input: { expression: "5!" }, error: "Failed to evaluate expression: Function factorial is not allowed" },
    ],
  };

  // TODO: Enhance CalculatorTool:
  // 1. Implement state management to allow referencing previous results within a single execution sequence (e.g., using 'ans' or similar).
  // 2. Expand the library of allowed functions (e.g., add 'digits', factorial '!', statistical functions, etc.). Consider security implications.
  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    const expression = input.expression as string;
    // Combine user scope with allowed functions. User scope takes precedence if names clash.
    const executionScope = { ...allowedFunctions, ...(input.scope || {}) };
    const callId = context.traceId || 'calculator-call';

    Logger.debug(`CalculatorTool executing with expression: "${expression}" and combined scope keys: ${Object.keys(executionScope).join(', ')}`, { callId, context });

    try {
      // Use mathjs.evaluate with the restricted scope
      const resultValue = evaluate(expression, executionScope);

      let outputResult: number | string;

      // Check if the result is a finite number
      if (typeof resultValue === 'number' && Number.isFinite(resultValue)) {
        outputResult = resultValue;
      }
      // Check if the result is a Complex number
      else if (math.isComplex(resultValue)) {
         // Convert complex number to string representation (e.g., "2 + 3i")
        outputResult = (resultValue as Complex).toString();
      }
      // Handle other types (like matrices, units, functions returned) as errors for now
      else {
        throw new Error(`Evaluation resulted in an unsupported type: ${math.typeOf(resultValue)}`);
      }

      Logger.info(`CalculatorTool evaluated "${expression}" to ${outputResult}`, { callId });

      return {
        callId: callId,
        toolName: this.schema.name,
        status: 'success',
        output: { result: outputResult }, // Use the processed result
      };
    } catch (error: any) {
      Logger.error(`CalculatorTool failed to evaluate expression "${expression}": ${error.message}`, { callId, error });
      // Return the specific error message from mathjs or our validation
      return {
        callId: callId,
        toolName: this.schema.name,
        status: 'error',
        error: `Failed to evaluate expression: ${error.message}`, // More specific error
      };
    }
  }
}