# Example: Reasoning Provider Usage

This example demonstrates how to configure and use different Reasoning Provider Adapters within the ART Framework. The chosen adapter determines which Large Language Model (LLM) provider (e.g., OpenAI, Anthropic, Google Gemini) the agent will use for its reasoning tasks (planning and synthesis).

## Prerequisites

*   ART Framework installed.
*   API keys for the LLM providers you intend to use. **Never hardcode API keys in production code.** Use environment variables or a secure configuration management system.

## Key Concepts

*   **`ReasoningEngine` Interface:** The standard interface for LLM interaction within ART.
*   **`ProviderAdapter`:** Concrete implementations of the `ReasoningEngine` interface for specific LLM providers (e.g., `OpenAIAdapter`, `AnthropicAdapter`, `GeminiAdapter`). Each adapter handles the unique API requirements of its provider.
*   **`createArtInstance` Configuration:** You specify which `reasoningAdapter` the ART instance should use during initialization.
*   **`ThreadConfig` Overrides:** While a default adapter/model is set at initialization, the configuration for a specific `threadId` (managed by `StateManager`) can potentially specify different models or parameters for that thread's interactions, assuming they are compatible with the initialized adapter.

## Example 1: Using `OpenAIAdapter`

This is a common configuration using OpenAI's models.

```typescript
import {
  createArtInstance,
  PESAgent,
  InMemoryStorageAdapter,
  OpenAIAdapter, // Import the OpenAI adapter
  LogLevel
} from 'art-framework';

// Ensure API key is set via environment variable or other secure means
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "YOUR_OPENAI_KEY";

async function initializeWithOpenAI() {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_KEY") {
    console.error("OpenAI API Key not configured.");
    return null;
  }

  console.log("Initializing ART with OpenAIAdapter...");

  const art = await createArtInstance({
    agentCore: PESAgent,
    storageAdapter: new InMemoryStorageAdapter(),
    // Configure and pass the OpenAIAdapter instance
    reasoningAdapter: new OpenAIAdapter({ 
      apiKey: OPENAI_API_KEY,
      defaultModel: 'gpt-4o', // Specify the default model to use
      defaultParams: { temperature: 0.7 } // Optional default parameters
    }),
    tools: [],
    logger: { level: LogLevel.INFO }
  });

  console.log("ART Instance with OpenAI Initialized.");
  return art;
}

async function runOpenAIExample() {
    const art = await initializeWithOpenAI();
    if (!art) return;

    const threadId = "openai-example-thread";
    console.log(`\nRunning query with OpenAI on thread [${threadId}]`);
    
    const response = await art.process({ 
        query: "What are the main features of GPT-4o?", 
        threadId 
    });

    console.log("\nOpenAI Response:", response.response.content);
}

// runOpenAIExample();
```

## Example 2: Using `AnthropicAdapter`

This example shows how to configure ART to use Anthropic's Claude models.

```typescript
import {
  createArtInstance,
  PESAgent,
  InMemoryStorageAdapter,
  AnthropicAdapter, // Import the Anthropic adapter
  LogLevel
} from 'art-framework';

// Ensure API key is set
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "YOUR_ANTHROPIC_KEY";

async function initializeWithAnthropic() {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "YOUR_ANTHROPIC_KEY") {
    console.error("Anthropic API Key not configured.");
    return null;
  }
  
  console.log("Initializing ART with AnthropicAdapter...");

  const art = await createArtInstance({
    agentCore: PESAgent,
    storageAdapter: new InMemoryStorageAdapter(),
    // Configure and pass the AnthropicAdapter instance
    reasoningAdapter: new AnthropicAdapter({ 
      apiKey: ANTHROPIC_API_KEY,
      defaultModel: 'claude-3-5-sonnet-20240620', // Specify the desired Claude model
      defaultParams: { max_tokens: 1024 } // Anthropic uses different param names
    }),
    tools: [],
    logger: { level: LogLevel.INFO }
  });

  console.log("ART Instance with Anthropic Initialized.");
  return art;
}

async function runAnthropicExample() {
    const art = await initializeWithAnthropic();
    if (!art) return;

    const threadId = "anthropic-example-thread";
    console.log(`\nRunning query with Anthropic on thread [${threadId}]`);
    
    const response = await art.process({ 
        query: "Explain constitutional AI.", 
        threadId 
    });

    console.log("\nAnthropic Response:", response.response.content);
}

// runAnthropicExample();
```

## Example 3: Using `GeminiAdapter`

This example configures ART to use Google's Gemini models.

```typescript
import {
  createArtInstance,
  PESAgent,
  InMemoryStorageAdapter,
  GeminiAdapter, // Import the Gemini adapter
  LogLevel
} from 'art-framework';

// Ensure API key is set
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_KEY";

async function initializeWithGemini() {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_KEY") {
    console.error("Gemini API Key not configured.");
    return null;
  }

  console.log("Initializing ART with GeminiAdapter...");

  const art = await createArtInstance({
    agentCore: PESAgent,
    storageAdapter: new InMemoryStorageAdapter(),
    // Configure and pass the GeminiAdapter instance
    reasoningAdapter: new GeminiAdapter({ 
      apiKey: GEMINI_API_KEY,
      defaultModel: 'gemini-1.5-flash-latest', // Specify the desired Gemini model
      // defaultParams: { temperature: 0.8 } 
    }),
    tools: [],
    logger: { level: LogLevel.INFO }
  });

  console.log("ART Instance with Gemini Initialized.");
  return art;
}

async function runGeminiExample() {
    const art = await initializeWithGemini();
    if (!art) return;

    const threadId = "gemini-example-thread";
    console.log(`\nRunning query with Gemini on thread [${threadId}]`);
    
    const response = await art.process({ 
        query: "What is Google's approach to AI safety?", 
        threadId 
    });

    console.log("\nGemini Response:", response.response.content);
}

// runGeminiExample();
```

## Switching Providers

In the current ART v0.2.4 structure, the primary `reasoningAdapter` is typically set once during initialization via `createArtInstance`.

To use different providers for different agents or application modes, you would generally initialize separate `ArtClient` instances, each configured with the desired `reasoningAdapter`.

However, the framework is designed with flexibility in mind. The `StateManager` loads `ThreadConfig` for each `threadId`. While the *adapter* itself is usually fixed per `ArtClient` instance, the `ThreadConfig` *could* potentially specify a different `model` ID or different `params` to be used for calls within that specific thread, provided the model is compatible with the initialized adapter. Advanced scenarios involving dynamic adapter switching per thread might be possible with custom extensions but are not the standard pattern in v0.2.4.

Refer to the [Reasoning System Guide](../Guides/Systems/ReasoningSystem.md) and [Context System Guide](../Guides/Systems/ContextSystem.md) for more details on adapters and thread configuration.