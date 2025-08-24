# How-To: Create a Custom Agent Core

While the `PESAgent` (Plan-Execute-Synthesize) is the default agent core in ART and is suitable for many use cases, you might encounter scenarios where you need a different orchestration logic or a more specialized reasoning pattern. The ART Framework allows you to create and use your own custom agent core by implementing the `IAgentCore` interface.

## 1. Understand `IAgentCore`

First, familiarize yourself with the `IAgentCore` interface defined in `src/core/interfaces.ts`:

```typescript
export interface IAgentCore {
  process(props: AgentProps): Promise<AgentFinalResponse>;
}
```

Your custom agent class must have a `process` method that:
*   Accepts `AgentProps` (containing `query`, `threadId`, `options`, etc.).
*   Returns a `Promise<AgentFinalResponse>` (containing the final `ConversationMessage` and `ExecutionMetadata`).

## 2. Define Your Agent's Logic

Decide on the reasoning pattern your custom agent will follow. Some examples:

*   **Simple Echo Agent:** Directly responds with a modified version of the query.
*   **ReAct (Reason-Act) Agent:** Iteratively reasons about what to do, takes an action (calls a tool or responds to user), observes the result, and repeats until the goal is met.
*   **Specialized Task Agent:** An agent designed for a very specific task that might not fit the general PES flow, perhaps with a fixed sequence of LLM calls or tool uses.

## 3. Create Your Custom Agent Class

Create a new TypeScript file (e.g., `src/agents/my-custom-agent.ts`) for your agent.

```typescript
// src/agents/my-custom-agent.ts
import {
    IAgentCore,
    AgentProps,
    AgentFinalResponse,
    ConversationMessage,
    MessageRole,
    ExecutionMetadata,
    StateManager,
    ConversationManager,
    ReasoningEngine,
    ObservationManager,
    ToolRegistry,
    OutputParser,
    ToolSystem,
    UISystem,
    ArtStandardPrompt,
    PromptManager
} from 'art-framework';
import { generateUUID } from 'art-framework';

interface MyCustomAgentDependencies {
    stateManager: StateManager;
    conversationManager: ConversationManager;
    reasoningEngine: ReasoningEngine;
    observationManager: ObservationManager;
    uiSystem: UISystem;
    promptManager: PromptManager;
}

export class MyCustomAgent implements IAgentCore {
    private deps: MyCustomAgentDependencies;

    constructor(dependencies: MyCustomAgentDependencies) {
        this.deps = dependencies;
    }

    async process(props: AgentProps): Promise<AgentFinalResponse> {
        const traceId = props.traceId || generateUUID();

        // Load config/history
        const threadContext = await this.deps.stateManager.loadThreadContext(props.threadId, props.userId);
        const history = await this.deps.conversationManager.getMessages(props.threadId);
        const mappedHistory: ArtStandardPrompt = history.map(m => {
          const role = m.role === MessageRole.USER ? 'user' : m.role === MessageRole.AI ? 'assistant' : m.role === MessageRole.SYSTEM ? 'system' : 'tool';
          return { role, content: m.content };
        });

        // Compose system prompt (simple example; you can use tags/variables via thread/call overrides)
        const base = this.deps.promptManager.getFragment('pes_system_default');
        const systemPrompt = base;

        const prompt: ArtStandardPrompt = [
          { role: 'system', content: systemPrompt },
          ...mappedHistory,
          { role: 'user', content: props.query }
        ];

        // Optional: validate
        const validated = this.deps.promptManager.validatePrompt(prompt);

        // Call LLM
        const stream = await this.deps.reasoningEngine.call(validated, {
          threadId: props.threadId,
          traceId,
          stream: true,
          callContext: 'MY_AGENT',
          providerConfig: props.options!.providerConfig
        });

        let content = '';
        for await (const ev of stream) {
          this.deps.uiSystem.getLLMStreamSocket().notify(ev, { targetThreadId: props.threadId, targetSessionId: props.sessionId });
          if (ev.type === 'TOKEN') content += ev.data;
        }

        const aiMsg: ConversationMessage = {
          messageId: generateUUID(),
          threadId: props.threadId,
          role: MessageRole.AI,
          content,
          timestamp: Date.now(),
          metadata: { traceId }
        };
        await this.deps.conversationManager.addMessages(props.threadId, [aiMsg]);

        return { response: aiMsg, metadata: { threadId: props.threadId, traceId, status: 'success', totalDurationMs: 0, llmCalls: 1, toolCalls: 0 } };
    }
}
```

**Key Considerations for Your Custom Agent:**

*   **Dependencies:** The factory injects `StateManager`, `ConversationManager`, `ReasoningEngine`, `ObservationManager`, `UISystem`, and `PromptManager` (and optionally `ToolRegistry`, `OutputParser`, `ToolSystem` if needed).
*   **Prompt Construction:** Assemble `ArtStandardPrompt` (array of `{ role, content, ... }`), and use `promptManager.validatePrompt(prompt)` before LLM calls. Use `promptManager.getFragment('...')` for reusable text.
*   **System Prompt Overrides:** Prefer using thread/call overrides (tag + variables + strategy) in `ThreadConfig.systemPrompt` and `AgentProps.options.systemPrompt` rather than hardcoding strings in the agent.
*   **LLM Interaction:** Use `reasoningEngine.call(validated, callOptions)`; handle the `AsyncIterable<StreamEvent>`.
*   **Tooling/State/Observations/UI:** Same guidance as before.

## 4. Configure ART to Use Your Custom Agent

In your `ArtInstanceConfig`, set the `agentCore` property to your custom agent class and, optionally, define a `systemPrompts` registry for consistent overrides.

```typescript
import { ArtInstanceConfig } from 'art-framework';
import { MyCustomAgent } from '../agents/my-custom-agent';

export const myAppArtConfig: ArtInstanceConfig = {
    storage: { type: 'memory' },
    providers: { availableProviders: [/* ... */] },
    agentCore: MyCustomAgent,
    systemPrompts: { defaultTag: 'default', specs: { default: { template: "{{fragment:pes_system_default}}" } } }
};
```

This ensures your custom agent stays aligned with the framework’s standard prompt/message model and the new system prompt override flow.
```

```markdown
docs/how-to/add-llm-adapter.md
```
```markdown
# How-To: Add a Custom LLM Provider Adapter

The ART Framework's `ProviderManager` and `ProviderAdapter` interface allow you to integrate virtually any Large Language Model (LLM) provider. If ART doesn't have a built-in adapter for your desired LLM, you can create your own.

## Steps to Create a Custom `ProviderAdapter`

1.  **Understand the `ProviderAdapter` Interface:**
    Review `src/core/interfaces.ts`. Your adapter must implement:
    ```typescript
    export interface ProviderAdapter extends ReasoningEngine {
      readonly providerName: string;
      // call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>; // Inherited from ReasoningEngine
      shutdown?(): Promise<void>;
    }
    ```
    And `ReasoningEngine` requires:
    ```typescript
    export interface ReasoningEngine {
      call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>;
    }
    ```
    *   `FormattedPrompt` is an alias for `ArtStandardPrompt`.

2.  **Create Your Adapter Class:**
    Create a new TypeScript file (e.g., `src/my-adapters/my-llm-adapter.ts`).

    ```typescript
    // src/my-adapters/my-llm-adapter.ts
    import {
        ProviderAdapter,
        ArtStandardPrompt,
        ArtStandardMessage, // For prompt translation
        CallOptions,
        StreamEvent,
        LLMMetadata,
        Logger,
        ARTError,
        ErrorCode
    } from 'art-framework';
    // Import any SDK or HTTP client for your target LLM API
    // import MyLlmApiClient from 'my-llm-api-sdk';

    export interface MyLlmAdapterOptions {
        apiKey: string;
        model?: string; // Default model for this adapter instance
        baseURL?: string;
        // Add other options your adapter needs
    }

    export class MyLlmAdapter implements ProviderAdapter {
        readonly providerName = 'my-custom-llm'; // Unique name
        private options: MyLlmAdapterOptions;
        // private apiClient: MyLlmApiClient; // Example SDK client

        constructor(options: MyLlmAdapterOptions) {
            if (!options.apiKey) {
                throw new ARTError('MyLlmAdapter requires an apiKey.', ErrorCode.MISSING_API_KEY);
            }
            this.options = options;
            // this.apiClient = new MyLlmApiClient({ apiKey: options.apiKey, baseURL: options.baseURL });
            Logger.info(`${this.providerName} adapter initialized with model: ${options.model || 'not set'}`);
        }

        async call(
            prompt: ArtStandardPrompt,
            callOptions: CallOptions
        ): Promise<AsyncIterable<StreamEvent>> {
            const modelToUse = callOptions.providerConfig.modelId || this.options.model;
            if (!modelToUse) {
                throw new ARTError(`Model ID not specified for ${this.providerName} call.`, ErrorCode.INVALID_CONFIG);
            }

            Logger.debug(`[${this.providerName}] Calling model ${modelToUse} for thread ${callOptions.threadId}`, { callOptions });

            // --- 1. Translate ArtStandardPrompt to Provider-Specific Format ---
            const providerRequestPayload = this.translatePromptToMyLlmFormat(prompt, modelToUse, callOptions);

            // --- 2. Make the API Call (Streaming or Non-Streaming) ---
            if (callOptions.stream) {
                return this.handleStreamCall(providerRequestPayload, callOptions);
            } else {
                return this.handleNonStreamCall(providerRequestPayload, callOptions);
            }
        }

        private translatePromptToMyLlmFormat(
            artPrompt: ArtStandardPrompt,
            model: string,
            callOptions: CallOptions
        ): any {
            // Example: Convert ArtStandardMessage roles/content to your LLM's format
            // This is highly dependent on the target LLM's API
            const messages = artPrompt.map(artMsg => {
                let role = artMsg.role;
                // Role mapping example
                if (artMsg.role === 'assistant') role = 'model_assistant';
                else if (artMsg.role === 'tool_result') role = 'tool_feedback';

                return { role_translated: role, content_translated: artMsg.content };
            });

            const payload = {
                model: model,
                messages_provider_specific: messages,
                temperature: callOptions.temperature, // Pass through common params
                max_tokens: callOptions.max_tokens,
                // Add tool definitions if your provider supports them
                // tools: this.formatToolsForMyLlm(callOptions.tools),
            };
            return payload;
        }

        private async *handleStreamCall(
            payload: any,
            callOptions: CallOptions
        ): AsyncIterable<StreamEvent> {
            const startTime = Date.now();
            let timeToFirstTokenMs: number | undefined;
            let outputTokens = 0;

            try {
                // const stream = await this.apiClient.generateStream(payload); // Example SDK call
                // For raw fetch with SSE:
                // const response = await fetch(`${this.options.baseURL}/generate_stream`, {
                //    method: 'POST', body: JSON.stringify(payload), headers: { /* ... auth ... */ }
                // });
                // if (!response.ok || !response.body) { /* throw error */ }
                // const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

                // --- Placeholder for actual streaming logic ---
                Logger.warn(`[${this.providerName}] Streaming not fully implemented in this example adapter.`);
                // Simulate a few token events for demonstration
                const mockFullResponse = "This is a streamed response from MyCustomLLM.";
                for (const word of mockFullResponse.split(" ")) {
                    await new Promise(r => setTimeout(r, 50)); // Simulate delay
                    if (!timeToFirstTokenMs) timeToFirstTokenMs = Date.now() - startTime;
                    outputTokens++;
                    yield {
                        type: 'TOKEN',
                        data: word + " ",
                        tokenType: callOptions.callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE',
                        threadId: callOptions.threadId,
                        traceId: callOptions.traceId!,
                        sessionId: callOptions.sessionId,
                    };
                }
                // --- End Placeholder ---

                // Example: Processing chunks from an actual SSE stream
                // while (true) {
                //   const { value, done } = await reader.read();
                //   if (done) break;
                //   // Parse SSE lines (data: {...})
                //   // For each text chunk:
                //   //   if (!timeToFirstTokenMs) timeToFirstTokenMs = Date.now() - startTime;
                //   //   outputTokens++;
                //   //   yield { type: 'TOKEN', data: textChunk, ... };
                //   // For final metadata from stream (if provider sends it):
                //   //   yield { type: 'METADATA', data: { ... }, ... };
                // }

                const metadata: LLMMetadata = {
                    stopReason: 'stop', // Or from provider
                    outputTokens,
                    timeToFirstTokenMs,
                    totalGenerationTimeMs: Date.now() - startTime,
                    // inputTokens: from_provider_if_available,
                    providerRawUsage: { /* any raw data from provider */ }
                };
                yield { type: 'METADATA', data: metadata, threadId: callOptions.threadId, traceId: callOptions.traceId!, sessionId: callOptions.sessionId };

            } catch (error: any) {
                Logger.error(`[${this.providerName}] Stream call error: ${error.message}`, error);
                yield { type: 'ERROR', data: new ARTError(error.message, ErrorCode.LLM_PROVIDER_ERROR, error), threadId: callOptions.threadId, traceId: callOptions.traceId!, sessionId: callOptions.sessionId };
            } finally {
                yield { type: 'END', data: null, threadId: callOptions.threadId, traceId: callOptions.traceId!, sessionId: callOptions.sessionId };
            }
        }

        private async *handleNonStreamCall(
            payload: any,
            callOptions: CallOptions
        ): AsyncIterable<StreamEvent> {
            const startTime = Date.now();
            try {
                // const response = await this.apiClient.generate(payload); // Example SDK call
                // const responseText = response.choices[0].text;
                // const usage = response.usage;

                // --- Placeholder for actual non-streaming logic ---
                Logger.warn(`[${this.providerName}] Non-streaming not fully implemented in this example adapter.`);
                const responseText = "This is a non-streamed response from MyCustomLLM.";
                const usage = { prompt_tokens: 10, completion_tokens: 7 }; // Mock usage
                // --- End Placeholder ---


                yield {
                    type: 'TOKEN',
                    data: responseText,
                    tokenType: callOptions.callContext === 'AGENT_THOUGHT' ? 'AGENT_THOUGHT_LLM_RESPONSE' : 'FINAL_SYNTHESIS_LLM_RESPONSE',
                    threadId: callOptions.threadId,
                    traceId: callOptions.traceId!,
                    sessionId: callOptions.sessionId,
                };

                const metadata: LLMMetadata = {
                    inputTokens: usage.prompt_tokens,
                    outputTokens: usage.completion_tokens,
                    stopReason: 'stop', // Or from provider
                    totalGenerationTimeMs: Date.now() - startTime,
                    providerRawUsage: { usage }
                };
                yield { type: 'METADATA', data: metadata, threadId: callOptions.threadId, traceId: callOptions.traceId!, sessionId: callOptions.sessionId };

            } catch (error: any) {
                Logger.error(`[${this.providerName}] Non-stream call error: ${error.message}`, error);
                yield { type: 'ERROR', data: new ARTError(error.message, ErrorCode.LLM_PROVIDER_ERROR, error), threadId: callOptions.threadId, traceId: callOptions.traceId!, sessionId: callOptions.sessionId };
            } finally {
                yield { type: 'END', data: null, threadId: callOptions.threadId, traceId: callOptions.traceId!, sessionId: callOptions.sessionId };
            }
        }

        // Optional: Implement if your adapter holds persistent resources
        // async shutdown(): Promise<void> {
        //   Logger.info(`${this.providerName} adapter shutting down.`);
        //   // await this.apiClient.closeConnection();
        // }

        // Optional: Helper to format tools for your LLM
        // private formatToolsForMyLlm(artTools?: ToolSchema[]): any[] | undefined { /* ... */ }
    }
    ```

3.  **Implement Prompt Translation:**
    *   In `translatePromptToMyLlmFormat` (or similar helper), convert the `ArtStandardPrompt` (array of `ArtStandardMessage`s) into the exact JSON payload structure your target LLM API expects.
    *   Pay close attention to how roles (`system`, `user`, `assistant`, `tool_result`) are mapped.
    *   Handle `ArtStandardMessage.tool_calls` and `tool_results` if your LLM supports function/tool calling. You'll need to format these according to your provider's specifications.
    *   If your provider requires tool schemas to be sent with the request (like OpenAI's `tools` parameter), format `ToolSchema` objects from `callOptions.tools` accordingly.

4.  **Implement API Call Logic:**
    *   **`handleStreamCall`:**
        *   Use your provider's SDK or an HTTP client (like `fetch`) to make a streaming request.
        *   Process the incoming stream (e.g., Server-Sent Events). For each piece of data:
            *   If it's a text chunk, `yield` a `TOKEN` `StreamEvent`. Set `tokenType` based on `callOptions.callContext`.
            *   If it's metadata (like final token counts or stop reason, some providers send this at the end of a stream), `yield` a `METADATA` `StreamEvent`.
            *   If an error occurs in the stream, `yield` an `ERROR` `StreamEvent`.
        *   Ensure you `yield` an `END` `StreamEvent` when the provider's stream finishes or an unrecoverable error occurs.
    *   **`handleNonStreamCall`:**
        *   Make a regular, non-streaming API request.
        *   Once the full response is received:
            *   `yield` one or more `TOKEN` `StreamEvent`s with the response content(s).
            *   `yield` a `METADATA` `StreamEvent` with token usage, stop reason, etc.
            *   `yield` an `END` `StreamEvent`.

5.  **Error Handling:**
    *   Wrap API errors or unexpected issues in `ARTError` with an appropriate `ErrorCode` (usually `LLM_PROVIDER_ERROR` or `NETWORK_ERROR`) and the original error.
    *   For streaming calls, yield these as `ERROR` `StreamEvent`s. For non-streaming, you might throw directly or yield an error stream.

6.  **Tool Support (If Applicable):**
    *   **Sending Tool Schemas:** If your LLM provider requires tool definitions to be sent with the prompt (like OpenAI's `tools` parameter), your adapter's `call` method (or a helper like `translatePromptToMyLlmFormat`) will need to access `callOptions.tools` (an array of `ToolSchema`) and format them into the provider-specific structure.
    *   **Receiving Tool Call Requests:** When the LLM responds with a request to call tools, your adapter needs to parse this from the provider's response format and ensure it can be understood by ART's `OutputParser` (ideally, translate it into a structure resembling `ArtStandardMessage.tool_calls` if the provider's format is very different, though often it's similar).
    *   **Sending Tool Results:** When the agent provides `tool_result` messages in the `ArtStandardPrompt`, your adapter must translate these into the format your LLM provider expects for tool execution feedback.

7.  **Register Your Adapter:**
    Add an entry for your new adapter in the `availableProviders` array of your `ProviderManagerConfig` within `ArtInstanceConfig`.

    ```typescript
    // src/config/art-config.ts
    import { ArtInstanceConfig /* ... */ } from 'art-framework';
    import { MyLlmAdapter } from '../my-adapters/my-llm-adapter'; // Adjust path

    const artConfig: ArtInstanceConfig = {
        // ... storage config ...
        providers: {
            availableProviders: [
                // ... other adapters ...
                {
                    name: 'my-custom-llm-provider', // Unique name for ProviderManager
                    adapter: MyLlmAdapter,         // Your adapter class
                    isLocal: false,                // Or true if it's a local model
                }
            ],
            // ... other ProviderManagerConfig settings ...
        },
        // ...
    };
    ```

8.  **Use Your Adapter:**
    In your `AgentProps.options`, specify the `providerName` (matching the name in `availableProviders`) and provide the necessary `adapterOptions` (like `apiKey`) for your adapter.

    ```typescript
    // When calling art.process()
    const agentProps: AgentProps = {
        query: "Use my custom LLM",
        threadId: "custom-llm-thread",
        options: {
            providerConfig: {
                providerName: 'my-custom-llm-provider',
                modelId: 'my-custom-model-v1', // Specific model your adapter will use
                adapterOptions: {
                    apiKey: process.env.MY_CUSTOM_LLM_API_KEY,
                    // other options for MyLlmAdapter constructor
                }
            }
        }
    };
    ```

By following these steps, you can extend ART to support any LLM provider with an API. The key is careful translation between `ArtStandardPrompt`/`StreamEvent` and the provider's native formats.