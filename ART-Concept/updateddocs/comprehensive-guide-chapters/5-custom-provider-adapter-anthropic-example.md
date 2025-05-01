## 5. Scenario 3: Adding a Custom Provider Adapter (Anthropic Example)

Sometimes, you might want to connect ART to an LLM provider that isn't supported out-of-the-box, like Anthropic's Claude models, or perhaps use a proxy or a self-hosted model with a unique API. This requires creating a custom Provider Adapter.

**Goal:** Implement a functional `AnthropicAdapter` using the Anthropic Messages API.
**Simplified Explanation for Developers:**

Think of ART as that smart assistant again. This assistant needs to talk to different "AI brains" (Large Language Models like GPT, Gemini, Claude, Ollama, etc.) to get its work done. But each AI brain speaks a slightly different language (their API format).

1.  **Creating a Translator (Your Custom Provider Adapter):** If you want the ART assistant to be able to talk to a *new* AI brain it doesn't already know, you need to create a special "translator" for that specific AI brain. This translator is what we call a **Provider Adapter**. Your job is to write the code for this translator. ART provides a standard blueprint (the `ProviderAdapter` interface) that your translator must follow. This blueprint ensures that your translator knows how to:
    *   Receive instructions from the ART assistant in a standard format (the `ArtStandardPrompt` we talked about).
    *   Translate those standard instructions into the specific language the new AI brain understands (its API format).
    *   Send the translated request to the new AI brain.
    *   Receive the response back from the new AI brain (including handling streaming responses).
    *   Translate the AI brain's response back into a standard format that the ART assistant can understand (`AsyncIterable<StreamEvent>`).

2.  **Registering the Translator:** When you set up the ART assistant using `createArtInstance`, you provide a configuration (`ProviderManagerConfig`) that lists all the available translators (Provider Adapters) the assistant *could* use. You add your custom adapter *class* to this list, giving it a unique name (e.g., 'anthropic').

3.  **The Assistant Selects and Uses Your Translator:** When the ART assistant needs to talk to an AI brain (when the `ReasoningEngine` is called), the application logic (usually the `AgentCore`) decides *which* translator to use for that specific call (based on user choice, task requirements, etc., often stored in `ThreadConfig`). It tells the `ProviderManager` the name of the desired translator (e.g., 'anthropic') and any specific options (like API key, model). The `ProviderManager` then creates an instance of your custom adapter class (using the options provided) and gives it to the `ReasoningEngine` to make the call.

So, in simple terms:

You create a custom Provider Adapter that acts as a translator for a specific LLM API, making sure it follows ART's standard `ProviderAdapter` blueprint. Then, when you initialize ART in your application, you tell it to use your custom adapter for reasoning. You don't need to change any of ART's core files; you just provide your new component during the setup process.

This allows you to connect ART to virtually any LLM provider by writing a single translator for that provider, without altering the core framework.

**How to Create and Use Your Custom Adapter:**

1.  **Create Your Adapter File:** Create a new file in your application's project, perhaps in a folder like `llm-adapters` or `providers`. For example, `ollama-adapter.ts`.
2.  **Import Necessary ART Components:** Inside your adapter file, import the required types and interfaces from `art-framework`. Key imports include:
    *   `ProviderAdapter`: The interface your adapter class must implement.
    *   `ArtStandardPrompt`: The input format your adapter's `call` method will receive.
    *   `CallOptions`: Contains options for the LLM call (like `stream` and `callContext`).
    *   `StreamEvent`: The format for events yielded by your adapter's `call` method when streaming.
    *   `LLMMetadata`: The format for metadata events.
    *   You might also need `ObservationType` if your adapter logs specific events directly.
3.  **Implement Your Adapter Class:** Create a class that implements the `ProviderAdapter` interface. This class will contain the logic to:
    *   Receive the `ArtStandardPrompt` and `CallOptions` in its `call` method.
    *   Translate the `ArtStandardPrompt` into the specific API request format for your LLM provider (e.g., Ollama).
    *   Make the API call (using `fetch` or a library), handling both non-streaming and streaming responses.
    *   If streaming, parse the provider's stream chunks and yield `StreamEvent` objects (`TOKEN`, `METADATA`, `ERROR`, `END`), ensuring correct `tokenType` based on `callContext` and provider markers.
    *   If not streaming, make the call, parse the full response, and yield a minimal sequence of `StreamEvent`s.
    *   Extract and include `LLMMetadata` in `METADATA` events.
+    *   The constructor will receive options (like API keys, base URLs) when the `ProviderManager` instantiates the adapter at runtime, based on the `RuntimeProviderConfig`.
+4.  **Import and Register in `createArtInstance`:** In the file where you initialize ART, import your custom adapter class. In the configuration object passed to `createArtInstance`, include your adapter class in the `providers.availableProviders` array within the `ProviderManagerConfig`:

    ```typescript
    import { createArtInstance, IndexedDBStorageAdapter } from 'art-framework';
    import { ProviderManagerConfig, AgentFactoryConfig } from 'art-framework';
+    import { AnthropicAdapter } from './llm-adapters/anthropic-adapter'; // Import your custom adapter class

    const config = {
      storage: { type: 'indexedDB', dbName: 'myAppHistory' },
      providers: {
        availableProviders: [
          {
-            name: 'ollama', // Unique identifier for this provider configuration
-            adapter: OllamaAdapter, // Pass the adapter CLASS
+            name: 'anthropic', // Unique identifier for this provider configuration
+            adapter: AnthropicAdapter, // Pass the adapter CLASS
            // isLocal: true // Indicate if it's a local provider (optional, defaults to false)
          },
          // You could also register built-in adapters here, e.g., OpenAIAdapter
        ],
        // Optional global limits
        // maxParallelApiInstancesPerProvider: 5,
        // apiInstanceIdleTimeoutSeconds: 300,
      },
      // ... other config (agentCore, tools)
    };

    const art = await createArtInstance(config);
    ```

-By following these steps, you can seamlessly integrate your custom LLM provider with ART without modifying the framework's core code.
+By following these steps, you can seamlessly register your custom LLM provider adapter with ART, allowing the `ProviderManager` to instantiate and use it at runtime.

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

*   **`FormattedPrompt` (`ArtStandardPrompt`)**
    Represents the standardized, provider-agnostic instructions prepared for the AI model by the `PromptManager`. This is now an array of `ArtStandardMessage` objects.
    *   **Developer Notes:** The `FormattedPrompt` type alias now points to `ArtStandardPrompt` (`ArtStandardMessage[]`). Your adapter's `call` method receives this standard format from the `ReasoningEngine` and is responsible for translating it into the specific message structure and format required by the target LLM provider's API (e.g., mapping roles, handling content types, structuring tool calls/results).

*   **`CallOptions`**
    Additional settings and information passed along when making the AI call, like which specific model version to use (e.g., 'claude-3-opus-20240229'), creativity settings (temperature), max response length (`maxTokens`), stop sequences, and importantly, whether to stream the response (`stream: true`) and the context of the call (`callContext`).
    *   **Developer Notes:** Interface for the options object passed to `ReasoningEngine.call`. Includes properties like `threadId`, `traceId`, `sessionId`, `model` (optional override), `temperature`, `maxTokens`, `stopSequences`, `systemPrompt` (important for Anthropic), and crucially `stream?: boolean` and `callContext?: string`. Your adapter's `call` method must check `stream` and map relevant options to the provider API.

*   **`ConversationMessage`, `MessageRole`**
    Needed to correctly interpret the `ArtStandardPrompt` (which uses `MessageRole` enum values like `USER`, `ASSISTANT`, `SYSTEM`, `TOOL_REQUEST`, `TOOL_RESULT`) and map them to the provider's expected roles (`user`, `assistant`).
    *   **Developer Notes:** Used within the adapter's `call` method during the prompt translation step before sending the request to the Anthropic API. System messages need special handling (passed via the `system` parameter in Anthropic's API). Tool request/result roles also need specific translation.

*   **`StreamEvent`, `LLMMetadata`**
    These are the types your adapter's `call` method will yield via its `AsyncIterable` return value when streaming is enabled.
    *   **Developer Notes:** Your adapter needs to construct `StreamEvent` objects with the correct `type`, `data`, `tokenType`, and IDs. For `METADATA` events, the `data` should conform to the `LLMMetadata` interface.

**5.2. Implementing `AnthropicAdapter` (with Streaming)**

```typescript
// src/adapters/AnthropicAdapter.ts

import {
  ProviderAdapter, ArtStandardPrompt, ArtStandardMessage, CallOptions, ConversationMessage, MessageRole,
  StreamEvent, LLMMetadata
} from 'art-framework';

// Example types matching Anthropic Messages API structure
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text', text: string } | { type: 'tool_use', id: string, name: string, input: any } | { type: 'tool_result', tool_use_id: string, content: string }>; // Updated content type for tool use/result
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
  content: Array<{ type: 'text', text: string } | { type: 'tool_use', id: string, name: string, input: any }>; // Updated content type for tool use
  stop_reason?: string;
  usage?: { input_tokens: number, output_tokens: number };
  // ... other fields
}

interface AnthropicAdapterOptions {
  apiKey: string;
  model?: string; // e.g., 'claude-3-opus-20240229' - Can be set here as a default
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  // Add other necessary options like API version header
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly providerName = 'anthropic';
  private options: AnthropicAdapterOptions;

  // The constructor receives options when the ProviderManager instantiates the adapter.
  // These options come from RuntimeProviderConfig.adapterOptions.
  constructor(options: AnthropicAdapterOptions) {
    if (!options.apiKey) {
      // In a real scenario, the ProviderManager might handle this validation
      // or the error would propagate up from here.
      throw new Error(`Anthropic adapter requires an apiKey in adapterOptions.`);
    }
    this.options = options;
    // Set defaults if not provided in options
    this.options.defaultMaxTokens = options.defaultMaxTokens ?? 1024;
    this.options.defaultTemperature = options.defaultTemperature ?? 0.7;
  }

  // Helper to format ArtStandardPrompt messages to Anthropic format
  // Now expects ArtStandardPrompt as input
  private formatMessages(prompt: ArtStandardPrompt): { messages: AnthropicMessage[], system?: string } {
    let systemPrompt: string | undefined = undefined;
    const anthropicMessages: AnthropicMessage[] = [];

    // Anthropic API expects alternating user/assistant roles and a single system prompt
    let lastRole: 'user' | 'assistant' | null = null;
    for (const message of prompt) {
      if (message.role === 'system') {
        systemPrompt = message.content as string; // Use the last system message
        continue;
      }

      // Convert ArtStandardMessage to AnthropicMessage content structure
      let content: AnthropicMessage['content'];
      if (message.role === 'tool_request' && Array.isArray(message.content)) {
          // ArtStandardPrompt tool_request content is an array of tool calls
          content = message.content.map((toolCall: any) => ({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments) // Anthropic expects object, ArtStandardPrompt stores string
          }));
      } else if (message.role === 'tool_result') {
          // ArtStandardPrompt tool_result content is the tool output/error
           content = [{
               type: 'tool_result',
               tool_use_id: message.tool_call_id!, // tool_call_id is required for tool_result role
               content: typeof message.content === 'object' ? JSON.stringify(message.content) : String(message.content)
           }];
      }
      else {
          // Standard text content for user/assistant
          content = typeof message.content === 'object' ? JSON.stringify(message.content) : String(message.content);
      }


      if (message.role === 'user' || message.role === 'tool_result') {
         // Anthropic treats tool_result as part of the user turn
         if (lastRole === 'user') {
              // Handle consecutive user/tool_result messages by merging content
              console.warn("AnthropicAdapter: Consecutive user/tool_result messages detected, merging content.");
              const lastMsg = anthropicMessages.pop();
              // Merge content arrays or strings
              const mergedContent = Array.isArray(lastMsg?.content) && Array.isArray(content)
                ? [...lastMsg!.content, ...content]
                : `${lastMsg?.content ?? ''}\n${content}`; // Fallback to string concat
              anthropicMessages.push({ role: 'user', content: mergedContent });
          } else {
             anthropicMessages.push({ role: 'user', content: content });
             lastRole = 'user';
          }
       } else if (message.role === 'assistant' || message.role === 'tool_request') {
          // Anthropic treats tool_request as part of the assistant turn
          if (lastRole === 'assistant') {
              // Handle consecutive assistant/tool_request messages by merging content
              console.warn("AnthropicAdapter: Consecutive assistant/tool_request messages detected, merging content.");
              const lastMsg = anthropicMessages.pop();
               // Merge content arrays or strings
              const mergedContent = Array.isArray(lastMsg?.content) && Array.isArray(content)
                ? [...lastMsg!.content, ...content]
                : `${lastMsg?.content ?? ''}\n${content}`; // Fallback to string concat
              anthropicMessages.push({ role: 'assistant', content: mergedContent });
          } else {
             anthropicMessages.push({ role: 'assistant', content: content });
             lastRole = 'assistant';
          }
       }
       // Ignore other roles if necessary
     }

      // Ensure the conversation starts with a user message if possible
      if (anthropicMessages.length > 0 && anthropicMessages[0].role === 'assistant') {
          console.warn("AnthropicAdapter: Conversation starts with assistant message, prepending empty user message.");
          anthropicMessages.unshift({ role: 'user', content: "(Previous turn)" });
      }


    return { messages: anthropicMessages, system: systemPrompt };
  }

  // Updated to accept ArtStandardPrompt
  async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
    const { threadId, traceId = `anthropic-trace-${Date.now()}`, sessionId, stream, callContext, providerConfig } = options;

    // Observations like LLM_REQUEST are typically handled by the AgentCore or ReasoningEngine
    // before the adapter's call method is invoked.

    const { messages, system } = this.formatMessages(prompt); // Use updated formatMessages
    // Model should primarily come from the RuntimeProviderConfig used to instantiate this adapter,
    // accessed via providerConfig.modelId. Fallback to adapter default or hardcoded.
    const modelToUse = providerConfig.modelId || this.options.model || 'claude-3-5-sonnet-20240620'; // Prefer model from runtime config
    // API key comes from constructor options (originally from RuntimeProviderConfig.adapterOptions)
    const apiKey = this.options.apiKey;

    // Other parameters can come from adapter defaults or RuntimeProviderConfig.adapterOptions
    const maxTokens = providerConfig.adapterOptions?.max_tokens ?? this.options.defaultMaxTokens!;
    const temperature = providerConfig.adapterOptions?.temperature ?? this.options.defaultTemperature!;
    const stopSequences = providerConfig.adapterOptions?.stop_sequences ?? options.stopSequences; // Allow override? Design decision.

    const requestBody: any = { // Use 'any' for flexibility with stream param
      model: modelToUse,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    };

    if (system) {
      requestBody.system = system;
    }
    if (stopSequences) {
      requestBody.stop_sequences = stopSequences;
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
                    'x-api-key': apiKey,
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
                                    // We rely on callContext provided by the Agent Core
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
                                } else if (jsonData.type === 'content_block_start' && jsonData.content_block?.type === 'tool_use') {
                                     // Handle tool_use block start - yield as a structured event if needed by UI
                                     // For now, we might just log or ignore in the stream, the full tool_use will be in the final message
                                     console.log("AnthropicAdapter: Received tool_use_start in stream:", jsonData.content_block);
                                } else if (jsonData.type === 'content_block_delta' && jsonData.delta?.type === 'tool_use') {
                                     // Handle tool_use delta - usually arguments streaming
                                      console.log("AnthropicAdapter: Received tool_use_delta in stream:", jsonData.delta);
                                      // Could yield a specific event type for tool_use arguments streaming if needed
                                } else if (jsonData.type === 'content_block_stop' && jsonData.content_block?.type === 'tool_use') {
                                     // Handle tool_use block stop
                                      console.log("AnthropicAdapter: Received tool_use_stop in stream:", jsonData.content_block);
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
                 // Extract text content and tool_use blocks from the response
                let responseContent: Array<string | { type: 'tool_use', id: string, name: string, input: any }> = [];
                 if (responseData.content) {
                     for (const block of responseData.content) {
                         if (block.type === 'text') {
                             responseContent.push(block.text);
                         } else if (block.type === 'tool_use') {
                             responseContent.push({
                                 type: 'tool_use',
                                 id: block.id,
                                 name: block.name,
                                 input: block.input // Anthropic provides input as object
                             });
                         }
                     }
                 }


                // Determine tokenType based on callContext for non-streaming
                 const tokenType = callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE';

                // Yield TOKEN(s) - potentially yield structured content if needed
                // For simplicity, yield the raw response content array/string
                yield { type: 'TOKEN', data: responseContent.length === 1 && typeof responseContent[0] === 'string' ? responseContent[0] : responseContent, threadId, traceId, sessionId, tokenType: tokenType };

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
3.  **Constructor:** Takes `AnthropicAdapterOptions` (like API key). These options are provided by the `ProviderManager` when it instantiates the adapter based on `RuntimeProviderConfig.adapterOptions`.
4.  **`formatMessages` Helper:** Translates the standard `ArtStandardPrompt` into the `AnthropicMessage[]` format required by the API, including handling system prompts and tool use/result structures.
5.  **`call` Method:**
    *   Receives `ArtStandardPrompt` and `CallOptions` (which includes `providerConfig`).
    *   Calls `formatMessages` to translate the prompt.
    *   Determines model, API key, and other parameters primarily from the options set in the constructor (`this.options`, derived from `RuntimeProviderConfig.adapterOptions`) and the `providerConfig` passed in `CallOptions`.
    *   Constructs the `requestBody` for the Anthropic Messages API.
    *   Uses `fetch` to make the POST request to the Anthropic API endpoint.
    *   Includes necessary headers (`x-api-key`, `anthropic-version`).
    *   Handles potential API errors.
    *   If `stream` is true, reads the response stream, parses Server-Sent Events (SSE), and yields `StreamEvent` objects (`TOKEN`, `METADATA`, `ERROR`, `END`) via an async generator.
    *   If `stream` is false, parses the complete JSON response and yields a minimal sequence of `StreamEvent`s.
    *   Extracts usage info and yields `METADATA` events.
    *   Yields an `END` event when finished or on error.

**5.3. Integrating the `AnthropicAdapter`**

Integrating a custom adapter is straightforward with the `ProviderManager`. You simply register the adapter *class* in the `ProviderManagerConfig` when calling `createArtInstance`. ART handles the instantiation when needed.

```typescript
// --- Integration Example ---
import { AnthropicAdapter } from './adapters/AnthropicAdapter';
// Import other necessary components (Storage, Agent Core, Tools)
import { createArtInstance, ProviderManagerConfig, AgentFactoryConfig, IndexedDBStorageAdapter, PESAgent, CalculatorTool, ArtInstance, RuntimeProviderConfig } from 'art-framework';

async function setupWithCustomAdapter(): Promise<ArtInstance> {

    // Define the ProviderManagerConfig, including the custom adapter
    const providerConfig: ProviderManagerConfig = {
      availableProviders: [
        {
          name: 'anthropic', // Unique identifier for this provider configuration
          adapter: AnthropicAdapter, // Pass the adapter CLASS
        },
        // You could also register built-in adapters here if needed
        // { name: 'openai', adapter: OpenAIAdapter },
      ],
      // Optional global limits
      // maxParallelApiInstancesPerProvider: 2,
    };

    // Define the overall ART configuration
    const config: AgentFactoryConfig = {
      storage: { type: 'indexedDB', dbName: 'artWithAnthropic' }, // Or your custom storage adapter
      providers: providerConfig, // Pass the provider config
      agentCore: PESAgent, // Use the default agent core
      tools: [new CalculatorTool()], // Include any tools
    };

    // Create the ART instance
    const art = await createArtInstance(config);
    console.log("ART instance created with Anthropic adapter registered.");
    return art;
}

// --- Runtime Usage (Conceptual) ---

async function useAnthropic(art: ArtInstance, threadId: string, query: string) {
    // Define the runtime configuration for this specific call
    const runtimeConfig: RuntimeProviderConfig = {
        providerName: 'anthropic', // Must match the name registered in ProviderManagerConfig
        modelId: 'claude-3-opus-20240229', // Specify the desired model
        adapterOptions: {
            apiKey: 'YOUR_ANTHROPIC_API_KEY', // Provide necessary options for the adapter constructor
            // Add other Anthropic-specific options if needed
            // defaultTemperature: 0.5
        }
    };

    // Persist this choice for the thread (optional but common)
    await art.stateManager.setThreadConfigValue(threadId, 'runtimeProviderConfig', runtimeConfig);

    // Make the call - the agent core will load the runtimeProviderConfig from state
    const response = await art.process({ query, threadId });
    console.log("Response from Anthropic:", response.responseText);
}

```

**How it Works Now:**

1.  **Registration:** `createArtInstance` receives the `ProviderManagerConfig` which includes the `AnthropicAdapter` class associated with the name 'anthropic'. The `ProviderManager` is initialized with this mapping.
2.  **Runtime Selection:** When `art.process` is called, the `PESAgent` (or whichever `IAgentCore` is used) loads the `runtimeProviderConfig` from the `ThreadConfig` (which was set by the application, e.g., in `useAnthropic`).
3.  **Instantiation:** The `PESAgent` passes this `runtimeProviderConfig` within `CallOptions` to the `ReasoningEngine`. The `ReasoningEngine` calls `providerManager.getAdapter(runtimeConfig)`.
4.  **ProviderManager Logic:** The `ProviderManager` finds the registered class (`AnthropicAdapter`) for the name 'anthropic'. It creates a *new instance* of `AnthropicAdapter`, passing `runtimeConfig.adapterOptions` (containing the API key, etc.) to its constructor. It manages the lifecycle of this instance (pooling, caching based on config).
5.  **Execution:** The `ReasoningEngine` receives the managed adapter instance and calls its `call` method with the prompt and options. The `AnthropicAdapter` instance uses its configured options (API key) to communicate with the Anthropic API.
6.  **Release:** After the `call` completes (or the stream ends), the `ReasoningEngine` releases the adapter instance back to the `ProviderManager`.

This approach cleanly separates adapter implementation from instantiation and configuration, allowing flexible runtime selection and management of multiple providers.