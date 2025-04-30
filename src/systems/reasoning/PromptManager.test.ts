// src/systems/reasoning/PromptManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptManager } from './PromptManager';
import {
  // ArtStandardPrompt, // Removed unused import
  // ArtStandardMessage, // Removed unused import
  PromptContext,
  ToolSchema,
  ToolResult,
} from '../../types';
import { ARTError, ErrorCode } from '../../errors';
import render from 'mustache'; // Import the default export

// Mock the mustache default export (render function)
vi.mock('mustache'); // Just mock the module

describe('PromptManager (Refactored)', () => {
  let promptManager: PromptManager;
  let mockContext: PromptContext;
  let mockBlueprint: string;

  beforeEach(() => {
    promptManager = new PromptManager();
    // Reset mocks before each test
    vi.resetAllMocks();

    // Basic context for testing
    mockContext = {
      query: 'Test query',
      systemPrompt: 'You are a test AI.',
      history: [
        { role: 'user', content: 'Previous user message' },
        { role: 'assistant', content: 'Previous AI response' },
      ],
      availableTools: [
        { name: 'tool1', description: 'Does something', inputSchema: { type: 'object', properties: { arg1: { type: 'string' } } } } as ToolSchema,
      ],
      toolResults: [
        { callId: 'c1', toolName: 'tool1', status: 'success', output: { result: 'ok' } } as ToolResult,
      ],
      customData: 'some value',
    };

    // Basic blueprint targeting ArtStandardPrompt JSON structure
    mockBlueprint = `[
      { "role": "system", "content": "{{systemPrompt}}" },
      {{#history}}
      { "role": "{{role}}", "content": "{{content}}" }{{^last}},{{/last}}
      {{/history}},
      { "role": "user", "content": "{{query}} - Custom: {{customData}}" }
    ]`;
  });

  it('should call Mustache.render with the blueprint and context', async () => {
    const expectedRenderedJson = `[
      { "role": "system", "content": "You are a test AI." },
      { "role": "user", "content": "Previous user message" },
      { "role": "assistant", "content": "Previous AI response" },
      { "role": "user", "content": "Test query - Custom: some value" }
    ]`;
    (render as any).mockReturnValue(expectedRenderedJson); // Use default import, cast to any for now to bypass TS check

    await promptManager.assemblePrompt(mockBlueprint, mockContext);

    expect(render).toHaveBeenCalledTimes(1); // Use imported render
    expect(render).toHaveBeenCalledWith(mockBlueprint, mockContext); // Use imported render
  });

  it('should parse the rendered JSON string into ArtStandardPrompt', async () => {
    const renderedJson = `[{"role": "system", "content": "Test"}, {"role": "user", "content": "Hello"}]`;
    (render as any).mockReturnValue(renderedJson); // Use default import

    const result = await promptManager.assemblePrompt(mockBlueprint, mockContext);

    expect(result).toEqual([
      { role: 'system', content: 'Test' },
      { role: 'user', content: 'Hello' },
    ]);
    expect(Array.isArray(result)).toBe(true);
  });

   it('should correctly assemble a prompt with history and tools context', async () => {
    const blueprintWithTools = `[
      { "role": "system", "content": "{{systemPrompt}}" },
      {{#history}}
      { "role": "{{role}}", "content": "{{content}}" }{{^last}},{{/last}}
      {{/history}},
      { "role": "user", "content": "Query: {{query}}\\nTools: {{#availableTools}}{{name}} {{/availableTools}}" }
    ]`;
    const expectedRenderedJson = `[
      { "role": "system", "content": "You are a test AI." },
      { "role": "user", "content": "Previous user message" },
      { "role": "assistant", "content": "Previous AI response" },
      { "role": "user", "content": "Query: Test query\\nTools: tool1 " }
    ]`;
    (render as any).mockReturnValue(expectedRenderedJson); // Use default import

    const result = await promptManager.assemblePrompt(blueprintWithTools, mockContext);

    expect(render).toHaveBeenCalledWith(blueprintWithTools, mockContext); // Use imported render
    expect(result).toEqual([
      { role: 'system', content: 'You are a test AI.' },
      { role: 'user', content: 'Previous user message' },
      { role: 'assistant', content: 'Previous AI response' },
      { role: 'user', content: 'Query: Test query\nTools: tool1 ' },
    ]);
  });

   it('should correctly assemble a prompt with tool results context', async () => {
    const blueprintWithResults = `[
      { "role": "system", "content": "{{systemPrompt}}" },
      { "role": "user", "content": "{{query}}" },
      { "role": "assistant", "content": "Okay, using tools..." },
      {{#toolResults}}
      { "role": "tool_result", "tool_call_id": "{{callId}}", "name": "{{toolName}}", "content": "{{outputJson}}" }{{^last}},{{/last}}
      {{/toolResults}}
    ]`;
    // Simulate context having pre-stringified output
    const contextWithStrResults = {
        ...mockContext,
        toolResults: mockContext.toolResults?.map(r => ({...r, outputJson: JSON.stringify(r.output)}))
    };
    const expectedRenderedJson = `[
      { "role": "system", "content": "You are a test AI." },
      { "role": "user", "content": "Test query" },
      { "role": "assistant", "content": "Okay, using tools..." },
      { "role": "tool_result", "tool_call_id": "c1", "name": "tool1", "content": "{\\"result\\":\\"ok\\"}" }
    ]`;
    (render as any).mockReturnValue(expectedRenderedJson); // Use default import

    const result = await promptManager.assemblePrompt(blueprintWithResults, contextWithStrResults);

    expect(render).toHaveBeenCalledWith(blueprintWithResults, contextWithStrResults); // Use imported render
    expect(result).toEqual([
      { role: 'system', content: 'You are a test AI.' },
      { role: 'user', content: 'Test query' },
      { role: 'assistant', content: 'Okay, using tools...' },
      { role: 'tool_result', tool_call_id: 'c1', name: 'tool1', content: '{"result":"ok"}' },
    ]);
  });


  it('should throw ARTError with PROMPT_ASSEMBLY_FAILED code if render fails', async () => {
    const renderError = new Error('Mustache rendering failed');
    (render as any).mockImplementation(() => { // Use default import
      throw renderError;
    });

    await expect(promptManager.assemblePrompt(mockBlueprint, mockContext))
      .rejects.toThrow(ARTError);

    try {
      await promptManager.assemblePrompt(mockBlueprint, mockContext);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ARTError);
      expect(e.code).toBe(ErrorCode.PROMPT_ASSEMBLY_FAILED);
      expect(e.message).toContain('Failed to render prompt blueprint');
      expect(e.originalError).toBe(renderError);
    }
  });

  it('should throw ARTError with PROMPT_ASSEMBLY_FAILED code if JSON.parse fails', async () => {
    const invalidJson = `[{"role": "system", "content": "Test"}, {"role": "user"`; // Missing closing bracket
    (render as any).mockReturnValue(invalidJson); // Use default import

    await expect(promptManager.assemblePrompt(mockBlueprint, mockContext))
      .rejects.toThrow(ARTError);

    try {
      await promptManager.assemblePrompt(mockBlueprint, mockContext);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ARTError);
      expect(e.code).toBe(ErrorCode.PROMPT_ASSEMBLY_FAILED);
      expect(e.message).toContain('Failed to parse rendered blueprint');
      expect(e.originalError).toBeInstanceOf(Error); // JSON.parse throws SyntaxError
    }
  });

  it('should throw ARTError if rendered JSON is not an array', async () => {
    const notAnArrayJson = `{"role": "system", "content": "Test"}`;
    (render as any).mockReturnValue(notAnArrayJson); // Use default import

    await expect(promptManager.assemblePrompt(mockBlueprint, mockContext))
      .rejects.toThrow(ARTError);

     try {
      await promptManager.assemblePrompt(mockBlueprint, mockContext);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ARTError);
      expect(e.code).toBe(ErrorCode.PROMPT_ASSEMBLY_FAILED);
      expect(e.message).toContain('Rendered template did not produce a valid JSON array');
      expect(e.originalError).toBeInstanceOf(Error);
    }
  });

  // TODO: Add tests for more complex blueprints and context variations if needed
});