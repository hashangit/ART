// src/tools/CalculatorTool.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalculatorTool } from './CalculatorTool';
import { ExecutionContext } from '../types';
import { Logger } from '../utils/logger';

// Mock Logger
vi.mock('../utils/logger', () => ({ // Note the relative path change
  Logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    configure: vi.fn(),
  },
}));

describe('CalculatorTool', () => {
  let calculatorTool: CalculatorTool;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    calculatorTool = new CalculatorTool();
    mockContext = {
      threadId: 'test-thread',
      traceId: 'test-trace-123',
    };
    vi.clearAllMocks();
  });

  it('should have the correct schema', () => {
    expect(calculatorTool.schema.name).toBe('calculator');
    expect(calculatorTool.schema.description).toBeDefined();
    expect(calculatorTool.schema.inputSchema).toEqual({
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: expect.any(String),
        },
      },
      required: ['expression'],
    });
  });

  // --- Success Cases ---
  it('should evaluate a simple addition expression', async () => {
    const input = { expression: '2 + 3' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: 5 });
    expect(result.toolName).toBe('calculator');
    expect(result.callId).toBe(mockContext.traceId); // Uses traceId as callId
    expect(Logger.info).toHaveBeenCalledWith('CalculatorTool evaluated "2 + 3" to 5', expect.anything());
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('should evaluate an expression with multiplication and subtraction', async () => {
    const input = { expression: '10 * 5 - 2' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: 48 });
  });

  it('should evaluate an expression with division and parentheses', async () => {
    const input = { expression: '(10 + 6) / 4' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: 4 });
  });

   it('should handle floating point numbers', async () => {
    const input = { expression: '1.5 * 2.0' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: 3.0 });
  });

   it('should handle negative numbers', async () => {
    const input = { expression: '-5 + 2' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ result: -3 });
  });

  // --- Failure Cases ---
  it('should return an error for invalid syntax', async () => {
    const input = { expression: '2 +* 3' }; // Invalid syntax
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to evaluate expression:');
    // The exact error message from Function constructor can vary
    expect(Logger.error).toHaveBeenCalledOnce();
  });

  it('should return an error for division by zero (Infinity)', async () => {
    const input = { expression: '5 / 0' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Calculation resulted in a non-finite number: Infinity');
    expect(Logger.error).toHaveBeenCalledOnce();
  });

  it('should return an error for unsafe characters if strict checking were enabled (though currently warns)', async () => {
    // Note: Current implementation sanitizes and proceeds, logging a warning.
    // A stricter version might throw an error here.
    const input = { expression: 'alert("hack")' };
    const result = await calculatorTool.execute(input, mockContext);

    // Because it sanitizes to empty string, Function constructor fails
    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to evaluate expression:');
    expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Expression contained potentially unsafe characters'),
        expect.anything()
    );
     expect(Logger.error).toHaveBeenCalledOnce(); // Error from Function('')
  });

   it('should return an error if expression evaluates to NaN', async () => {
    const input = { expression: '0 / 0' };
    const result = await calculatorTool.execute(input, mockContext);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Calculation resulted in a non-finite number: NaN');
    expect(Logger.error).toHaveBeenCalledOnce();
  });

   it('should use default callId if traceId is missing', async () => {
    const contextWithoutTrace: ExecutionContext = { threadId: 't-no-trace' };
    const input = { expression: '1+1' };
    const result = await calculatorTool.execute(input, contextWithoutTrace);

    expect(result.status).toBe('success');
    expect(result.callId).toBe('calculator-call'); // Default ID
  });
});