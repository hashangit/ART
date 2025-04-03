// src/systems/reasoning/PromptManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PromptManager } from './PromptManager';
import {
  ConversationMessage,
  MessageRole,
  ThreadContext,
  ToolSchema,
  ToolResult,
  ThreadConfig,
  AgentState,
} from '../../types';

describe('PromptManager', () => {
  let promptManager: PromptManager;
  let mockThreadContext: ThreadContext;
  let mockHistory: ConversationMessage[];
  let mockTools: ToolSchema[];
  let mockToolResults: ToolResult[];

  beforeEach(() => {
    promptManager = new PromptManager();
    mockThreadContext = {
      config: {
        reasoning: {},
        enabledTools: ['calculator'],
        historyLimit: 10,
        systemPrompt: 'Test System Prompt',
      } as ThreadConfig, // Cast for simplicity in test
      state: null as AgentState | null, // Cast for simplicity
    };
    mockHistory = [
      {
        messageId: 'msg1',
        threadId: 't1',
        role: MessageRole.USER,
        content: 'Hello there!',
        timestamp: Date.now() - 1000,
      },
      {
        messageId: 'msg2',
        threadId: 't1',
        role: MessageRole.AI,
        content: 'Hi! How can I help?',
        timestamp: Date.now() - 500,
      },
    ];
    mockTools = [
      {
        name: 'calculator',
        description: 'Calculates mathematical expressions.',
        inputSchema: { type: 'object', properties: { expression: { type: 'string' } } },
      },
      {
        name: 'weather',
        description: 'Gets the weather forecast.',
        inputSchema: { type: 'object', properties: { location: { type: 'string' } } },
      },
    ];
    mockToolResults = [
        {
            callId: 'call_1',
            toolName: 'calculator',
            status: 'success',
            output: 42,
            metadata: {}
        },
        {
            callId: 'call_2',
            toolName: 'weather',
            status: 'error',
            error: 'API key invalid',
            metadata: {}
        }
    ];
  });

  // --- createPlanningPrompt Tests ---

  it('should create a basic planning prompt with default system prompt', async () => {
    const query = 'What is 2+2?';
    const prompt = await promptManager.createPlanningPrompt(
      query,
      [], // No history
      undefined, // Use default system prompt
      [], // No tools
      mockThreadContext,
    );

    expect(prompt).toContain('System Prompt:\nYou are a helpful AI assistant.');
    expect(prompt).toContain('Conversation History:\nNo history yet.');
    expect(prompt).toContain(`User Query:\n${query}`);
    expect(prompt).toContain('Available Tools:\nNo tools available.');
    expect(prompt).toContain('Intent:');
    expect(prompt).toContain('Plan:');
    expect(prompt).toContain('Tool Calls:');
  });

  it('should create a planning prompt with history and tools', async () => {
    const query = 'Calculate 5*8 and tell me the weather in London.';
    const prompt = await promptManager.createPlanningPrompt(
      query,
      mockHistory,
      'Custom Planning Prompt', // Custom system prompt
      mockTools,
      mockThreadContext,
    );

    expect(prompt).toContain('System Prompt:\nCustom Planning Prompt');
    expect(prompt).toContain('Conversation History:\nUser: Hello there!\nAI: Hi! How can I help?');
    expect(prompt).toContain(`User Query:\n${query}`);
    expect(prompt).toContain('Available Tools:');
    expect(prompt).toContain('- calculator: Calculates mathematical expressions.');
    expect(prompt).toContain('"expression": { "type": "string" }');
    expect(prompt).toContain('- weather: Gets the weather forecast.');
    expect(prompt).toContain('"location": { "type": "string" }');
  });

  // --- createSynthesisPrompt Tests ---

  it('should create a basic synthesis prompt with default system prompt and no tool results', async () => {
    const query = 'Tell me a joke.';
    const intent = 'Tell a joke';
    const plan = '1. Generate a joke.\n2. Return the joke.';
    const prompt = await promptManager.createSynthesisPrompt(
      query,
      intent,
      plan,
      [], // No tool results
      mockHistory,
      undefined, // Default system prompt
      mockThreadContext,
    );

    expect(prompt).toContain('System Prompt:\nYou are a helpful AI assistant.');
    expect(prompt).toContain('Conversation History:\nUser: Hello there!\nAI: Hi! How can I help?');
    expect(prompt).toContain(`User Query:\n${query}`);
    expect(prompt).toContain(`Original Intent:\n${intent}`);
    expect(prompt).toContain(`Execution Plan:\n${plan}`);
    expect(prompt).toContain('Tool Execution Results:\nNo tools were executed.');
    expect(prompt).toContain('synthesize a final response');
  });

  it('should create a synthesis prompt with tool results (success and error)', async () => {
    const query = 'What is 10 + 32 and the weather in Paris?';
    const intent = 'Calculate sum and get weather';
    const plan = '1. Use calculator for 10+32.\n2. Use weather tool for Paris.\n3. Combine results.';
    const prompt = await promptManager.createSynthesisPrompt(
      query,
      intent,
      plan,
      mockToolResults,
      mockHistory,
      'Custom Synthesis Prompt', // Custom system prompt
      mockThreadContext,
    );

    expect(prompt).toContain('System Prompt:\nCustom Synthesis Prompt');
    expect(prompt).toContain(`User Query:\n${query}`);
    expect(prompt).toContain(`Original Intent:\n${intent}`);
    expect(prompt).toContain(`Execution Plan:\n${plan}`);
    expect(prompt).toContain('Tool Execution Results:');
    expect(prompt).toContain('- Tool: calculator (Call ID: call_1)');
    expect(prompt).toContain('Status: success');
    expect(prompt).toContain('Output: 42');
    expect(prompt).toContain('- Tool: weather (Call ID: call_2)');
    expect(prompt).toContain('Status: error');
    expect(prompt).toContain('Error: API key invalid');
    expect(prompt).toContain('synthesize a final response');
  });

   it('should handle undefined intent and plan in synthesis prompt', async () => {
    const query = 'Hi again';
    const prompt = await promptManager.createSynthesisPrompt(
      query,
      undefined, // No specific intent parsed
      undefined, // No specific plan parsed
      [],
      mockHistory,
      undefined,
      mockThreadContext,
    );

    expect(prompt).toContain(`User Query:\n${query}`);
    expect(prompt).toContain('Original Intent:\nundefined'); // Check how undefined is handled
    expect(prompt).toContain('Execution Plan:\nundefined'); // Check how undefined is handled
    expect(prompt).toContain('Tool Execution Results:\nNo tools were executed.');
  });
});