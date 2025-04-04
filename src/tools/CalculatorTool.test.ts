// src/tools/CalculatorTool.test.ts
import { describe, it, expect, beforeEach, test } from 'vitest'; // Explicit imports
import { CalculatorTool } from './CalculatorTool';
import { ExecutionContext } from '../types';

describe('CalculatorTool', () => {
  let calculatorTool: CalculatorTool;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    calculatorTool = new CalculatorTool();
    mockContext = {
      threadId: 'test-thread',
      traceId: 'test-trace',
    };
  });

  it('should have the correct schema', () => {
    expect(calculatorTool.schema.name).toBe('calculator');
    expect(calculatorTool.schema.description).toContain('mathjs');
    // Use non-null assertions (!) assuming the structure is correct for this tool
    expect(calculatorTool.schema.inputSchema!.properties).toHaveProperty('expression');
    expect(calculatorTool.schema.inputSchema!.properties).toHaveProperty('scope');
    expect((calculatorTool.schema.inputSchema!.properties! as any).scope.type).toBe('object');
    expect(calculatorTool.schema.examples!.length).toBeGreaterThan(3); // Check if examples were updated
  });

  test.each([
    // Basic Arithmetic
    { expression: '2 + 2', scope: undefined, expected: 4 },
    { expression: '10 - 3', scope: undefined, expected: 7 },
    { expression: '5 * 6', scope: undefined, expected: 30 },
    { expression: '20 / 4', scope: undefined, expected: 5 },
    // Parentheses
    { expression: '(10 + 5) * 2', scope: undefined, expected: 30 },
    // Modulo
    { expression: '13 % 5', scope: undefined, expected: 3 },
    { expression: 'mod(13, 5)', scope: undefined, expected: 3 }, // Using mathjs function
    // Functions
    { expression: 'sqrt(25)', scope: undefined, expected: 5 },
    { expression: 'pow(2, 3)', scope: undefined, expected: 8 },
    // Scope / Variables
    { expression: 'a + b', scope: { a: 10, b: 5 }, expected: 15 },
    { expression: 'radius * 2 * pi', scope: { radius: 5 }, expected: 31.41592653589793 }, // pi is built-in
    // Original failing case
    { expression: 'result % 13', scope: { result: 347 }, expected: 9 },
    // Decimal numbers
    { expression: '1.5 * 2.2', scope: undefined, expected: 3.3 },
  ])('should evaluate "$expression" correctly', async ({ expression, scope, expected }) => {
    const input = { expression, scope };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: expected });
    expect(result.error).toBeUndefined();
  });

  it('should return an error for invalid expressions', async () => {
    const input = { expression: '5 + * 3' }; // Invalid syntax
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    expect(result.error).toContain('Invalid expression'); // mathjs error message might vary slightly
  });

  it('should return an error for undefined symbols when no scope is provided', async () => {
    const input = { expression: 'x + y' }; // Undefined symbols
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    expect(result.error).toContain('Undefined symbol');
  });

   it('should return an error if evaluation results in non-finite/non-numeric value', async () => {
    // Example: mathjs might return a function or other complex type if not careful
    // Let's test with an expression that might lead to issues if not handled
    const input = { expression: 'f(x) = x^2' }; // Defines a function, not a number
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    expect(result.error).toContain('Evaluation resulted in a non-finite or non-numeric value');
  });

  it('should handle empty scope correctly', async () => {
    const input = { expression: '5 * 5', scope: {} };
    const result = await calculatorTool.execute(input, mockContext);
    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: 25 });
  });

  it('should use default empty scope if scope is not provided', async () => {
    const input = { expression: '9 / 3' }; // No scope property
    const result = await calculatorTool.execute(input, mockContext);
    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: 3 });
  });
});