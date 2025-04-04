// src/tools/CalculatorTool.ts
import { IToolExecutor } from '../core/interfaces';
import { ToolSchema, ExecutionContext, ToolResult } from '../types';
import { Logger } from '../utils/logger';
import { evaluate } from 'mathjs'; // Import mathjs evaluate function

export class CalculatorTool implements IToolExecutor {
  public static readonly toolName = "calculator"; // Add static name

  readonly schema: ToolSchema = {
    name: CalculatorTool.toolName, // Use static name
    description: 'Evaluates mathematical expressions using mathjs. Supports standard operators (+, -, *, /, %, ^), common functions (sqrt, log, sin, cos, mod, etc.), and variables passed via an optional \'scope\' object.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "a * b").',
        },
        scope: {
          type: 'object',
          description: 'An optional object containing variables and their values to be used in the expression (e.g., {"a": 5, "b": 3}).',
          additionalProperties: { type: 'number' }, // Allow any property name with a number value
          default: {}, // Default to an empty scope
        },
      },
      required: ['expression'],
    },
    // Optional: Define output schema if needed
    // outputSchema: {
    //   type: 'object',
    //   properties: {
    //     result: { type: 'number', description: 'The numerical result of the calculation.' }
    //   },
    //   required: ['result']
    // },
    examples: [
      { input: { expression: "2 + 2" }, output: { result: 4 }, description: "Simple addition" },
      { input: { expression: "10 * 5" }, output: { result: 50 }, description: "Simple multiplication" },
      { input: { expression: "(15 - 3) / 4" }, output: { result: 3 }, description: "Expression with parentheses and division" },
      { input: { expression: "12 % 5" }, output: { result: 2 }, description: "Modulo operation" },
      { input: { expression: "sqrt(16)" }, output: { result: 4 }, description: "Square root function" },
      { input: { expression: "a + b", scope: { a: 7, b: 3 } }, output: { result: 10 }, description: "Expression with variables from scope" },
      { input: { expression: "result % 13", scope: { result: 347 } }, output: { result: 9 }, description: "Modulo with variable from scope" },
    ],
  };

  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    const expression = input.expression as string;
    const scope = (input.scope || {}) as Record<string, number>; // Get scope or default to empty object
    const callId = context.traceId || 'calculator-call'; // Use traceId or generate one

    Logger.debug(`CalculatorTool executing with expression: "${expression}" and scope: ${JSON.stringify(scope)}`, { callId, context });

    try {
      // Use mathjs.evaluate for safe and robust evaluation
      const resultValue = evaluate(expression, scope);

      // Check if the result is a finite number (mathjs can return other types)
      if (typeof resultValue !== 'number' || !Number.isFinite(resultValue)) {
        // Handle cases where mathjs returns functions, matrices, etc., or non-finite numbers
        throw new Error(`Evaluation resulted in a non-finite or non-numeric value: ${resultValue}`);
      }

      Logger.info(`CalculatorTool evaluated "${expression}" with scope ${JSON.stringify(scope)} to ${resultValue}`, { callId });

      return {
        callId: callId,
        toolName: this.schema.name,
        status: 'success',
        output: { result: resultValue }, // Structure matches potential outputSchema
      };
    } catch (error: any) {
      Logger.error(`CalculatorTool failed to evaluate expression "${expression}" with scope ${JSON.stringify(scope)}: ${error.message}`, { callId, error });
      return {
        callId: callId,
        toolName: this.schema.name,
        status: 'error',
        error: `Failed to evaluate expression: ${error.message}`,
      };
    }
  }
}