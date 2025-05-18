# Core Concept: System Prompt Hierarchy and Customization

The ART Framework (`v0.2.8` and later) provides a flexible and layered approach to defining the system prompt used by agents like `PESAgent`. This allows for a base level of instruction inherent to the agent, with multiple levels of customization to tailor the agent's persona, behavior, and domain-specific knowledge for different instances, threads, or even individual calls.

## The System Prompt Hierarchy

The final system prompt an agent uses is constructed by combining a **base agent prompt** with a **custom prompt part**. The custom part is resolved through a specific hierarchy:

1.  **Call-Level Custom Prompt**: Defined in `AgentProps.options.systemPrompt`. This has the highest precedence and overrides any other custom prompts for a single `agent.process()` call.
    *   **Use Case**: Temporarily altering agent behavior for a specific query, A/B testing different personas, or injecting highly specific, short-lived instructions.

2.  **Thread-Level Custom Prompt**: Defined in `ThreadConfig.systemPrompt`. This applies to all interactions within a specific conversation thread if no call-level prompt is provided.
    *   **Use Case**: Defining a consistent persona or set of instructions for an entire conversation (e.g., "You are a financial advisor specializing in stocks" for thread A, and "You are a travel agent specializing in European destinations" for thread B).

3.  **Instance-Level Custom Prompt**: Defined in `ArtInstanceConfig.defaultSystemPrompt`. This serves as the default custom prompt for the entire ART instance if no thread-level or call-level prompt is specified.
    *   **Use Case**: Setting a global default persona or instruction set for all agents created by this ART instance, unless overridden at a more specific level.

4.  **Agent Base Prompt**: This is an internal, hardcoded prompt within the agent implementation itself (e.g., `PESAgent.defaultSystemPrompt`). It provides the fundamental operational instructions for the agent (e.g., "You are a helpful AI assistant. You need to understand a user's query...").
    *   **Purpose**: Ensures the agent always has its core behavioral guidelines, regardless of customization.

## Concatenation Logic

The `finalSystemPrompt` is constructed as follows:

```
finalSystemPrompt = Agent Base Prompt + (Resolved Custom Prompt Part ? "\n\n" + Resolved Custom Prompt Part : "")
```

*   The **Agent Base Prompt** is always included.
*   If a **Custom Prompt Part** is resolved from any of the hierarchy levels (Call, Thread, or Instance), it is appended to the Agent Base Prompt, typically separated by a double newline (`\n\n`) for clarity.
*   If no custom prompt is found at any level, only the Agent Base Prompt is used.

## How It Works in `PESAgent`

1.  **Base Prompt**: `PESAgent` has an internal `this.defaultSystemPrompt` (e.g., "You are a helpful AI assistant...").
2.  **Custom Part Resolution**:
    *   It first checks `props.options.systemPrompt` (Call-level).
    *   If not found, it checks `ThreadConfig.systemPrompt` (retrieved via `StateManager.getThreadConfigValue()`).
    *   If not found, it checks `this.instanceDefaultCustomSystemPrompt` (passed from `ArtInstanceConfig` via `AgentFactory` during agent instantiation).
3.  **Combination**: The resolved custom part (if any) is appended to the base prompt.
4.  **Usage**: This `finalSystemPrompt` is then used as the content for the `{ role: 'system', ... }` message in the `ArtStandardPrompt` sent to the `ReasoningEngine`.

## Benefits

*   **Flexibility**: Tailor agent behavior at multiple granularities.
*   **Consistency**: Maintain core agent functionality via the base prompt.
*   **Overrides**: Higher-level prompts cleanly override lower-level ones.
*   **Clear Separation**: Distinguishes between fundamental agent instructions and customizable persona/domain instructions.

This hierarchical system provides developers with powerful control over system prompts, enabling a wide range of applications and agent behaviors within the ART Framework.