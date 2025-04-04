// src/tools/CalculatorTool.ts
import { IToolExecutor } from '../core/interfaces';
import { ToolSchema, ExecutionContext, ToolResult } from '../types';
import { Logger } from '../utils/logger';

export class CalculatorTool implements IToolExecutor {
  public static readonly toolName = "calculator"; // Add static name

  readonly schema: ToolSchema = {
    name: CalculatorTool.toolName, // Use static name
    description: 'Evaluates a mathematical expression provided as a string. Supports basic arithmetic operations (+, -, *, /) and numbers.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "2 + 2", "10 * (5 - 3) / 4").',
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
    ],
  };

  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    const expression = input.expression as string;
    const callId = context.traceId || 'calculator-call'; // Use traceId or generate one

    Logger.debug(`CalculatorTool executing with expression: "${expression}"`, { callId, context });

    try {
      // Basic safe evaluation: Only allow numbers, operators, parentheses, and whitespace.
      // WARNING: This is a simplified approach. A production system should use a robust math parser/evaluator.
      // Avoid using eval() directly due to security risks.
      const sanitizedExpression = expression.replace(/[^-()\d/*+.\s]/g, ''); // Remove potentially unsafe characters

      if (sanitizedExpression !== expression) {
         Logger.warn(`CalculatorTool: Expression contained potentially unsafe characters. Original: "${expression}", Sanitized: "${sanitizedExpression}"`, { callId });
         // Decide whether to proceed with sanitized or throw an error
         // throw new Error('Expression contains invalid characters.');
      }

      // Use Function constructor for slightly safer evaluation than direct eval()
      // Still carries risks if the sanitization is insufficient.
      const calculate = new Function(`return ${sanitizedExpression}`);
      const resultValue = calculate();

      if (typeof resultValue !== 'number' || !Number.isFinite(resultValue)) {
          throw new Error(`Calculation resulted in a non-finite number: ${resultValue}`);
      }

      Logger.info(`CalculatorTool evaluated "${sanitizedExpression}" to ${resultValue}`, { callId });

      return {
        callId: callId,
        toolName: this.schema.name,
        status: 'success',
        output: { result: resultValue }, // Structure matches potential outputSchema
      };
    } catch (error: any) {
      Logger.error(`CalculatorTool failed to evaluate expression "${expression}": ${error.message}`, { callId, error });
      return {
        callId: callId,
        toolName: this.schema.name,
        status: 'error',
        error: `Failed to evaluate expression: ${error.message}`,
      };
    }
  }
}