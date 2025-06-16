// src/systems/reasoning/PromptManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptManager } from './PromptManager';
import {
  // ArtStandardPrompt, // Removed unused import
  // ArtStandardMessage, // Removed unused import
  PromptContext,
  ToolSchema,
  ToolResult,
  PromptBlueprint,
} from '../../types';
import { ARTError, ErrorCode } from '../../errors';
import mustache from 'mustache';

// Mock mustache module
vi.mock('mustache', () => ({
  default: {
    render: vi.fn()
  }
}));

const mockedRender = vi.mocked(mustache.render);

describe('PromptManager (Refactored)', () => {
  let promptManager: PromptManager;
  let mockContext: PromptContext;
  let mockBlueprint: PromptBlueprint;

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
    mockBlueprint = {
      template: `[
        { "role": "system", "content": "{{systemPrompt}}" },
        {{#history}}
        { "role": "{{role}}", "content": "{{content}}" }{{^last}},{{/last}}
        {{/history}},
        { "role": "user", "content": "{{query}} - Custom: {{customData}}" }
      ]`
    };
  });

  it('should call Mustache.render with the blueprint and context', async () => {
    const expectedRenderedJson = `[
      { "role": "system", "content": "Test system" },
      { "role": "user", "content": "Test query - Custom: some value" }
    ]`;
    mockedRender.mockReturnValue(expectedRenderedJson);

    await promptManager.assemblePrompt(mockBlueprint, mockContext);

    expect(mockedRender).toHaveBeenCalledWith(mockBlueprint.template, mockContext);
  });

  it('should parse the rendered JSON string into ArtStandardPrompt', async () => {
    const renderedJson = `[{"role": "system", "content": "Test"}, {"role": "user", "content": "Hello"}]`;
    mockedRender.mockReturnValue(renderedJson);

    const result = await promptManager.assemblePrompt(mockBlueprint, mockContext);

    expect(result).toEqual([
      { role: 'system', content: 'Test' },
      { role: 'user', content: 'Hello' }
    ]);
  });

  it('should correctly assemble a prompt with history and tools context', async () => {
    const blueprintWithTools: PromptBlueprint = {
      template: `[
        { "role": "system", "content": "System prompt" },
        { "role": "user", "content": "Query: {{query}}\\nTools: {{#availableTools}}{{name}} {{/availableTools}}" }
      ]`
    };

    const expectedRenderedJson = `[
      { "role": "system", "content": "System prompt" },
      { "role": "user", "content": "Query: Test query\\nTools: tool1 " }
    ]`;
    mockedRender.mockReturnValue(expectedRenderedJson);

    const result = await promptManager.assemblePrompt(blueprintWithTools, mockContext);

    expect(mockedRender).toHaveBeenCalledWith(blueprintWithTools.template, mockContext);
    expect(result).toEqual([
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Query: Test query\nTools: tool1 ' }
    ]);
  });

  it('should correctly assemble a prompt with tool results context', async () => {
    const blueprintWithResults: PromptBlueprint = {
      template: `[
        { "role": "system", "content": "System prompt" },
        {{#toolResults}}
        { "role": "tool_result", "tool_call_id": "{{callId}}", "name": "{{toolName}}", "content": "{{result}}" },
        {{/toolResults}}
        { "role": "user", "content": "Continue" }
      ]`
    };

    const contextWithStrResults: PromptContext = {
      ...mockContext,
      toolResults: [
        { callId: 'c1', toolName: 'tool1', result: '{"result":"success"}' }
      ]
    };

    const expectedRenderedJson = `[
      { "role": "system", "content": "System prompt" },
      { "role": "tool_result", "tool_call_id": "c1", "name": "tool1", "content": "{\\"result\\":\\"success\\"}" },
      { "role": "user", "content": "Continue" }
    ]`;
    mockedRender.mockReturnValue(expectedRenderedJson);

    const result = await promptManager.assemblePrompt(blueprintWithResults, contextWithStrResults);

    expect(mockedRender).toHaveBeenCalledWith(blueprintWithResults.template, contextWithStrResults);
    expect(result).toEqual([
      { role: 'system', content: 'System prompt' },
      { role: 'tool_result', tool_call_id: 'c1', name: 'tool1', content: '{"result":"success"}' },
      { role: 'user', content: 'Continue' }
    ]);
  });

  it('should throw ARTError with PROMPT_ASSEMBLY_FAILED code if render fails', async () => {
    const renderError = new Error('Mustache rendering failed');
    mockedRender.mockImplementation(() => {
      throw renderError;
    });

    await expect(promptManager.assemblePrompt(mockBlueprint, mockContext))
      .rejects.toThrow(ARTError);

    try {
      await promptManager.assemblePrompt(mockBlueprint, mockContext);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTError);
      expect((error as ARTError).code).toBe(ErrorCode.PROMPT_ASSEMBLY_FAILED);
      expect((error as ARTError).message).toContain('Failed to render prompt template');
    }
  });

  it('should throw ARTError with PROMPT_ASSEMBLY_FAILED code if JSON.parse fails', async () => {
    const invalidJson = `[{"role": "system", "content": "Test"}, {"role": "user"`; // Missing closing brace
    mockedRender.mockReturnValue(invalidJson);

    await expect(promptManager.assemblePrompt(mockBlueprint, mockContext))
      .rejects.toThrow(ARTError);

    try {
      await promptManager.assemblePrompt(mockBlueprint, mockContext);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTError);
      expect((error as ARTError).code).toBe(ErrorCode.PROMPT_ASSEMBLY_FAILED);
      expect((error as ARTError).message).toContain('Failed to parse rendered template as JSON');
    }
  });

  it('should throw ARTError if rendered JSON is not an array', async () => {
    const notAnArrayJson = `{"role": "system", "content": "Test"}`;
    mockedRender.mockReturnValue(notAnArrayJson);

    await expect(promptManager.assemblePrompt(mockBlueprint, mockContext))
      .rejects.toThrow(ARTError);

    try {
      await promptManager.assemblePrompt(mockBlueprint, mockContext);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTError);
      expect((error as ARTError).code).toBe(ErrorCode.PROMPT_ASSEMBLY_FAILED);
      expect((error as ARTError).message).toContain('Rendered template is not an array');
    }
  });

  // TODO: Add tests for more complex blueprints and context variations if needed
});