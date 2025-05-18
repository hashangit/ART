# Reasoning Adapters

Reasoning Adapters in the ART Framework are implementations of the `ProviderAdapter` interface. Their primary role is to enable communication with various Large Language Model (LLM) providers. They act as a translation layer, converting ART's standardized `ArtStandardPrompt` into the specific format required by an LLM provider's API, and then translating the provider's response back into a stream of standard `StreamEvent` objects.

## The `ProviderAdapter` Interface

All reasoning adapters must implement the `ProviderAdapter` interface (which extends `ReasoningEngine`), defined in `src/core/interfaces.ts`.

**Key Requirements:**

*   **`providerName: string` (readonly):** A unique string identifying the provider (e.g., "openai", "anthropic", "google-gemini", "ollama").
*   **`constructor(options: any)`:** Adapters typically accept an `options` object in their constructor. This object is supplied by the `ProviderManager` based on the `RuntimeProviderConfig.adapterOptions` and may include:
    *   `apiKey`: The API key for the provider.
    *   `model` or `defaultModel`: The default model ID to use if not overridden in `CallOptions`.
    *   `apiBaseUrl` or `baseURL`: To target a custom API endpoint (e.g., for proxies or self-hosted models like Ollama).
    *   Other provider-specific settings (e.g., `defaultMaxTokens` for Anthropic).
*   **`async call(prompt: ArtStandardPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>>`:**
    *   This is the core method.
    *   It receives an `ArtStandardPrompt` (an array of `ArtStandardMessage` objects).
    *   It must translate this standard prompt into the native request format of the LLM provider it targets. This includes mapping roles, content structures, and tool/function call representations.
    *   It makes the actual API call to the LLM provider.
    *   If `options.stream` is true, it processes the provider's streaming response, yielding `StreamEvent` objects (`TOKEN`, `METADATA`, `ERROR`, `END`) as data arrives.
    *   If `options.stream` is false, it makes a non-streaming call and then typically yields a minimal sequence of `StreamEvent`s representing the complete response.
    *   It must correctly populate the `tokenType` field in `TOKEN` `StreamEvent`s based on `options.callContext` (e.g., `AGENT_THOUGHT_LLM_RESPONSE`, `FINAL_SYNTHESIS_LLM_RESPONSE`) and any ability to detect "thinking" steps from the LLM.
*   **`shutdown?(): Promise<void>` (optional):** If the adapter manages persistent connections or resources, this method provides a way for graceful cleanup. It's called by the `ProviderManager` when an idle instance is evicted.

## How Adapters are Used

1.  **Configuration:** Adapters are registered with the `ProviderManager` via `ArtInstanceConfig.providers.availableProviders`.
2.  **Runtime Selection:** When `ReasoningEngine.call()` is invoked, the `CallOptions.providerConfig` specifies which provider (by `name`) and `modelId` to use, along with runtime `adapterOptions` (like the API key).
3.  **Instantiation & Management:** The `ProviderManager` instantiates (or reuses an idle instance of) the selected adapter, passing the `adapterOptions` to its constructor.
4.  **Delegation:** The `ReasoningEngine` delegates the `call` to the obtained adapter instance.

## Available Reasoning Adapters

ART `v0.2.7` includes the following built-in reasoning adapters:

*   **[Anthropic (`AnthropicAdapter`)](./anthropic.md):** For Claude models.
*   **[DeepSeek (`DeepSeekAdapter`)](./deepseek.md):** For DeepSeek models.
*   **[Gemini (`GeminiAdapter`)](./gemini.md):** For Google's Gemini models.
*   **[Ollama (`OllamaAdapter`)](./ollama.md):** For interacting with locally hosted models via Ollama's OpenAI-compatible API.
*   **[OpenAI (`OpenAIAdapter`)](./openai.md):** For OpenAI's GPT models (e.g., GPT-3.5, GPT-4, GPT-4o).
*   **[OpenRouter (`OpenRouterAdapter`)](./openrouter.md):** For accessing a variety of models through the OpenRouter API.

Click on each adapter name to learn more about its specific constructor options, prompt translation nuances, and any unique features.

## Creating a Custom Reasoning Adapter

If you need to integrate an LLM provider not yet supported by ART, you can create your own custom adapter.
See the [How-To Guide: Add an LLM Adapter](../../how-to/add-llm-adapter.md) for detailed instructions. The key steps involve:

1.  Creating a class that implements the `ProviderAdapter` interface.
2.  Implementing the `call` method to handle prompt translation, API interaction, and `StreamEvent` generation.
3.  Defining a constructor to accept necessary options (like API key, base URL).
4.  Optionally implementing a `shutdown` method.