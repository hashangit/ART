# How to Create a Custom Provider Adapter for ART Framework

This guide explains how to create a custom provider adapter for the ART framework to integrate with any LLM inference provider. Provider adapters are the bridge between the ART framework and specific LLM APIs, handling the translation of ART's standardized prompt format to provider-specific formats and vice versa.

## Overview

The ART framework uses a standardized interface for all LLM providers through the `ProviderAdapter` interface. Each adapter is responsible for:

1. Translating ART's `ArtStandardPrompt` format to the provider's specific API format
2. Making API calls to the LLM provider
3. Converting provider responses into ART's `StreamEvent` format
4. Handling both streaming and non-streaming responses
5. Managing provider-specific configurations and authentication

## Prerequisites

Before creating a custom provider adapter, you should:

1. Understand the LLM provider's API documentation
2. Have access to the provider's API (API key, endpoint, etc.)
3. Be familiar with TypeScript/JavaScript
4. Understand the ART framework's core concepts

## Core Interface: ProviderAdapter

All provider adapters must implement the `ProviderAdapter` interface, which extends the `ReasoningEngine` interface:

```typescript
export interface ProviderAdapter extends ReasoningEngine {
  /** The unique identifier name for this provider (e.g., 'openai', 'anthropic'). */
  readonly providerName: string;

  /** Optional: Method for graceful shutdown */
  shutdown?(): Promise<void>;
}

export interface ReasoningEngine {
  call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>;
}
```

The key method is `call`, which takes an `ArtStandardPrompt` and `CallOptions` and returns an `AsyncIterable<StreamEvent>`.

## ART Framework Requirements

### 1. StreamEvent Format

Your adapter must yield `StreamEvent` objects in the following format:

```typescript
interface StreamEvent {
  type: 'TOKEN' | 'METADATA' | 'ERROR' | 'END';
  data: any;
  tokenType?: 'LLM_THINKING' | 'LLM_RESPONSE' | 'AGENT_THOUGHT_LLM_THINKING' | 'AGENT_THOUGHT_LLM_RESPONSE' | 'FINAL_SYNTHESIS_LLM_THINKING' | 'FINAL_SYNTHESIS_LLM_RESPONSE';
  threadId: string;
  traceId: string;
  sessionId?: string;
}
```

### 2. ArtStandardPrompt Format

The ART framework uses a standardized prompt format that your adapter must translate:

```typescript
type ArtStandardMessageRole = 'system' | 'user' | 'assistant' | 'tool_request' | 'tool_result' | 'tool';

interface ArtStandardMessage {
  role: ArtStandardMessageRole;
  content: string | object | null;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

type ArtStandardPrompt = ArtStandardMessage[];
```

### 3. LLMMetadata Format

For METADATA events, use the following structure:

```typescript
interface LLMMetadata {
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  timeToFirstTokenMs?: number;
  totalGenerationTimeMs?: number;
  stopReason?: string;
  providerRawUsage?: any;
  traceId?: string;
}
```

## Step-by-Step Implementation Guide

### 1. Create the Adapter Class

Start by creating a class that implements the `ProviderAdapter` interface:

```typescript
import { ProviderAdapter } from '@/core/interfaces';
import {
  ArtStandardPrompt,
  CallOptions,
  StreamEvent,
  LLMMetadata,
} from '@/types';
import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors';

export interface YourProviderAdapterOptions {
  apiKey: string;
  model?: string;
  // Add other provider-specific configuration options
}

export class YourProviderAdapter implements ProviderAdapter {
  readonly providerName = 'your-provider-name';
  private apiKey: string;
  private defaultModel: string;

  constructor(options: YourProviderAdapterOptions) {
    if (!options.apiKey) {
      throw new Error('YourProviderAdapter requires an apiKey in options.');
    }
    this.apiKey = options.apiKey;
    this.defaultModel = options.model || 'default-model-id';
    Logger.debug(`YourProviderAdapter initialized with model: ${this.defaultModel}`);
  }

  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    // Implementation details covered in the next sections
  }

  // Optional shutdown method
  async shutdown(): Promise<void> {
    Logger.debug(`YourProviderAdapter shutdown called.`);
    // Clean up any resources if needed
  }
}
```

### 2. Implement the `call` Method

The `call` method is the core of your adapter. It needs to:

1. Translate the ART prompt to your provider's format
2. Make the API call
3. Handle both streaming and non-streaming responses
4. Convert responses to ART's `StreamEvent` format

```typescript
async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
  const {
    threadId,
    traceId = `your-provider-trace-${Date.now()}`,
    sessionId,
    stream,
    callContext,
    model: modelOverride
  } = options;
  
  const modelToUse = modelOverride || this.defaultModel;

  // Translate ART prompt to provider format
  let providerMessages: YourProviderMessage[];
  try {
    providerMessages = this.translateToProviderFormat(prompt);
  } catch (error: any) {
    Logger.error(`Error translating ArtStandardPrompt to provider format: ${error.message}`, { error, threadId, traceId });
    const generator = async function*(): AsyncIterable<StreamEvent> {
      const err = error instanceof ARTError ? error : new ARTError(
        `Prompt translation failed: ${error.message}`,
        ErrorCode.PROMPT_TRANSLATION_FAILED,
        error
      );
      yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
      yield { type: 'END', data: null, threadId, traceId, sessionId };
    }
    return generator();
  }

  // Prepare API request with provider-specific parameters
  const payload = {
    model: modelToUse,
    messages: providerMessages,
    // Map ART options to provider-specific parameters
    temperature: options.temperature,
    max_tokens: options.max_tokens,
    // ... other provider-specific parameters
    stream: !!stream,
  };

  // Remove undefined parameters
  Object.keys(payload).forEach(key =>
    payload[key as keyof typeof payload] === undefined &&
    delete payload[key as keyof typeof payload]
  );

  Logger.debug(`Calling YourProvider API with model ${modelToUse}, stream: ${!!stream}`, { threadId, traceId });

  // Handle streaming vs non-streaming
  if (stream) {
    return this.handleStreamingResponse(payload, options);
  } else {
    return this.handleNonStreamingResponse(payload, options);
  }
}
```

### 3. Implement Prompt Translation

Create a method to translate ART's `ArtStandardPrompt` to your provider's message format. Follow these ART-specific requirements:

```typescript
private translateToProviderFormat(artPrompt: ArtStandardPrompt): YourProviderMessage[] {
  // Handle system prompts - merge with first user message or create separate message
  let systemPromptContent: string | null = null;
  const processedMessages: ArtStandardMessage[] = [];

  // Extract system prompt
  for (const message of artPrompt) {
    if (message.role === 'system') {
      if (typeof message.content === 'string') {
        systemPromptContent = message.content;
      } else {
        Logger.warn(`YourProviderAdapter: Ignoring non-string system prompt content.`, { content: message.content });
      }
      continue; // Don't add system messages to processedMessages
    }
    processedMessages.push(message);
  }

  // Translate messages to provider format
  const providerMessages: YourProviderMessage[] = [];
  
  for (const message of processedMessages) {
    switch (message.role) {
      case 'user':
        // Prepend system prompt if this is the first user message
        let userContent = '';
        if (systemPromptContent) {
          userContent += systemPromptContent + "\n\n";
          systemPromptContent = null; // Clear after merging
        }
        if (typeof message.content === 'string') {
          userContent += message.content;
        } else {
          Logger.warn(`YourProviderAdapter: Stringifying non-string user content.`, { content: message.content });
          userContent += JSON.stringify(message.content);
        }
        providerMessages.push({ role: 'user', content: userContent });
        break;

      case 'assistant':
        const assistantMsg: YourProviderMessage = {
          role: 'assistant',
          content: typeof message.content === 'string' ? message.content : null,
        };
        
        // Handle tool calls if your provider supports them
        if (message.tool_calls && message.tool_calls.length > 0) {
          assistantMsg.tool_calls = message.tool_calls.map(tc => {
            if (tc.type !== 'function' || !tc.function?.name || typeof tc.function?.arguments !== 'string') {
              throw new ARTError(
                `YourProviderAdapter: Invalid tool_call structure in assistant message. ID: ${tc.id}`,
                ErrorCode.PROMPT_TRANSLATION_FAILED
              );
            }
            return {
              id: tc.id,
              type: tc.type,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments, // Should already be stringified JSON
              }
            };
          });
        }
        
        // If assistant message has neither content nor tool calls, add empty content
        if (!assistantMsg.content && (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0)) {
          assistantMsg.content = "";
        }
        
        providerMessages.push(assistantMsg);
        break;

      case 'tool_result':
        if (!message.tool_call_id) {
          throw new ARTError(
            `YourProviderAdapter: 'tool_result' message missing required 'tool_call_id'.`,
            ErrorCode.PROMPT_TRANSLATION_FAILED
          );
        }
        providerMessages.push({
          role: 'tool', // Most providers use 'tool' role for tool results
          tool_call_id: message.tool_call_id,
          content: String(message.content),
        });
        break;

      case 'tool_request':
        // This role is typically handled by 'tool_calls' in the preceding 'assistant' message
        Logger.debug(`YourProviderAdapter: Skipping 'tool_request' role message as it's handled by assistant's tool_calls.`);
        continue;

      default:
        Logger.warn(`YourProviderAdapter: Skipping message with unhandled role: ${message.role}`);
        continue;
    }
  }

  // Handle case where system prompt was provided but no user message followed
  if (systemPromptContent) {
    Logger.warn("YourProviderAdapter: System prompt provided but no user message found to merge it into. Adding as a separate initial user message.");
    providerMessages.unshift({ role: 'user', content: systemPromptContent });
  }

  return providerMessages;
}
```

### 4. Handle Non-Streaming Responses

Implement the method to handle non-streaming API responses:

```typescript
private async handleNonStreamingResponse(
  payload: any,
  options: CallOptions
): Promise<AsyncIterable<StreamEvent>> {
  const { threadId, traceId, sessionId, callContext } = options;
  
  const generator = async function*(): AsyncIterable<StreamEvent> {
    const startTime = Date.now();
    try {
      const response = await this.makeApiCall(payload);

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new ARTError(
          `YourProvider API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
          ErrorCode.LLM_PROVIDER_ERROR,
          new Error(errorBody)
        );
        yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
        return;
      }

      const data = await response.json();
      const firstChoice = this.extractFirstChoice(data);

      if (!firstChoice) {
        const err = new ARTError(
          'Invalid response structure from YourProvider API: No valid choice found.',
          ErrorCode.LLM_PROVIDER_ERROR,
          new Error(JSON.stringify(data))
        );
        yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
        return;
      }

      const responseMessage = this.extractResponseMessage(firstChoice);
      const finishReason = this.extractFinishReason(firstChoice);
      const usageMetadata = this.extractUsageMetadata(data);
      
      const totalGenerationTimeMs = Date.now() - startTime;

      // Handle tool calls and content
      if (this.hasToolCalls(responseMessage)) {
        const toolData = this.extractToolCalls(responseMessage).map(tc => ({
          type: 'tool_use', // ART specific marker
          id: tc.id,
          name: tc.name,
          input: JSON.parse(tc.arguments || '{}'),
        }));
        
        if (responseMessage.content) {
          const tokenType = callContext === 'AGENT_THOUGHT' ?
            'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
          yield {
            type: 'TOKEN',
            data: [{type: 'text', text: responseMessage.content.trim()}, ...toolData],
            threadId,
            traceId,
            sessionId,
            tokenType
          };
        } else {
          const tokenType = callContext === 'AGENT_THOUGHT' ?
            'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
          yield {
            type: 'TOKEN',
            data: toolData,
            threadId,
            traceId,
            sessionId,
            tokenType
          };
        }
      } else if (responseMessage.content) {
        const tokenType = callContext === 'AGENT_THOUGHT' ?
          'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
        yield {
          type: 'TOKEN',
          data: responseMessage.content.trim(),
          threadId,
          traceId,
          sessionId,
          tokenType
        };
      }

      // Yield METADATA
      const metadata: LLMMetadata = {
        inputTokens: usageMetadata?.prompt_tokens,
        outputTokens: usageMetadata?.completion_tokens,
        stopReason: finishReason,
        providerRawUsage: {
          usage: usageMetadata,
          finish_reason: finishReason,
          // Include any provider-specific usage data
          ...this.extractProviderSpecificUsage(data)
        },
        totalGenerationTimeMs: totalGenerationTimeMs,
        traceId: traceId,
      };
      yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };

      // Yield END
      yield { type: 'END', data: null, threadId, traceId, sessionId };

    } catch (error: any) {
      Logger.error(`Error during YourProvider API call: ${error.message}`, { error, threadId, traceId });
      const artError = error instanceof ARTError ? error : new ARTError(
        error.message,
        ErrorCode.LLM_PROVIDER_ERROR,
        error
      );
      yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
      yield { type: 'END', data: null, threadId, traceId, sessionId };
    }
  }.bind(this);

  return generator();
}
```

### 5. Handle Streaming Responses

If your provider supports streaming, implement the streaming handler:

```typescript
private async handleStreamingResponse(
  payload: any,
  options: CallOptions
): Promise<AsyncIterable<StreamEvent>> {
  const { threadId, traceId, sessionId, callContext } = options;
  
  const generator = async function*(): AsyncIterable<StreamEvent> {
    const startTime = Date.now();
    let timeToFirstTokenMs: number | undefined;
    let accumulatedOutputTokens = 0;
    let finalStopReason: string | undefined;
    let finalUsageMetadata: any = undefined;
    let accumulatedToolCalls: any[] = [];
    
    try {
      const response = await this.makeStreamingApiCall(payload);

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new ARTError(
          `YourProvider API request failed: ${response.status} ${response.statusText} - ${errorBody}`,
          ErrorCode.LLM_PROVIDER_ERROR,
          new Error(errorBody)
        );
        yield { type: 'ERROR', data: err, threadId, traceId, sessionId };
        yield { type: 'END', data: null, threadId, traceId, sessionId };
        return;
      }

      if (!response.body) {
        throw new ARTError(
          'YourProvider API response has no body for streaming request.',
          ErrorCode.LLM_PROVIDER_ERROR
        );
      }

      const streamProcessor = this.createStreamProcessor();
      
      for await (const event of streamProcessor.process(response.body)) {
        switch (event.type) {
          case 'CONTENT_DELTA':
            const now = Date.now();
            if (timeToFirstTokenMs === undefined) {
              timeToFirstTokenMs = now - startTime;
            }
            accumulatedOutputTokens++;
            const tokenType = callContext === 'AGENT_THOUGHT' ?
              'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
            yield {
              type: 'TOKEN',
              data: event.content,
              threadId,
              traceId,
              sessionId,
              tokenType
            };
            break;

          case 'TOOL_CALL_DELTA':
            // Accumulate tool call deltas
            this.accumulateToolCallDelta(accumulatedToolCalls, event.toolCallDelta);
            break;

          case 'FINISH_REASON':
            finalStopReason = event.reason;
            break;

          case 'USAGE':
            finalUsageMetadata = event.usage;
            break;

          case 'ERROR':
            Logger.warn(`Stream error from YourProvider: ${event.message}`, {
              error: event.error,
              threadId,
              traceId
            });
            break;
        }
      }

      // If stop reason is tool_calls, yield the accumulated tool calls
      if (finalStopReason === 'tool_calls' && accumulatedToolCalls.length > 0) {
        const tokenType = callContext === 'AGENT_THOUGHT' ?
          'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
        const toolData = accumulatedToolCalls.map(tc => ({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments ? JSON.parse(tc.arguments) : {},
        }));
        yield {
          type: 'TOKEN',
          data: toolData,
          threadId,
          traceId,
          sessionId,
          tokenType
        };
      }

      // Yield final METADATA
      const totalGenerationTimeMs = Date.now() - startTime;
      const metadata: LLMMetadata = {
        stopReason: finalStopReason,
        inputTokens: finalUsageMetadata?.prompt_tokens,
        outputTokens: finalUsageMetadata?.completion_tokens ?? accumulatedOutputTokens,
        timeToFirstTokenMs: timeToFirstTokenMs,
        totalGenerationTimeMs: totalGenerationTimeMs,
        providerRawUsage: {
          usage: finalUsageMetadata,
          finish_reason: finalStopReason,
          // Include any provider-specific usage data
          ...this.extractProviderSpecificUsageFromStream(finalUsageMetadata)
        },
        traceId: traceId,
      };
      yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };

      // Yield END
      yield { type: 'END', data: null, threadId, traceId, sessionId };

    } catch (error: any) {
      Logger.error(`Error during YourProvider streaming API call: ${error.message}`, {
        error,
        threadId,
        traceId
      });
      const artError = error instanceof ARTError ? error : new ARTError(
        error.message,
        ErrorCode.LLM_PROVIDER_ERROR,
        error
      );
      yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
      yield { type: 'END', data: null, threadId, traceId, sessionId };
    }
  }.bind(this);

  return generator();
}
```

### 6. Implement Provider-Specific Methods

Create helper methods for provider-specific operations:

```typescript
private async makeApiCall(payload: any): Promise<Response> {
  // Implement your provider's API call mechanism
  // This could use fetch, an SDK, or any other method
  return fetch('https://api.yourprovider.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      // Add other required headers
    },
    body: JSON.stringify(payload),
  });
}

private async makeStreamingApiCall(payload: any): Promise<Response> {
  // Similar to makeApiCall but with streaming-specific headers
  return fetch('https://api.yourprovider.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'text/event-stream',
      // Add other required headers
    },
    body: JSON.stringify({ ...payload, stream: true }),
  });
}

// Add provider-specific extraction methods
private extractFirstChoice(response: any): any {
  // Implement based on your provider's response structure
  return response.choices?.[0];
}

private extractResponseMessage(choice: any): any {
  // Implement based on your provider's response structure
  return choice.message;
}

private extractFinishReason(choice: any): string | undefined {
  // Implement based on your provider's response structure
  return choice.finish_reason;
}

private extractUsageMetadata(response: any): any {
  // Implement based on your provider's response structure
  return response.usage;
}

private extractProviderSpecificUsage(response: any): any {
  // Extract any provider-specific usage data
  return {};
}

private hasToolCalls(message: any): boolean {
  // Implement based on your provider's tool call structure
  return message.tool_calls && message.tool_calls.length > 0;
}

private extractToolCalls(message: any): any[] {
  // Implement based on your provider's tool call structure
  return message.tool_calls || [];
}
```

### 7. Register Your Adapter

To use your custom adapter, you need to register it with the ART framework:

```typescript
import { createArtInstance } from 'art-framework';
import { YourProviderAdapter } from './your-provider-adapter';

const art = await createArtInstance({
  storage: { type: 'memory' },
  providers: {
    availableProviders: [
      {
        name: 'your-provider',
        adapter: YourProviderAdapter,
        // baseOptions are optional and rarely needed
      }
    ]
  },
  // ... other configuration
});
```

Then you can use it in your thread configuration:

```typescript
const threadConfig = {
  providerConfig: {
    providerName: 'your-provider',
    modelId: 'your-model-id',
    adapterOptions: {
      apiKey: 'your-api-key',
      // Other provider-specific options
    }
  },
  enabledTools: [],
  historyLimit: 10
};

await art.stateManager.setThreadConfig('your-thread-id', threadConfig);
```

## ART Framework Integration Requirements

### 1. Token Type Classification

Properly classify token types based on the call context:

```typescript
// For regular response tokens
const tokenType = callContext === 'AGENT_THOUGHT' ?
  'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';

// For thinking tokens (if your provider supports them)
const thinkingTokenType = callContext === 'AGENT_THOUGHT' ?
  'AGENT_THOUGHT_LLM_THINKING' : 'FINAL_SYNTHESIS_LLM_THINKING';
```

### 2. Error Handling

Always convert provider-specific errors to ARTError:

```typescript
try {
  // API call
} catch (error: any) {
  const artError = error instanceof ARTError ? error : new ARTError(
    `YourProvider API Error: ${error.message}`,
    ErrorCode.LLM_PROVIDER_ERROR,
    error
  );
  yield { type: 'ERROR', data: artError, threadId, traceId, sessionId };
  yield { type: 'END', data: null, threadId, traceId, sessionId };
}
```

### 3. Logging

Use the ART framework's Logger for consistent logging:

```typescript
import { Logger } from '@/utils/logger';

Logger.debug('YourProviderAdapter initialized', { model: this.defaultModel });
Logger.warn('Warning message', { context });
Logger.error('Error message', { error, context });
```

### 4. Resource Management

Implement a shutdown method if your adapter needs to clean up resources:

```typescript
async shutdown(): Promise<void> {
  Logger.debug(`YourProviderAdapter shutdown called.`);
  // Clean up any persistent connections or resources
  // This is called by the ProviderManager when instances are evicted
}
```

## Best Practices

### 1. Follow ART's Message Role Mapping

Map ART's standardized roles to your provider's format:

- `system` → Typically merged with first `user` message or handled as system parameter
- `user` → Your provider's `user` role
- `assistant` → Your provider's `assistant` or `model` role
- `tool_result` → Your provider's `tool` or `function` role
- `tool_request` → Handled via `tool_calls` in `assistant` messages

### 2. Handle Consecutive Messages

Some providers require alternating user/assistant messages. Implement merging logic if needed:

```typescript
// Example: Merge consecutive messages of the same role
private mergeConsecutiveMessages(messages: YourProviderMessage[]): YourProviderMessage[] {
  // Implementation depends on your provider's requirements
  return messages;
}
```

### 3. Validate Translations

Ensure your translation logic handles edge cases:

```typescript
private validateTranslation(artPrompt: ArtStandardPrompt): void {
  // Check for required fields in tool_result messages
  for (const message of artPrompt) {
    if (message.role === 'tool_result' && !message.tool_call_id) {
      throw new ARTError(
        `YourProviderAdapter: 'tool_result' message missing required 'tool_call_id'.`,
        ErrorCode.PROMPT_TRANSLATION_FAILED
      );
    }
  }
}
```

### 4. Support Tool Translation

If your provider supports tools/functions, implement translation:

```typescript
private translateArtToolsToProvider(artTools: ToolSchema[]): YourProviderTool[] {
  return artTools.map(artTool => ({
    type: 'function', // Most providers use 'function' type
    function: {
      name: artTool.name,
      description: artTool.description,
      parameters: artTool.inputSchema, // JSON Schema
    }
  }));
}
```

## Testing Your Adapter

Create tests to verify your adapter works correctly with ART's requirements:

```typescript
// test/your-provider-adapter.test.ts
import { YourProviderAdapter } from '../src/integrations/reasoning/your-provider';
import { ArtStandardPrompt } from '@/types';

describe('YourProviderAdapter', () => {
  let adapter: YourProviderAdapter;

  beforeEach(() => {
    adapter = new YourProviderAdapter({
      apiKey: 'test-api-key',
      model: 'test-model',
    });
  });

  it('should initialize with correct provider name', () => {
    expect(adapter.providerName).toBe('your-provider-name');
  });

  it('should throw error when apiKey is missing', () => {
    expect(() => {
      new YourProviderAdapter({} as any);
    }).toThrow('YourProviderAdapter requires an apiKey in options.');
  });

  it('should translate ART prompt to provider format', () => {
    const artPrompt: ArtStandardPrompt = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    
    // Test your translation method
    // const providerMessages = (adapter as any).translateToProviderFormat(artPrompt);
    // Add assertions based on your provider's format
  });

  // Add more tests for streaming, non-streaming, error handling, etc.
});
```

## Conclusion

Creating a custom provider adapter for the ART framework requires implementing the `ProviderAdapter` interface and properly translating between ART's standardized formats and your provider's API format. The key requirements are:

1. Implement the `call` method that returns an `AsyncIterable<StreamEvent>`
2. Translate `ArtStandardPrompt` to your provider's message format
3. Handle both streaming and non-streaming responses
4. Yield `StreamEvent` objects in ART's expected format
5. Properly classify token types based on call context
6. Handle errors by converting to `ARTError`
7. Use ART's logging system for consistency

By following these guidelines and the patterns shown in this document, you can create robust provider adapters that seamlessly integrate any LLM provider with the ART framework while maintaining consistency with the framework's architecture and requirements.