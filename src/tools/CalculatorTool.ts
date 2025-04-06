// src/tools/CalculatorTool.ts
import { IToolExecutor } from '../core/interfaces';
import { ToolSchema, ExecutionContext, ToolResult } from '../types';
import { Logger } from '../utils/logger';
// Import necessary parts from mathjs
import { evaluate, type Complex } from 'mathjs'; // Removed unused MathJsStatic, MathNode
import * as math from 'mathjs'; // Import the full math object to access functions

/**
 * A restricted set of safe functions allowed from the mathjs library.
 * Prevents access to potentially unsafe functions like `import`, `evaluate`, etc.
 * @internal
 */
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
  // Statistical functions
  mean: math.mean,
  median: math.median,
  std: math.std,
  variance: math.variance,
  max: math.max,
  min: math.min,
  // Additional mathematical functions
  factorial: math.factorial,
  gamma: math.gamma,
  combinations: math.combinations,
  permutations: math.permutations,
  // Number formatting
  format: math.format,
  // Constants (implicitly allowed via evaluate, but good to be aware)
  // pi: math.pi,
  // e: math.e,
};

/**
 * An ART Framework tool that safely evaluates mathematical expressions using the mathjs library.
 * It supports basic arithmetic, variables via a scope, complex numbers, and a predefined list of safe functions.
 *
 * @implements {IToolExecutor}
 */
export class CalculatorTool implements IToolExecutor {
  /** The unique name identifier for this tool. */
  public static readonly toolName = "calculator";
  
  /** Store for previous calculation results by threadId */
  private resultStore: Map<string, any> = new Map();

  /**
   * The schema definition for the CalculatorTool, conforming to the `ToolSchema` interface.
   * It defines the tool's name, description, input parameters (expression and optional scope),
   * and provides examples for the LLM.
   */
  readonly schema: ToolSchema = {
    name: CalculatorTool.toolName,
    description: `Evaluates mathematical expressions using a sandboxed mathjs environment. 
You can reference previous calculation results using the 'ans' variable.
Supports standard operators (+, -, *, /, %, ^), variables via 'scope', complex numbers, and the following allowed functions:
sqrt, cbrt, abs, pow, exp, log, log10, log2, sin, cos, tan, asin, acos, atan, atan2, round, floor, ceil, mod, 
mean, median, std, variance, max, min, factorial, gamma, combinations, permutations, format.`,
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
    // Note: outputSchema is omitted as the result can be number or string (for complex numbers).
    // A more complex schema using 'oneOf' could be defined if strict output validation is needed.
    examples: [
      { input: { expression: "2 + 2" }, output: { result: 4 }, description: "Simple addition" },
      { input: { expression: "12 % 5" }, output: { result: 2 }, description: "Modulo operation" },
      { input: { expression: "sqrt(16)" }, output: { result: 4 }, description: "Square root function" },
      { input: { expression: "a + b", scope: { a: 7, b: 3 } }, output: { result: 10 }, description: "Expression with variables" },
      { input: { expression: "result % 13", scope: { result: 347 } }, output: { result: 9 }, description: "Modulo with variable" },
      { input: { expression: "sqrt(-4)" }, output: { result: "2i" }, description: "Square root of negative (complex result)" },
      { input: { expression: "pow(i, 2)" }, output: { result: -1 }, description: "Complex number calculation (i^2)" },
      { input: { expression: "log(10)" }, output: { result: 2.302585092994046 }, description: "Natural logarithm" },
      { input: { expression: "factorial(5)" }, output: { result: 120 }, description: "Factorial function" },
      { input: { expression: "ans + 10" }, output: { result: 130 }, description: "Using previous result with 'ans'" },
      { input: { expression: "mean([1, 2, 3, 4, 5])" }, output: { result: 3 }, description: "Statistical function" },
      // Example of how an error might be represented if a disallowed function were used:
      // { input: { expression: "factorial(5)" }, error: "Failed to evaluate expression: Function factorial is not allowed" },
    ],
  };

   /**
   * Executes the calculator tool by evaluating the provided mathematical expression.
   * It uses a restricted scope including only allowed mathjs functions and any variables
   * passed in the `input.scope`. Handles basic number and complex number results.
   *
   * @param input - An object containing the `expression` (string) and optional `scope` (object). Must match `inputSchema`.
   * @param context - The execution context containing `threadId`, `traceId`, etc.
   * @returns A promise resolving to a `ToolResult` object.
   *          On success, `status` is 'success' and `output` is `{ result: number | string }`.
   *          On failure, `status` is 'error' and `error` contains the error message.
   */
  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    const expression = input.expression as string;
    const threadId = context.threadId || 'default-thread';
    
    // Get previous result for this thread if available
    const previousResult = this.resultStore.get(threadId);
    
    // Combine user scope with allowed functions and previous result. User scope takes precedence if names clash.
    const executionScope = { 
      ...allowedFunctions, 
      ...(input.scope || {}),
      // Add 'ans' variable referencing the previous result
      ...(previousResult !== undefined ? { ans: previousResult } : {})
    };
    
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

      // Store the result for future reference
      this.resultStore.set(threadId, resultValue);

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