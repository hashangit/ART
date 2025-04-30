## 1. Introduction: What is ART?

ART (Agent Reasoning & Tooling) is a JavaScript/TypeScript framework designed specifically for building intelligent, AI-powered agents that run **directly in the user's web browser**. Think of it as a toolkit that helps you create applications like sophisticated chatbots, research assistants, or automated helpers without needing a separate server for the core AI logic.

**Core Goals:**

*   **Client-Side First:** Runs entirely in the browser, making web-native AI apps possible.
*   **Modular:** Built like LEGO bricks – different parts (like memory, reasoning engine, tools) can be swapped or added.
*   **Flexible:** Adaptable to different AI models, tools, and agent behaviors.
*   **Decoupled:** Components work together through defined contracts (interfaces), not direct dependencies, making the system easier to manage and extend.

**Who is this guide for?**

This guide is for web developers who want to build applications using Large Language Models (LLMs) directly in the browser. We'll cover everything from basic setup to advanced customization, using both technical terms and simpler explanations.
## Usage Complexity Levels

Developers can engage with ART at different levels of complexity, depending on their needs:

*   **Level 1: Simple Usage (Using Built-ins)**
    *   **Focus:** Configuration.
    *   **Activities:** Select from ART's pre-built adapters (storage, reasoning), use the default agent pattern (`PESAgent`), and potentially include built-in tools. Initialize via `createArtInstance` and use `art.process()`.
    *   **Goal:** Quickly set up a functional agent using standard components.

*   **Level 2: Intermediate Usage (Extending with Custom Tools/Adapters)**
    *   **Focus:** Extension & Integration.
    *   **Activities:** Includes Simple Usage activities, PLUS implementing custom `IToolExecutor` interfaces to add specific capabilities (e.g., interacting with your backend, using specific libraries) or custom `ProviderAdapter`/`StorageAdapter` interfaces for unsupported services/storage.
    *   **Goal:** Tailor the agent's capabilities and integrations while leveraging the core framework's orchestration.

*   **Level 3: Advanced Usage (Implementing Custom Agent Patterns)**
    *   **Focus:** Core Logic Customization.
    *   **Activities:** Includes Intermediate Usage activities, PLUS implementing a custom `IAgentCore` interface. This involves defining a completely new reasoning loop or modifying an existing one significantly. Requires a deep understanding of how all internal ART components interact.
    *   **Goal:** Gain maximum control over the agent's behavior and reasoning process.