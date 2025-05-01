## 2. Understanding ART's Architecture: The 3 Nodes

Imagine ART as having three main layers or "nodes" that work together:

```mermaid
flowchart LR
    A["Node 1: Developer Interface\n(Your Code & Config)"] --> B["Node 2: ART Core Orchestration\n(The Framework's Brain)"]
    B --> C["Node 3: External Connections\n(LLMs, Tools, Storage)"]
    C --> B
```

*   **Node 1: Developer Interface (Your Code & Config)**
    *   **What it is:** This is where you, the developer, interact with ART. You write the code to set up, configure, and control the agent.
    *   **What you do here:** Choose which AI model to use (like GPT-4 or Gemini), decide how the agent should remember things (in memory or browser storage), select which tools it can use, pick the agent's thinking style (its "pattern"), and tell the agent when to start processing a user's request.
    *   **Key ART parts involved:** `createArtInstance` (the function to start ART), configuration objects, `ArtInstance` (the main object you interact with), `art.process()` (the command to make the agent think).

*   **Node 2: ART Core Orchestration (The Framework's Brain)**
    *   **What it is:** This is the internal engine of ART, set up based on your configuration in Node 1. It manages the entire process of understanding a request, using tools, and generating a response.
    *   **What it does:** Follows the chosen agent pattern (like "Plan-Execute-Synthesize" or "ReAct"), manages conversation history, keeps track of the agent's state, prepares instructions (prompts) for the AI model using blueprints and context, understands the AI's responses (including streaming tokens), coordinates tool usage, logs important events (observations), and broadcasts real-time updates to the UI.
    *   **Key ART parts involved:** The specific Agent Core implementation (`PESAgent`, `ReActAgent`), Managers (`StateManager`, `ConversationManager`, `ObservationManager`), Systems (`ToolSystem`, `UISystem`), Reasoning Components (`ReasoningEngine`, `PromptManager`, `OutputParser`). You usually don't interact with these directly after setup unless you're doing advanced customization or consuming UI sockets.

*   **Node 3: External Dependencies & Interactions (The Outside World)**
    *   **What it is:** This node represents where the ART engine connects to resources outside its core orchestration logic. These are the pluggable pieces configured in Node 1, whose instances are often managed by Node 2.
    *   **What it does:** Makes the actual calls to the LLM provider APIs or local services (using adapter instances provided by the `ProviderManager`), executes tool logic (which might involve calling other web services or using browser features), and persists/retrieves data from the chosen storage mechanism (using the configured `StorageAdapter`).
    *   **Key Elements (Interfaces & Implementations):** Adapters (`ProviderAdapter` for LLMs, `StorageAdapter` for memory/storage), Tool Implementations (`IToolExecutor`). The actual `ProviderAdapter` instances are created and managed (pooled, cached, evicted) by the `ProviderManager` in Node 2.