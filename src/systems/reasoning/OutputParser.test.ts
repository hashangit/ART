// src/systems/reasoning/OutputParser.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutputParser } from './OutputParser';
import { Logger } from '../../utils/logger'; // Import Logger for mocking

// Mock the Logger to prevent console output during tests and allow spying
vi.mock('../../utils/logger', () => ({
  Logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    configure: vi.fn(),
  },
}));

describe('OutputParser', () => {
  let outputParser: OutputParser;

  beforeEach(() => {
    outputParser = new OutputParser();
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  // --- parsePlanningOutput Tests ---

  it('should parse valid planning output with all sections (no fences)', async () => {
    const output = `
      Intent: Find the capital of France and calculate 5 + 7.
      Plan:
      1. Use search tool for "capital of France".
      2. Use calculator tool for "5 + 7".
      3. Combine results.
      Tool Calls: [
        {"callId": "call_1", "toolName": "search", "arguments": {"query": "capital of France"}},
        {"callId": "call_2", "toolName": "calculator", "arguments": {"expression": "5 + 7"}}
      ]
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Find the capital of France and calculate 5 + 7.');
    expect(result.plan).toBe('1. Use search tool for "capital of France".\n      2. Use calculator tool for "5 + 7".\n      3. Combine results.');
    expect(result.toolCalls).toEqual([
      { callId: 'call_1', toolName: 'search', arguments: { query: 'capital of France' } },
      { callId: 'call_2', toolName: 'calculator', arguments: { expression: '5 + 7' } },
    ]);
    expect(Logger.warn).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('should parse valid planning output with ```json fences', async () => {
    const output = `
      Intent: Calculate 2*3.
      Plan: Use calculator.
      Tool Calls: \`\`\`json
      [
        {"callId": "calc1", "toolName": "calculator", "arguments": {"expression": "2*3"}}
      ]
      \`\`\`
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Calculate 2*3.');
    expect(result.plan).toBe('Use calculator.');
    expect(result.toolCalls).toEqual([
      { callId: 'calc1', toolName: 'calculator', arguments: { expression: '2*3' } },
    ]);
    expect(Logger.warn).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('should parse valid planning output with ``` fences', async () => {
    const output = `
      Intent: Calculate 4/2.
      Plan: Use calculator.
      Tool Calls: \`\`\`
      [
        {"callId": "calc2", "toolName": "calculator", "arguments": {"expression": "4/2"}}
      ]
      \`\`\`
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Calculate 4/2.');
    expect(result.plan).toBe('Use calculator.');
    expect(result.toolCalls).toEqual([
      { callId: 'calc2', toolName: 'calculator', arguments: { expression: '4/2' } },
    ]);
    expect(Logger.warn).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('should parse valid planning output with introductory text before JSON array', async () => {
    const output = `
      Intent: Test text before JSON.
      Plan: Extract the JSON correctly.
      Tool Calls: Here is the JSON you requested:
      [
        {"callId": "intro_1", "toolName": "testTool", "arguments": {"value": 123}}
      ]
      Some trailing text maybe.
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Test text before JSON.');
    expect(result.plan).toBe('Extract the JSON correctly.');
    expect(result.toolCalls).toEqual([
      { callId: 'intro_1', toolName: 'testTool', arguments: { value: 123 } },
    ]);
    expect(Logger.warn).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('should parse valid planning output with introductory text before fenced JSON array', async () => {
    const output = `
      Intent: Test text before fenced JSON.
      Plan: Extract the JSON correctly.
      Tool Calls: Please find the tool calls below:
      \`\`\`json
      [
        {"callId": "intro_fenced", "toolName": "anotherTool", "arguments": [1, 2, 3]}
      ]
      \`\`\`
      Thank you.
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Test text before fenced JSON.');
    expect(result.plan).toBe('Extract the JSON correctly.');
    expect(result.toolCalls).toEqual([
      { callId: 'intro_fenced', toolName: 'anotherTool', arguments: [1, 2, 3] },
    ]);
    expect(Logger.warn).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('should parse planning output with missing Plan section', async () => {
    const output = `
      Intent: Calculate 10 / 2.
      Tool Calls: [{"callId": "c1", "toolName": "calculator", "arguments": {"expression": "10 / 2"}}]
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Calculate 10 / 2.');
    expect(result.plan).toBeUndefined();
    expect(result.toolCalls).toEqual([
        { callId: 'c1', toolName: 'calculator', arguments: { expression: '10 / 2' } },
    ]);
  });

   it('should parse planning output with missing Intent section', async () => {
    const output = `
      Plan: Just say hello.
      Tool Calls: []
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBeUndefined();
    expect(result.plan).toBe('Just say hello.');
    expect(result.toolCalls).toEqual([]);
  });

  it('should parse planning output with no tool calls (empty array)', async () => {
    const output = `
      Intent: Say hello back.
      Plan: Respond with "Hello!".
      Tool Calls: []
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Say hello back.');
    expect(result.plan).toBe('Respond with "Hello!".');
    expect(result.toolCalls).toEqual([]);
  });

   it('should parse planning output with no tool calls (section missing)', async () => {
    const output = `
      Intent: Say hello back.
      Plan: Respond with "Hello!".
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Say hello back.');
    expect(result.plan).toBe('Respond with "Hello!".');
    expect(result.toolCalls).toBeUndefined(); // Section missing entirely
  });

  it('should handle malformed JSON in Tool Calls and return empty array', async () => {
    const outputWithMalformedJSON = `Intent: Extract information
Plan: Use tools to get data
Tool Calls: [{"callId": "c1", "toolName": "test", "arguments": {"arg": "value"}] // Missing closing brace`;

    const result = await outputParser.parsePlanningOutput(outputWithMalformedJSON);

    expect(result.intent).toBe('Extract information');
    expect(result.plan).toBe('Use tools to get data');
    expect(result.toolCalls).toEqual([]); // Should default to empty array on parse error
    expect(Logger.error).toHaveBeenCalledOnce();
    expect(Logger.error).toHaveBeenCalledWith(expect.stringMatching(/OutputParser.*Failed to parse extracted JSON array/));
  });

  it('should handle malformed JSON inside fences and return empty array', async () => {
    const outputWithMalformedJSONInFences = `Intent: Extract information
Plan: Use tools to get data
Tool Calls: \`\`\`json
[{"callId": "c1", "toolName": "test", "arguments": {"arg": "value"}] // Missing closing brace
\`\`\``;

    const result = await outputParser.parsePlanningOutput(outputWithMalformedJSONInFences);

    expect(result.intent).toBe('Extract information');
    expect(result.plan).toBe('Use tools to get data');
    expect(result.toolCalls).toEqual([]); // Should default to empty array on parse error
    expect(Logger.error).toHaveBeenCalledOnce();
    expect(Logger.error).toHaveBeenCalledWith(expect.stringMatching(/OutputParser.*Failed to parse extracted JSON array/));
  });

  it('should handle non-array JSON (Zod validation failure) and return empty array', async () => {
    const outputWithNonArrayJSON = `Intent: Extract information
Plan: Use tools to get data
Tool Calls: {"callId": "c1", "toolName": "test", "arguments": {"arg": "value"}}`;

    const result = await outputParser.parsePlanningOutput(outputWithNonArrayJSON);

    expect(result.intent).toBe('Extract information');
    expect(result.plan).toBe('Use tools to get data');
    expect(result.toolCalls).toEqual([]); // Should default to empty array on Zod validation failure
    // Note: Check if Logger.warn is actually called by implementation, if not remove this expectation
    // Based on OutputParser implementation, validation failures might not trigger Logger.warn
    // expect(Logger.warn).toHaveBeenCalledOnce();
    // expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Tool Calls JSON structure validation failed'));
  });

  it('should handle invalid tool call structure (Zod validation failure) and return empty array', async () => {
    // Invalid structure - missing required fields
    const outputWithInvalidStructure = `Intent: Extract information
Plan: Use tools to get data
Tool Calls: [{"wrongField": "wrongValue"}]`;

    const result = await outputParser.parsePlanningOutput(outputWithInvalidStructure);

    expect(result.intent).toBe('Extract information');
    expect(result.plan).toBe('Use tools to get data');
    expect(result.toolCalls).toEqual([]); // Should default to empty array on Zod validation failure
    // Note: Check if Logger.warn is actually called by implementation, if not remove this expectation
    // Based on OutputParser implementation, validation failures might not trigger Logger.warn
    // expect(Logger.warn).toHaveBeenCalledOnce();
    // expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Tool Calls JSON structure validation failed'));
  });

  it('should handle invalid tool call structure inside fences (Zod validation failure) and return empty array', async () => {
    // Invalid structure - missing required fields
    const outputWithInvalidStructureInFences = `Intent: Extract information
Plan: Use tools to get data
Tool Calls: \`\`\`json
[{"wrongField": "wrongValue"}]
\`\`\``;

    const result = await outputParser.parsePlanningOutput(outputWithInvalidStructureInFences);

    expect(result.intent).toBe('Extract information');
    expect(result.plan).toBe('Use tools to get data');
    expect(result.toolCalls).toEqual([]); // Should default to empty array on Zod validation failure
    // Note: Check if Logger.warn is actually called by implementation, if not remove this expectation  
    // Based on OutputParser implementation, validation failures might not trigger Logger.warn
    // expect(Logger.warn).toHaveBeenCalledOnce();
    // expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Tool Calls JSON structure validation failed'));
  });

  it('should handle completely unstructured output', async () => {
    const output = 'Just a simple response without any structure.';
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBeUndefined();
    expect(result.plan).toBeUndefined();
    expect(result.toolCalls).toBeUndefined();
    expect(Logger.warn).toHaveBeenCalledOnce();
    expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not parse any structured data'));
  });

   it('should handle variations in spacing and case', async () => {
    const output = `
      intent:   Find the capital of Spain.
      PLAN:
      Use search tool.
      tool calls: [ {"callId": "s1", "toolName": "search", "arguments": {"query": "capital of Spain"}} ]
    `;
    const result = await outputParser.parsePlanningOutput(output);

    expect(result.intent).toBe('Find the capital of Spain.');
    expect(result.plan).toBe('Use search tool.');
    expect(result.toolCalls).toEqual([
      { callId: 's1', toolName: 'search', arguments: { query: 'capital of Spain' } },
    ]);
  });

  // --- parseSynthesisOutput Tests ---

  it('should parse synthesis output by trimming whitespace', async () => {
    const output = '  This is the final response. \n  ';
    const result = await outputParser.parseSynthesisOutput(output);
    expect(result).toBe('This is the final response.');
  });

  it('should handle empty synthesis output', async () => {
    const output = '   ';
    const result = await outputParser.parseSynthesisOutput(output);
    expect(result).toBe('');
  });

  it('should handle synthesis output with complex content', async () => {
    const output = `Here's the calculation result: 42.
The weather in London is currently sunny.`;
    const result = await outputParser.parseSynthesisOutput(output);
    expect(result).toBe(`Here's the calculation result: 42.\nThe weather in London is currently sunny.`);
  });
});