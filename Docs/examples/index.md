# Examples & Tutorials

This section provides practical examples and tutorials to help you get started with building various types of AI agents using the ART Framework. Each example aims to illustrate specific features and common patterns.

For the most up-to-date and runnable code, always refer to the source files linked within each example and the `*.test.ts` files in the ART repository, which often contain practical usage scenarios.

## Available Examples:

1.  **[Basic Chatbot](basic-chatbot.md)**
    *   Demonstrates the fundamental setup for a simple conversational agent.
    *   Covers `ArtInstanceConfig` with `InMemoryStorageAdapter` and a single LLM provider.
    *   Shows how to use `art.process()` for a basic query-response interaction.

2.  **[Agent with Tools](agent-with-tools.md)**
    *   Illustrates how to define, register, and use tools (like the built-in `CalculatorTool` or a custom tool) with the `PESAgent`.
    *   Explains how tool schemas are provided to the LLM and how tool calls/results are handled.

3.  **[Persistent Agent (using IndexedDB)](persistent-agent.md)**
    *   Shows how to configure `ArtInstanceConfig` to use `IndexedDBStorageAdapter` for persistent storage of conversation history and agent state in a web browser environment.

4.  **[Streaming to UI (Conceptual)](./streaming-to-ui-conceptual.md)**
    *   Provides a conceptual example of how a client-side UI (JavaScript) could subscribe to ART's UI Sockets (`LLMStreamSocket`, `ObservationSocket`, `ConversationSocket`) to display real-time updates.

5.  **[Multi-Provider Agent](multi-provider-agent.md)**
    *   Demonstrates configuring the `ProviderManager` with multiple LLM providers (e.g., OpenAI and Anthropic, or OpenAI and a local Ollama model).
    *   Shows how to use `RuntimeProviderConfig` in `AgentProps.options` to dynamically select which provider and model to use for specific agent calls.

These examples are designed to be starting points. You can adapt and expand upon them to build more complex and specialized AI agents. Remember to consult the [Core Concepts](../core-concepts/architecture-overview.md) and [Components Deep Dive](../components/core/pes-agent.md) sections for a deeper understanding of the underlying framework components.