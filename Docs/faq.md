# Frequently Asked Questions (FAQ)

This FAQ aims to answer common questions about the ART Framework.

## General

**Q1: What is the ART Framework?**
A: ART (Agent-Reasoning-Tooling) is a TypeScript library for building sophisticated AI agents. It provides a modular architecture for agents that can reason using LLMs, use tools, manage context, and interact with users.

**Q2: Who is ART for?**
A: It's for developers building AI applications that require complex orchestration, interaction with external systems (via tools), and the flexibility to use different LLM providers.

**Q3: What are the main benefits of using ART?**
A: Key benefits include structured agent development (e.g., `PESAgent`), modularity, LLM provider agnosticism (`ProviderManager`), standardized prompt and event formats (`ArtStandardPrompt`, `StreamEvent`), robust tool integration, configurable state/history management, and built-in observability.

## Configuration & Setup

**Q4: How do I configure which LLM provider and model to use?**
A: This is done in two parts:
    1.  **`ArtInstanceConfig.providers.availableProviders`**: Define all potential provider setups (e.g., OpenAI, Anthropic, Ollama) with unique names and their adapter classes when you call `createArtInstance`.
    2.  **`AgentProps.options.providerConfig`**: For each call to `art.process()`, you pass a `RuntimeProviderConfig` object. This object specifies the `providerName` (from your `availableProviders` list), the `modelId` (e.g., "gpt-4o-mini", "claude-3-haiku"), and `adapterOptions` (like the API key for that provider).
    This allows dynamic selection of LLMs per call. A default `providerConfig` can also be set at the thread level in `ThreadConfig`.

**Q5: How do I manage API keys securely?**
A: **Never hardcode API keys.** Use environment variables (e.g., `process.env.OPENAI_API_KEY`) for local development and server-side applications. For production, use secrets management services (AWS Secrets Manager, Azure Key Vault, etc.). If your ART agent runs client-side, proxy LLM calls through your own backend where keys are stored securely. API keys are passed at runtime via `RuntimeProviderConfig.adapterOptions.apiKey`.

**Q6: What's the difference between `InMemoryStorageAdapter` and `IndexedDBStorageAdapter`?**
A:
    *   `InMemoryStorageAdapter`: Stores data (conversation history, state) in memory. Data is lost when the application session ends. Good for testing, demos, or ephemeral agents.
    *   `IndexedDBStorageAdapter`: Uses the browser's IndexedDB to persist data across sessions. Suitable for web applications needing to remember history or state.

## Agents & Logic

**Q7: What is `PESAgent`?**
A: `PESAgent` is the default agent core implementation in ART. It follows a Plan-Execute-Synthesize flow:
    1.  **Plan:** Understands the query, creates a plan, and identifies tools.
    2.  **Execute:** Runs any identified tools.
    3.  **Synthesize:** Generates a final response using the query, plan, and tool results.

**Q8: Can I create my own agent logic instead of using `PESAgent`?**
A: Yes. You can create a class that implements the `IAgentCore` interface and provide it in `ArtInstanceConfig.agentCore`. See [How-To: Create a Custom Agent Core](create-custom-agent.md).

**Q9: How does `PESAgent` decide which tools to use?**
A: During its planning phase, `PESAgent` constructs a prompt for the LLM that includes descriptions of the available (and enabled for the thread) tools from their `ToolSchema` (name, description, input schema). The LLM then decides if any tools are needed and specifies which ones to call and with what arguments in its response. The `OutputParser` extracts these tool call requests.

## Prompts & LLMs

**Q10: What is `ArtStandardPrompt`?**
A: It's ART's standardized, provider-agnostic format for representing a sequence of messages to be sent to an LLM. It's an array of `ArtStandardMessage` objects, each having a `role` (system, user, assistant, tool_result), `content`, and optional tool-related fields. `ProviderAdapter`s translate this into the native format of their target LLM API. See [Core Concept: ArtStandardPrompt](art-standard-prompt.md).

**Q11: How does the `PromptManager` work in v0.2.7?**
A: The `PromptManager` primarily provides:
    1.  `getFragment(name, context?)`: Retrieves pre-defined text pieces (fragments) which can be used by agent logic (like `PESAgent`) when *it* constructs the `ArtStandardPrompt` messages.
    2.  `validatePrompt(prompt)`: Validates a fully constructed `ArtStandardPrompt` object against a Zod schema.
    The agent logic itself is responsible for assembling the `ArtStandardPrompt` array.

**Q12: How does streaming work? What are `StreamEvent`s?**
A: When `CallOptions.stream: true` is set, `ProviderAdapter`s return an `AsyncIterable<StreamEvent>`. A `StreamEvent` can be of type `TOKEN` (a chunk of text), `METADATA` (LLM call info), `ERROR`, or `END`. This allows UIs to display responses token by token. See [Core Concept: Streaming & StreamEvents](streaming-and-streamevents.md).

## Tools

**Q13: How do I create a custom tool?**
A: Create a class that implements `IToolExecutor`. Define its `schema` (name, description, JSON Schema for input/output) and implement the `async execute(input, context)` method with your tool's logic. Register an instance of your tool in `ArtInstanceConfig.tools`. See [How-To: Define and Use Tools](define-tools.md).

**Q14: How are tool input arguments validated?**
A: The `ToolSystem` automatically validates the arguments provided by the LLM (in a `ParsedToolCall`) against your tool's `ToolSchema.inputSchema` (using `validateJsonSchema` which relies on Ajv) *before* calling your tool's `execute` method.

## State Management

**Q15: What's the difference between `StateSavingStrategy` 'explicit' and 'implicit'?**
A: This setting in `ArtInstanceConfig` controls how `AgentState` is saved by `StateManager`:
    *   `'explicit'` (default): `AgentState` is only saved if your agent logic explicitly calls `stateManager.setAgentState()`.
    *   `'implicit'`: `StateManager.loadThreadContext()` caches the loaded state. If the agent modifies this cached state, `stateManager.saveStateIfModified()` (called by `PESAgent` at the end of a cycle) will automatically save the changes.
    See [How-To: Manage Agent State](manage-agent-state.md).

## Troubleshooting

**Q16: My agent isn't using tools as expected. What should I check?**
A:
    1.  **Tool Registration:** Is an instance of your tool included in `ArtInstanceConfig.tools`?
    2.  **Tool Enablement:** If using `ThreadConfig.enabledTools`, is your tool listed for the current thread?
    3.  **Tool Schema Description:** Is `ToolSchema.description` clear and compelling enough for the LLM to understand when to use the tool? Does `ToolSchema.inputSchema` accurately describe the arguments?
    4.  **Planning Prompt:** Log the full planning prompt sent to the LLM. Does it correctly include the tool's description and schema?
    5.  **LLM Output (Planning):** Log the raw output from the LLM's planning phase. Is it attempting to call the tool? Is the "Tool Calls:" JSON format correct? The `OutputParser` logs warnings/errors if it can't parse this.
    6.  **Observations:** Check `TOOL_CALL` and `TOOL_EXECUTION` observations. `TOOL_EXECUTION` will show if validation failed or if the tool's `execute` method threw an error.
    7.  **LLM Model:** Some smaller or less capable models struggle with complex tool use or adhering to specific JSON output formats. Try a more capable model (e.g., GPT-4o, Claude 3 Sonnet/Opus).

**Q17: I'm getting errors related to `providerConfig` or "Unknown provider".**
A:
    1.  Ensure that for every `art.process()` call, `AgentProps.options.providerConfig` is correctly set OR that a default `providerConfig` is set in the `ThreadConfig` for that `threadId`.
    2.  The `providerConfig.providerName` must exactly match one of the `name`s you defined in `ArtInstanceConfig.providers.availableProviders`.
    3.  The `providerConfig.adapterOptions` must include any required options for that adapter (especially `apiKey` for cloud providers).

*(This FAQ will be expanded as more common questions arise.)*