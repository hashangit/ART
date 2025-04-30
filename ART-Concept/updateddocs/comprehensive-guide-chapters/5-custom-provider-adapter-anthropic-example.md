## 5. Scenario 3: Adding a Custom Provider Adapter (Anthropic Example)

Sometimes, you might want to connect ART to an LLM provider that isn't supported out-of-the-box, like Anthropic's Claude models, or perhaps use a proxy or a self-hosted model with a unique API. This requires creating a custom Provider Adapter.

**Goal:** Implement a functional `AnthropicAdapter` using the Anthropic Messages API.

**5.1. Necessary Imports & Explanations**

```typescript
// --- ART Provider Adapter Creation Imports ---
import {
  // The base interface for LLM provider adapters
  ProviderAdapter,
  // The core interface for making LLM calls (ProviderAdapter extends this) - Now returns AsyncIterable<StreamEvent>
  ReasoningEngine,
  // Type for formatted prompts (might be string or provider-specific object)
  FormattedPrompt,
  // Type for options passed to the LLM call (model params, streaming flags, context, etc.)
  CallOptions,
  // Type for conversation messages, needed for formatting prompts
  ConversationMessage,
  // Enum for message roles
  MessageRole,
  // Types for streaming output
  StreamEvent,
  LLMMetadata
  // ObservationManager/Type are typically not used directly within adapters
} from 'art-framework';

// --- Potentially types from Anthropic SDK if used, or define manually ---
// Example manual types for Anthropic Messages API
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}
interface AnthropicRequestBody {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  stop_sequences?: string[];
  // ... other Anthropic params
}
interface AnthropicResponse {
  content: { type: string, text: string }[];
  // ... other response fields
}
```

**Explanation of Provider Adapter Imports:**

*   **`ProviderAdapter`**
    The blueprint for creating a translator between ART's general way of thinking about AI models and the specific way a particular AI provider's API works (like Anthropic).
    *   **Developer Notes:** The interface your custom LLM adapter class must implement. It extends `ReasoningEngine`, meaning it must primarily implement the `call` method (which now returns `Promise<AsyncIterable<StreamEvent>>`). It also requires a `readonly providerName: string` property to identify the adapter (e.g., 'anthropic').
    
    *   **`ReasoningEngine`**
    Defines the basic capability of making a call to an AI model with a prompt. `ProviderAdapter` builds upon this.
    *   **Developer Notes:** The base interface defining the core `async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>` method signature (updated for streaming). Your `ProviderAdapter` implementation provides the concrete logic for this method, typically returning an async generator function.

*   **`FormattedPrompt`**
    Represents the instructions prepared for the AI model, which might be a simple string or a more complex structure depending on the AI provider.
    *   **Developer Notes:** A type alias. Your adapter needs to know how to handle the format provided by the `PromptManager` (which should ideally format it suitably, e.g., as `ConversationMessage[]`) and convert it to the specific format the target API requires (e.g., `AnthropicMessage[]`).

*   **`CallOptions`**
    Additional settings and information passed along when making the AI call, like which specific model version to use (e.g., 'claude-3-opus-20240229'), creativity settings (temperature), max response length (`maxTokens`), stop sequences, and importantly, whether to stream the response (`stream: true`) and the context of the call (`callContext`).
    *   **Developer Notes:** Interface for the options object passed to `ReasoningEngine.call`. Includes properties like `threadId`, `traceId`, `sessionId`, `model` (optional override), `temperature`, `maxTokens`, `stopSequences`, `systemPrompt` (important for Anthropic), and crucially `stream?: boolean` and `callContext?: string`. Your adapter's `call` method must check `stream` and map relevant options to the provider API.

*   **`ConversationMessage`, `MessageRole`**
    Needed to correctly interpret the `FormattedPrompt` if it's an array of messages and map the roles (`USER`, `ASSISTANT`) to the provider's expected roles (`user`, `assistant`).
    *   **Developer Notes:** Used within the adapter's `call` method during the prompt formatting step before sending the request to the Anthropic API. System messages might need special handling (passed via the `system` parameter in Anthropic's API).

*   **`StreamEvent`, `LLMMetadata`**
    These are the types your adapter's `call` method will yield via its `AsyncIterable` return value when streaming is enabled.
    *   **Developer Notes:** Your adapter needs to construct `StreamEvent` objects with the correct `type`, `data`, `tokenType`, and IDs. For `METADATA` events, the `data` should conform to the `LLMMetadata` interface.

**5.2. Implementing `AnthropicAdapter` (with Streaming)**

```typescript
// src/adapters/AnthropicAdapter.ts

import {
  ProviderAdapter, FormattedPrompt, CallOptions, ConversationMessage, MessageRole,
  ObservationType, ObservationManager // Assuming ObservationManager is injected
} from 'art-framework';

// Example types matching Anthropic Messages API structure
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}
interface AnthropicRequestBody {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  stop_sequences?: string[];
}
interface AnthropicResponse {
  content: { type: string, text: string }[];
  // ... other fields like usage, stop_reason
}

interface AnthropicAdapterOptions {
  apiKey: string;
  model?: string; // e.g., 'claude-3-opus-20240229'
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  // Add other necessary options like API version header
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly providerName = 'anthropic';
  private options: AnthropicAdapterOptions;
  // ObservationManager is typically not injected into adapters

  constructor(options: AnthropicAdapterOptions) {
    if (!options.apiKey) {
      throw new Error(`Anthropic adapter requires an apiKey.`);
    }
    this.options = options;
    // No ObservationManager injection needed here
    this.options.defaultMaxTokens = options.defaultMaxTokens ?? 1024; // Set a reasonable default
    this.options.defaultTemperature = options.defaultTemperature ?? 0.7;
  }

  // Helper to format ART messages to Anthropic format
  private formatMessages(prompt: FormattedPrompt): { messages: AnthropicMessage[], system?: string } {
    if (!Array.isArray(prompt)) {
      // Handle simple string prompts if necessary, though chat format is preferred
      return { messages: [{ role: 'user', content: String(prompt) }] };
    }

    const history = prompt as ConversationMessage[];
    let systemPrompt: string | undefined = undefined;
    const anthropicMessages: AnthropicMessage[] = [];

    // Extract system prompt and filter messages
    // Anthropic API expects alternating user/assistant roles
    let lastRole: MessageRole | null = null;
    for (const message of history) {
      if (message.role === MessageRole.SYSTEM) {
        systemPrompt = message.content; // Use the last system message
        continue;
      }
      if (message.role === MessageRole.USER) {
         if (lastRole === MessageRole.USER) {
             // Handle consecutive user messages if needed (e.g., merge or error)
             console.warn("AnthropicAdapter: Consecutive user messages detected, merging content.");
             const lastMsg = anthropicMessages.pop();
             anthropicMessages.push({ role: 'user', content: `${lastMsg?.content ?? ''}\n${message.content}` });
         } else {
            anthropicMessages.push({ role: 'user', content: message.content });
            lastRole = MessageRole.USER;
         }
      } else if (message.role === MessageRole.ASSISTANT) {
         if (lastRole === MessageRole.ASSISTANT) {
             // Handle consecutive assistant messages if needed
             console.warn("AnthropicAdapter: Consecutive assistant messages detected, merging content.");
             const lastMsg = anthropicMessages.pop();
             anthropicMessages.push({ role: 'assistant', content: `${lastMsg?.content ?? ''}\n${message.content}` });
         } else {
            anthropicMessages.push({ role: 'assistant', content: message.content });
            lastRole = MessageRole.ASSISTANT;
         }
      }
      // Ignore TOOL messages for Anthropic's main message list for now
    }

     // Ensure the conversation starts with a user message if possible
     if (anthropicMessages.length > 0 && anthropicMessages[0].role === 'assistant') {
         console.warn("AnthropicAdapter: Conversation starts with assistant message, prepending empty user message.");
         anthropicMessages.unshift({ role: 'user', content: "(Previous turn)" });
     }


    return { messages: anthropicMessages, system: systemPrompt };
  }

  async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const { threadId, traceId = `anthropic-trace-${Date.now()}`, sessionId, stream, callContext } = options;

    // AgentCore handles LLM_REQUEST observation before calling this method.

    const { messages, system } = this.formatMessages(prompt);
    const modelToUse = options.model || this.options.model || 'claude-3-5-sonnet-20240620'; // Use latest Sonnet
    const maxTokens = options.maxTokens ?? this.options.defaultMaxTokens!;
    const temperature = options.temperature ?? this.options.defaultTemperature!;

    const requestBody: any = { // Use 'any' for flexibility with stream param
      model: modelToUse,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    };

    if (system) {
      requestBody.system = system;
    }
    if (options.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }
    if (stream) {
        requestBody.stream = true; // Add stream parameter if requested
    }

    const apiUrl = 'https://api.anthropic.com/v1/messages';

    // Use an async generator function to handle yielding events
    const generator = async function*(): AsyncIterable<StreamEvent> {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.options.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'messages-2023-12-15', // May be needed for some features/models
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Anthropic API Error (${response.status}): ${errorBody}`);
                yield { type: 'ERROR', data: new Error(`Anthropic API Error (${response.status}): ${errorBody}`), threadId, traceId, sessionId };
                return; // Stop generation on error
            }

            // --- Handle Streaming Response ---
            if (stream && response.body) {
                const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
                let buffer = '';
                let currentMessageType: string | null = null;
                let messageStopReason: string | null = null;
                let usageData: any = null;

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += value;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            currentMessageType = line.substring(7).trim();
                        } else if (line.startsWith('data: ')) {
                            const dataContent = line.substring(6).trim();
                            try {
                                const jsonData = JSON.parse(dataContent);

                                if (jsonData.type === 'content_block_delta' && jsonData.delta?.type === 'text_delta') {
                                    const textDelta = jsonData.delta.text;
                                    // Determine tokenType based on callContext (Anthropic doesn't mark thinking tokens in stream)
                                    const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';
                                    yield { type: 'TOKEN', data: textDelta, threadId, traceId, sessionId, tokenType };
                                } else if (jsonData.type === 'message_start') {
                                    usageData = jsonData.message?.usage; // Capture initial usage if available
                                } else if (jsonData.type === 'message_delta') {
                                    usageData = { ...(usageData ?? {}), ...jsonData.usage }; // Update usage
                                    messageStopReason = jsonData.delta?.stop_reason ?? messageStopReason;
                                } else if (jsonData.type === 'message_stop') {
                                    // Stream finished signal from Anthropic
                                    break; // Exit inner loop
                                }
                                // Handle other event types like content_block_start/stop if needed

                            } catch (parseError) {
                                console.warn(`Failed to parse Anthropic stream chunk: ${dataContent}`, parseError);
                                // yield { type: 'ERROR', data: new Error(`Stream parse error: ${parseError.message}`), threadId, traceId, sessionId };
                            }
                        }
                    }
                }
                // Yield final metadata after stream
                if (usageData || messageStopReason) {
                    const metadata: LLMMetadata = {
                        inputTokens: usageData?.input_tokens,
                        outputTokens: usageData?.output_tokens,
                        stopReason: messageStopReason,
                        providerRawUsage: usageData,
                        traceId: traceId,
                    };
                    yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
                }

            // --- Handle Non-Streaming Response ---
            } else {
                const responseData = await response.json();
                const responseText = responseData.content
                    ?.filter((block: any) => block.type === 'text')
                    ?.map((block: any) => block.text)
                    ?.join('') ?? '';

                // Yield TOKEN
                yield { type: 'TOKEN', data: responseText, threadId, traceId, sessionId, tokenType: 'LLM_RESPONSE' };
                // Yield METADATA
                const usage = responseData.usage;
                if (usage) {
                    const metadata: LLMMetadata = {
                        inputTokens: usage.input_tokens,
                        outputTokens: usage.output_tokens,
                        stopReason: responseData.stop_reason,
                        providerRawUsage: usage,
                        traceId: traceId,
                    };
                    yield { type: 'METADATA', data: metadata, threadId, traceId, sessionId };
                }
            }

            // Yield END signal
            yield { type: 'END', data: null, threadId, traceId, sessionId };

        } catch (error: any) {
            console.error(`${this.providerName} adapter error in generator:`, error);
            yield { type: 'ERROR', data: error instanceof Error ? error : new Error(String(error)), threadId, traceId, sessionId };
            // Ensure END is yielded even after an error during generation/processing
            yield { type: 'END', data: null, threadId, traceId, sessionId };
        }
    }.bind(this); // Bind the generator function to the class instance to access `this.options`

    return generator(); // Return the async generator
  }
}
```

**Explanation:**

1.  **Implement `ProviderAdapter`:** The class adheres to the contract.
2.  **`providerName`:** Set to 'anthropic'.
3.  **Constructor:** Takes API key and other options. Includes optional `ObservationManager` for logging.
4.  **`formatMessages` Helper:** Converts the `FormattedPrompt` (expected to be `ConversationMessage[]`) into the `AnthropicMessage[]` format, handling role mapping and extracting the system prompt. Includes basic handling for consecutive messages of the same role.
5.  **`call` Method:**
    *   Logs the request using `ObservationManager`.
    *   Calls `formatMessages`.
    *   Determines model, max tokens, temperature from `options` or defaults.
    *   Constructs the `requestBody` for the Anthropic Messages API.
    *   Uses `fetch` to make the POST request to the Anthropic API endpoint.
    *   Includes necessary headers (`x-api-key`, `anthropic-version`).
    *   Handles potential API errors.
    *   Parses the JSON response and extracts the text content.
    *   Logs the response using `ObservationManager`.
    *   Returns the extracted text.

**5.3. Integrating the `AnthropicAdapter`**

As noted before, the default `AgentFactory` doesn't directly support custom provider classes. You would likely need to:

1.  **Manually Instantiate:** Create instances of `AnthropicAdapter`, `StorageAdapter`, Repositories, Managers, Systems, and your chosen `IAgentCore` implementation, injecting dependencies manually.
2.  **Extend/Modify `AgentFactory`:** If you control the framework code, modify the factory to recognize a custom provider option (e.g., `providerInstance` or `providerClass` in the config) and use it instead of the built-in ones.

**Example Manual Instantiation Snippet (Conceptual):**

```typescript
// --- Manual Instantiation Example ---
import { AnthropicAdapter } from './adapters/AnthropicAdapter';
import { IndexedDBStorageAdapter } from 'art-framework';
import { ConversationRepository, StateRepository, ObservationRepository } from 'art-framework'; // Assuming concrete repo exports
import { ConversationManagerImpl, StateManagerImpl, ObservationManagerImpl } from 'art-framework'; // Assuming concrete manager exports
import { ToolRegistryImpl, ToolSystemImpl } from 'art-framework'; // Assuming concrete system exports
import { PromptManagerImpl, OutputParserImpl, ReasoningEngineImpl } from 'art-framework'; // Assuming concrete reasoning exports
import { PESAgent } from 'art-framework';
import { CalculatorTool } from 'art-framework';
// ... other necessary imports

async function setupManually(): Promise<ArtInstance> {
    // 1. Init Adapters
    const storageAdapter = new IndexedDBStorageAdapter({ dbName: 'manualArtDb', objectStores: ['conversations', 'state', 'observations'] });
    await storageAdapter.init?.(); // If adapter has init

    const observationManager = new ObservationManagerImpl(/* Need repo, socket - complex setup */); // UISystem setup needed first
    const providerAdapter = new AnthropicAdapter({ apiKey: 'YOUR_ANTHROPIC_KEY' }, observationManager); // Inject logger/observer if needed

    // 2. Init Repositories
    const conversationRepository = new ConversationRepository(storageAdapter);
    const stateRepository = new StateRepository(storageAdapter);
    // const observationRepository = new ObservationRepository(storageAdapter); // Used by ObservationManager

    // 3. Init Managers (Need UI System/Sockets first - simplified here)
    // const uiSystem = new UISystemImpl(...)
    const conversationManager = new ConversationManagerImpl(conversationRepository, /* uiSystem.getConversationSocket() */);
    const stateManager = new StateManagerImpl(stateRepository);
    // observationManager initialized above

    // 4. Init Tooling
    const toolRegistry = new ToolRegistryImpl();
    await toolRegistry.registerTool(new CalculatorTool());
    const toolSystem = new ToolSystemImpl(toolRegistry, stateManager, observationManager);

    // 5. Init Reasoning Components
    const reasoningEngine = new ReasoningEngineImpl(providerAdapter); // Use the custom adapter instance
    const promptManager = new PromptManagerImpl();
    const outputParser = new OutputParserImpl();

    // 6. Init Agent Core
    const agentCore = new PESAgent({
        stateManager, conversationManager, toolRegistry, promptManager,
        reasoningEngine, outputParser, observationManager, toolSystem
    });

    // 7. Construct ArtInstance object
    const artInstance: ArtInstance = {
        process: agentCore.process.bind(agentCore),
        conversationManager,
        stateManager,
        toolRegistry,
        observationManager,
        uiSystem: /* Need actual UISystem instance */
    };

    return artInstance;
}
```
*Note: The manual setup is complex, especially around the `UISystem` and `ObservationManager` which have interdependencies. Using the factory is highly recommended if possible.*