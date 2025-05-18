# Adapters Overview

In the ART Framework, **Adapters** are crucial components that bridge the gap between the framework's standardized interfaces and the diverse APIs of external services. They act as translators and intermediaries, allowing ART to interact with different systems (like LLM providers or storage backends) in a consistent way.

There are two main categories of adapters in ART:

1.  **Reasoning Adapters (`ProviderAdapter`)**
2.  **Storage Adapters (`StorageAdapter`)**

## 1. Reasoning Adapters (`ProviderAdapter`)

*   **Interface:** `ProviderAdapter` (extends `ReasoningEngine`) from `src/core/interfaces.ts`.
*   **Purpose:** To enable communication with various Large Language Model (LLM) providers. Each specific LLM service (e.g., OpenAI's GPT models, Anthropic's Claude models, Google's Gemini models, locally hosted models via Ollama) will have its own `ProviderAdapter` implementation.
*   **Managed by:** `ProviderManager`. The `ReasoningEngine` requests adapters from the `ProviderManager` based on runtime configuration.

**Key Responsibilities of a `ProviderAdapter`:**

*   **Implement `call(prompt: ArtStandardPrompt, options: CallOptions)`:**
    *   **Prompt Translation:** Takes ART's standard `ArtStandardPrompt` (an array of `ArtStandardMessage` objects) and translates it into the specific request format required by the target LLM provider's API. This includes mapping roles (e.g., ART's `assistant` to Gemini's `model`), content structures, and tool/function calling formats.
    *   **API Interaction:** Makes the actual HTTP request to the LLM provider's endpoint. This involves:
        *   Handling authentication (e.g., using API keys passed in `CallOptions.providerConfig.adapterOptions`).
        *   Setting appropriate headers.
        *   Sending the translated prompt payload.
    *   **Response Handling (Streaming):** If `CallOptions.stream` is `true`, the adapter must process the provider's streaming response (e.g., Server-Sent Events) and convert each data chunk into a standard ART `StreamEvent` (`TOKEN`, `METADATA`, `ERROR`, `END`). It returns an `AsyncIterable<StreamEvent>`.
    *   **Response Handling (Non-Streaming):** If streaming is not requested, the adapter makes a regular API call, waits for the full response, and then typically yields a minimal sequence of `StreamEvent`s (e.g., one `TOKEN` event with the full content, a `METADATA` event, and an `END` event) via an `AsyncIterable`.
    *   **Tool/Function Calling Support:**
        *   Formats `ToolSchema` definitions (from `CallOptions.tools`, though less common now as tools are usually described in the prompt by the agent) in a way the LLM understands for its function-calling capabilities.
        *   Parses tool call requests from the LLM's response (if the provider's format differs significantly from `ArtStandardMessage.tool_calls`).
        *   Formats `tool_result` messages correctly for the LLM when providing feedback from executed tools.
*   **`providerName: string` (readonly):** A unique string identifying the provider (e.g., "openai", "anthropic").
*   **`shutdown?(): Promise<void>` (optional):** A method for graceful cleanup if the adapter holds persistent connections or resources. Called by the `ProviderManager` during eviction.

**Built-in Reasoning Adapters:**

ART `v0.2.7` includes adapters for:

*   `AnthropicAdapter`
*   `DeepSeekAdapter`
*   `GeminiAdapter`
*   `OllamaAdapter`
*   `OpenAIAdapter`
*   `OpenRouterAdapter`

(See `docs/components/adapters/reasoning/` for details on each.)

## 2. Storage Adapters (`StorageAdapter`)

*   **Interface:** `StorageAdapter` from `src/core/interfaces.ts`.
*   **Purpose:** To provide a generic persistence layer for ART's data, such as conversation history, agent state, and observations. This allows the framework to be independent of any specific database or storage mechanism.
*   **Used by:** Repository classes (`ConversationRepository`, `ObservationRepository`, `StateRepository`).

**Key Responsibilities of a `StorageAdapter`:**

*   **Implement CRUD-like operations:**
    *   `get<T>(collection: string, id: string): Promise<T | null>`
    *   `set<T>(collection: string, id: string, data: T): Promise<void>`
    *   `delete(collection: string, id: string): Promise<void>`
    *   `query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>`
*   **`init?(config?: any): Promise<void>` (optional):** For any initialization tasks, like connecting to a database or setting up tables/stores. This is called by `AgentFactory` during ART instance setup.
*   **`clearCollection?(collection: string): Promise<void>` (optional):** Clears all items from a specific collection.
*   **`clearAll?(): Promise<void>` (optional):** Clears all data managed by the adapter.

**Built-in Storage Adapters:**

*   **`InMemoryStorageAdapter`:** Stores all data in JavaScript Maps in memory. Data is lost when the application session ends. Useful for testing, demos, or ephemeral agents.
*   **`IndexedDBStorageAdapter`:** Uses the browser's IndexedDB API for persistent client-side storage. Suitable for web applications where data needs to persist across sessions.

(See `docs/components/adapters/storage/` for details on each.)

## Why Adapters?

The adapter pattern is fundamental to ART's design because it:

*   **Promotes Loose Coupling:** Core framework components (like `ReasoningEngine` or Repositories) interact with abstract interfaces (`ProviderAdapter`, `StorageAdapter`) rather than concrete implementations.
*   **Enhances Extensibility:** Developers can easily add support for new LLM providers or storage backends by creating new classes that implement the respective adapter interfaces, without modifying the core framework.
*   **Simplifies Maintenance:** Changes to a specific provider's API only require updates to its corresponding adapter, isolating the impact.
*   **Facilitates Testing:** Mock adapter implementations can be easily created for unit and integration testing.

By leveraging adapters, ART achieves a flexible and maintainable architecture capable of evolving with the rapidly changing landscape of AI services and data storage solutions.