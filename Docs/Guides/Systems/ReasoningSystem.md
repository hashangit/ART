# Reasoning System Guide (v0.2.4)

## Overview

The Reasoning System (RS) is the component within the Agent Runtime (ART) Framework responsible for all interactions with Large Language Models (LLMs). It acts as an abstraction layer, handling the complexities of prompt construction, API calls to different providers, parsing LLM responses, and managing features like streaming.

Its primary goal is to provide a consistent interface for the Agent Core to leverage LLM capabilities, regardless of the specific underlying model or provider being used for a particular task or thread.

## Core Components

The Reasoning System comprises several key components working together:

1.  **`ReasoningEngine`**: The central interface and orchestrator for making LLM calls. It delegates the actual API interaction to a configured `ProviderAdapter`.
2.  **`ProviderAdapter`**: Concrete implementations that handle the specifics of communicating with a particular LLM provider's API (e.g., OpenAI, Anthropic, Gemini). ART v0.2.4 includes adapters for OpenAI, Gemini, Anthropic, OpenRouter, and DeepSeek.
3.  **`PromptManager`**: Responsible for constructing the actual prompts sent to the LLM, tailored for different phases of the agent's execution cycle (e.g., planning vs. synthesis in the PES pattern).
4.  **`OutputParser`**: Extracts structured information (like intent, plan, tool calls) or the final response text from the raw string output returned by the LLM.

## Key Features & Concepts

### 1. Provider Adapters

ART uses an adapter pattern to support various LLM providers. Each adapter implements the `ReasoningEngine` interface (or a provider-specific extension of it) and handles the unique requirements of its corresponding API (authentication, request formatting, response handling).

**Available Adapters (v0.2.4):**

*   `OpenAIAdapter`
*   `GeminiAdapter`
*   `AnthropicAdapter`
*   `OpenRouterAdapter` (Acts as a proxy to many models)
*   `DeepSeekAdapter`

**Configuration:**

You configure which adapter (and potentially which specific model) to use when initializing the `ArtClient` via `createArtInstance`. The `StateManager` retrieves this configuration per `threadId` before an LLM call is made.

```typescript
import { createArtInstance, OpenAIAdapter, AnthropicAdapter } from 'art-framework';

const art = await createArtInstance({
  // ... other config ...
  reasoningAdapter: new OpenAIAdapter({ 
    apiKey: "YOUR_OPENAI_KEY",
    defaultModel: 'gpt-4o' // Optional default
  }),
  // Or:
  // reasoningAdapter: new AnthropicAdapter({ apiKey: "YOUR_ANTHROPIC_KEY" }), 
});
```

The `ReasoningEngine` uses the adapter specified in the `ThreadConfig` loaded by the `StateManager` for the current `threadId`. This allows different threads to potentially use different LLMs or configurations.

### 2. Prompt Management (`PromptManager`)

The `PromptManager` is responsible for creating the prompts sent to the LLM. It takes context provided by the Agent Core (like query, history, tool schemas, tool results) and formats it into a prompt suitable for the current task (planning or synthesis) and potentially optimized for the specific LLM being used.

```typescript
interface PromptManager {
  /**
   * Creates a prompt for the planning phase.
   * Includes query, history, system prompt, and available tool schemas.
   */
  createPlanningPrompt(context: PlanningContext): FormattedPrompt;

  /**
   * Creates a prompt for the synthesis phase.
   * Includes query, intent, plan, tool results, history, and system prompt.
   */
  createSynthesisPrompt(context: SynthesisContext): FormattedPrompt;
}

// FormattedPrompt can be a string or a provider-specific object (e.g., for message arrays)
type FormattedPrompt = string | object; 
```

Developers can potentially provide custom `PromptManager` implementations to tailor prompting strategies.

### 3. LLM Calls (`ReasoningEngine.call`)

The `ReasoningEngine`'s `call` method is the primary way the Agent Core interacts with the LLM.

```typescript
interface ReasoningEngine {
  call(
    prompt: FormattedPrompt, 
    options: CallOptions
  ): Promise<string>; // Returns raw LLM response string
}

interface CallOptions {
  threadId: string; // Mandatory for context/config lookup
  traceId?: string;
  userId?: string;
  sessionId?: string;
  // Callback for streaming intermediate thoughts
  onThought?: (thought: string) => void; 
  // Provider-specific parameters (model, temperature, max_tokens, etc.)
  // These are often sourced from the ThreadConfig via StateManager
  [key: string]: any; 
}
```

The `call` method:
*   Retrieves the appropriate `ProviderAdapter` based on the `threadId`'s configuration (via `StateManager`).
*   Passes the `FormattedPrompt` and `CallOptions` to the adapter.
*   Handles the `onThought` callback, triggering it when the LLM streams intermediate reasoning steps (often enclosed in `<thoughts>` tags in the raw response).
*   Returns the final, complete, raw string response from the LLM.

### 4. Output Parsing (`OutputParser`)

Since LLMs return raw text (or structured data that needs validation), the `OutputParser` is crucial for extracting meaningful information.

```typescript
interface OutputParser {
  /**
   * Parses the planning response to extract intent, plan, and structured tool calls.
   * Includes validation (e.g., using Zod) for tool call arguments.
   */
  parsePlanningOutput(rawResponse: string): { 
    intent: string; 
    plan: string; 
    toolCalls: ParsedToolCall[] 
  };

  /**
   * Extracts the final, user-facing response text from the synthesis response.
   */
  parseSynthesisOutput(rawResponse: string): string;
}

interface ParsedToolCall {
  callId: string; // Unique ID for this specific call attempt
  toolName: string;
  arguments: any; // Arguments extracted for the tool
}
```

The parser needs to be robust against variations in LLM output formatting. The v0.2.4 implementation includes logic to find JSON arrays for tool calls even if embedded within markdown code fences or other text, and uses Zod schemas for validating the structure of `ParsedToolCall` objects.

### 5. Streaming Thoughts (`onThought` Callback)

The `ReasoningEngine.call` method accepts an optional `onThought` callback function within its `CallOptions`. If provided, the underlying `ProviderAdapter` should invoke this callback whenever it receives intermediate reasoning steps or "thoughts" from the LLM during streaming.

*   The Agent Core typically passes a function that wraps `ObservationManager.record` to this callback.
*   This allows the framework to create `THOUGHTS` type observations in real-time.
*   The UI System can subscribe to these `THOUGHTS` observations via the `ObservationSocket` to display the agent's reasoning process live to the user.

```typescript
// Example of how Agent Core uses onThought
const llmResponse = await props.reasoningEngine.call(prompt, {
  threadId: props.threadId,
  // ... other options
  onThought: (thought) => {
    // Record the thought as an observation
    props.observationManager.record({
      type: ObservationType.THOUGHTS,
      content: thought,
      threadId: props.threadId,
      traceId: props.traceId,
      metadata: { sourcePhase: 'planning' } // Indicate which phase
    });
  }
});
```

Support for extracting thoughts depends on the LLM provider and the specific adapter implementation.

## Error Handling

The Reasoning System handles errors related to LLM interactions:

*   **API Errors:** Network issues, authentication failures, rate limits from the provider are caught by the `ProviderAdapter` and typically re-thrown as `ARTError` with code `LLM_PROVIDER_ERROR`.
*   **Parsing Errors:** If the `OutputParser` fails to extract the expected structure (e.g., invalid JSON for tool calls, missing required fields), it should throw an `ARTError` with code `OUTPUT_PARSING_FAILED`.
*   **Configuration Errors:** Missing API keys or invalid model configurations might result in `INVALID_CONFIG` or `MISSING_API_KEY` errors.

The Agent Core catches these errors and records `ERROR` observations.

## Future Considerations (Post v1.0)

*   **Model Registry:** A centralized registry to manage model capabilities, context windows, and potentially costs (see `ART-Concept/art-model-management-concept.md`).
*   **Intelligent Model Selection:** Automatically choosing the best model for a task based on capabilities and configuration.
*   **Hybrid Inference:** Combining local (WASM) and remote LLMs.
*   **Advanced Prompting Techniques:** Support for more complex prompt engineering strategies.

## Related Guides

*   [Agent Core Guide](./AgentCore.md)
*   [Observation System Guide](./ObservationSystem.md)
*   [Context System Guide](./ContextSystem.md)