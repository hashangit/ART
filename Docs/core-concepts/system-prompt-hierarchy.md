### System Prompt Hierarchy and Merge Strategy

ART composes the final system prompt from multiple levels:
- Instance-level default (optional)
- Thread-level override (optional)
- Call-level override (optional)

Merge strategy is append/prepend only. The 'replace' strategy is intentionally not supported to avoid overriding framework-required structural contracts.

During the planning phase, custom prompts are wrapped in a protective block by the agent to ensure:
- The custom guidance shapes knowledge, tone, and domain context.
- It cannot alter the required planning Output Contract structure (Intent, Plan, Tool Calls with strict JSON schema).

Developers can still use rigid formatting in the synthesis phase for the final user-facing response. In planning, the agent wraps the custom system prompt in a protective block so that guidance influences content/perspective but cannot modify the Output Contract.
# Core Concept: System Prompt Hierarchy and Customization

The ART Framework (`v0.2.8` and later) provides a flexible and layered approach to defining the system prompt used by agents like `PESAgent`. This allows for a base level of instruction inherent to the agent, with multiple levels of customization to tailor the agent's persona, behavior, and domain-specific knowledge for different instances, threads, or even individual calls.

## The System Prompt Hierarchy

The final system prompt an agent uses is constructed by combining a **base agent prompt** with standardized **overrides** (tag + variables + strategy). Overrides are resolved through a specific hierarchy:

1.  **Call-Level Override**: `AgentProps.options.systemPrompt` accepts either a string or `{ tag?, variables?, content?, strategy? }`. Highest precedence.
    *   **Use Case**: Temporarily altering agent behavior for a specific query, A/B testing different personas, or injecting highly specific, short-lived instructions.

2.  **Thread-Level Override**: `ThreadConfig.systemPrompt` accepts either a string or `{ tag?, variables?, content?, strategy? }`.
    *   **Use Case**: Defining a consistent persona or set of instructions for an entire conversation (e.g., "You are a financial advisor specializing in stocks" for thread A, and "You are a travel agent specializing in European destinations" for thread B).

3.  **Instance-Level Override**: Prefer the registry in `ArtInstanceConfig.systemPrompts` (see below). The legacy `defaultSystemPrompt` string is still supported for backward compatibility and is treated as `{ content, strategy: 'append' }`.
    *   **Use Case**: Setting a global default persona or instruction set for all agents created by this ART instance, unless overridden at a more specific level.

4.  **Agent Base Prompt**: This is an internal, hardcoded prompt within the agent implementation itself (e.g., `PESAgent.defaultSystemPrompt`). It provides the fundamental operational instructions for the agent (e.g., "You are a helpful AI assistant. You need to understand a user's query...").
    *   **Purpose**: Ensures the agent always has its core behavioral guidelines, regardless of customization.

## Composition Logic

The `finalSystemPrompt` is constructed as follows:

```
finalSystemPrompt = compose(Agent Base Prompt, instanceOverride) -> compose(..., threadOverride) -> compose(..., callOverride)
```

*   The **Agent Base Prompt** is always included.
*   At each level, `strategy` (append | prepend | replace) controls how the override combines with the previous result.
*   Overrides can specify a `tag` (lookup in registry), `variables` for template substitution, or freeform `content`.

## How It Works in `PESAgent`

1.  **Base Prompt**: `PESAgent` has an internal `this.defaultSystemPrompt` (e.g., "You are a helpful AI assistant...").
2.  **Custom Part Resolution**:
    *   It first checks `props.options.systemPrompt` (Call-level).
    *   If not found, it checks `ThreadConfig.systemPrompt` (retrieved via `StateManager.getThreadConfigValue()`).
    *   If not found, it checks `this.instanceDefaultCustomSystemPrompt` (passed from `ArtInstanceConfig` via `AgentFactory` during agent instantiation).
3.  **Combination**: `SystemPromptResolver` combines base + instance/thread/call overrides using strategy rules.
4.  **Usage**: This `finalSystemPrompt` is then used as the content for the `{ role: 'system', ... }` message in the `ArtStandardPrompt` sent to the `ReasoningEngine`.

## Benefits

*   **Flexibility**: Tailor agent behavior at multiple granularities.
*   **Consistency**: Maintain core agent functionality via the base prompt.
*   **Overrides**: Higher-level overrides cleanly compose over lower ones via strategy.
*   **Ergonomics**: Consistent shape (tag + variables + strategy) at every level; string remains supported.

## Instance Registry (Recommended)

Configure named presets at instance creation time:

```ts
const art = await createArtInstance({
  storage: { type: 'memory' },
  providers: { availableProviders: [/* ... */] },
  systemPrompts: {
    defaultTag: 'default',
    specs: {
      default: { template: "{{fragment:pes_system_default}}\nTone: {{tone}}", defaultVariables: { tone: 'neutral' } },
      legal_advisor: { template: "You are a legal advisor. Jurisdiction: {{jurisdiction}}", defaultVariables: { jurisdiction: 'US' }, mergeStrategy: 'append' }
    }
  }
});
```

Then specify overrides at thread or call time:

```ts
await art.stateManager.updateThreadConfig(threadId, {
  systemPrompt: { tag: 'legal_advisor', variables: { jurisdiction: 'EU' }, strategy: 'append' }
});

const res = await art.process({
  threadId,
  query,
  options: { systemPrompt: { tag: 'default', variables: { tone: 'friendly' } } }
});
```
*   **Clear Separation**: Distinguishes between fundamental agent instructions and customizable persona/domain instructions.

This hierarchical system provides developers with powerful control over system prompts, enabling a wide range of applications and agent behaviors within the ART Framework.