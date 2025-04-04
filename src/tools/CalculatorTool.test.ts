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
    // Check for keywords in the updated description
    expect(calculatorTool.schema.description).toContain('sandboxed mathjs environment');
    expect(calculatorTool.schema.description).toContain('complex numbers');
    expect(calculatorTool.schema.description).toContain('allowed functions');
    expect(calculatorTool.schema.description).toContain('sqrt'); // Example allowed function
    // Use non-null assertions (!) assuming the structure is correct for this tool
    expect(calculatorTool.schema.inputSchema!.properties).toHaveProperty('expression');
    expect(calculatorTool.schema.inputSchema!.properties).toHaveProperty('scope');
    expect((calculatorTool.schema.inputSchema!.properties! as any).scope.type).toBe('object');
    expect(calculatorTool.schema.examples!.length).toBeGreaterThan(5); // Check if examples were updated
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
    { expression: 'mod(13, 5)', scope: undefined, expected: 3 }, // Using allowed mathjs function
    // Allowed Functions
    { expression: 'sqrt(25)', scope: undefined, expected: 5 },
    { expression: 'pow(2, 3)', scope: undefined, expected: 8 },
    { expression: 'log(10)', scope: undefined, expected: 2.302585092994046 }, // Natural log
    { expression: 'sin(pi / 2)', scope: undefined, expected: 1 }, // Using built-in pi
    { expression: 'round(3.7)', scope: undefined, expected: 4 },
    // Scope / Variables
    { expression: 'a + b', scope: { a: 10, b: 5 }, expected: 15 },
    { expression: 'radius * 2 * pi', scope: { radius: 5 }, expected: 31.41592653589793 }, // pi is built-in
    // Original failing case
    { expression: 'result % 13', scope: { result: 347 }, expected: 9 },
    // Decimal numbers
    { expression: '1.5 * 2.2', scope: undefined, expected: 3.3 },
    // Complex Numbers
    { expression: 'sqrt(-4)', scope: undefined, expected: '2i' }, // String output for complex
    { expression: 'pow(i, 2)', scope: undefined, expected: -1 }, // i is built-in
    { expression: '1 + 2i', scope: undefined, expected: '1 + 2i' },
    { expression: '(1 + i) * (2 + 3i)', scope: undefined, expected: '-1 + 5i' },
  ])('should evaluate "$expression" correctly', async ({ expression, scope, expected }) => {
    const input = { expression, scope };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: expected });
    expect(result.error).toBeUndefined();
  });

  it('should return a specific error for invalid expressions', async () => {
    const input = { expression: '5 + * 3' }; // Invalid syntax
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    // Check for a more specific mathjs error part
    expect(result.error).toMatch(/Failed to evaluate expression:.*Value expected|Unexpected operator/i);
  });

  it('should return a specific error for undefined symbols', async () => {
    const input = { expression: 'x + y' }; // Undefined symbols
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    expect(result.error).toContain('Failed to evaluate expression: Undefined symbol x');
  });

   it('should return an error for unsupported result types', async () => {
    // Function definition is not a supported output type (number or complex string)
    const input = { expression: 'f(x) = x^2' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    expect(result.error).toContain('Failed to evaluate expression: Evaluation resulted in an unsupported type: FunctionNode'); // Updated error message
  });

  it('should return an error for disallowed functions', async () => {
    // 'import' is a dangerous function in mathjs and should be disallowed by our scope control
    const input = { expression: 'import("fs")' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    expect(result.error).toContain('Failed to evaluate expression: Undefined symbol import'); // It's treated as undefined because it's not in the scope
  });

  it('should return an error for functions not in the allowlist', async () => {
    // 'factorial' is a valid mathjs function but not in our explicit allowlist
    const input = { expression: 'factorial(5)' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.output).toBeUndefined();
    expect(result.error).toContain('Failed to evaluate expression: Undefined symbol factorial'); // Treated as undefined
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