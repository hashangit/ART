# How-To: Configuring System Prompts in ART Framework

This guide explains how to configure and customize system prompts for your agents in the ART Framework (`v0.2.8` and later), leveraging the new hierarchical system.

## Understanding the System Prompt Layers

As detailed in the "Core Concept: System Prompt Hierarchy and Customization" document, system prompts are resolved in the following order of precedence (highest to lowest), with composition at each level using a merge strategy (append | prepend | replace):

1.  **Call-Level**: Via `AgentProps.options.systemPrompt` (string or `{ tag?, variables?, content?, strategy? }`)
2.  **Thread-Level**: Via `ThreadConfig.systemPrompt` (string or `{ tag?, variables?, content?, strategy? }`)
3.  **Instance-Level**: Prefer `ArtInstanceConfig.systemPrompts` registry; `defaultSystemPrompt` remains supported for backward compatibility.
4.  **Agent Base Prompt**: Internal to the agent (e.g., `PESAgent.defaultSystemPrompt`)

## Composition

Composition applies in order: base → instance override → thread override → call override, using the specified `strategy`.

## 1. Setting Instance-Level Presets (Recommended)

Define a registry of named presets at instance creation.

```typescript
// Example: main.ts
import { createArtInstance, ArtInstanceConfig } from 'art-framework';

async function initializeMyAgent() {
  const config: ArtInstanceConfig = {
    storage: { type: 'memory' },
    providers: { /* ... your provider manager config ... */ },
    systemPrompts: {
      defaultTag: 'default',
      specs: {
        default: { template: "{{fragment:pes_system_default}}\nTone: {{tone}}", defaultVariables: { tone: 'neutral' } },
        legal_advisor: { template: "You are a legal advisor. Jurisdiction: {{jurisdiction}}", defaultVariables: { jurisdiction: 'US' } }
      }
    }
  };

  const art = await createArtInstance(config);
  return art;
}
```

Legacy fallback:
- `defaultSystemPrompt: string` is still accepted and treated as `{ content, strategy: 'append' }`.

## 2. Setting a Thread-Level System Prompt

Apply a preset/tag or freeform content to a conversation thread.

```typescript
// Example: Setting a thread-specific persona
import { StateManager, ThreadConfig } from 'art-framework';

async function configureThreadPersona(stateManager: StateManager, threadId: string) {
  const newThreadConfigPatch: Partial<ThreadConfig> = {
    systemPrompt: { tag: 'legal_advisor', variables: { jurisdiction: 'EU' }, strategy: 'append' }
  };

  await stateManager.updateThreadConfig(threadId, newThreadConfigPatch);
}
```

## 3. Setting a Call-Level System Prompt

Provide a one-off override for a single call.

```typescript
import { ArtInstance, AgentProps } from 'art-framework';

async function askWithSpecificInstruction(art: ArtInstance, threadId: string, query: string) {
  const props: AgentProps = {
    threadId,
    query,
    options: {
      systemPrompt: { content: "For this query only, respond as if you are a pirate. Use pirate slang extensively.", strategy: 'append' }
    }
  };

  const result = await art.process(props);
  console.log("Pirate Response:", result.response.content);
}
```

## Verifying the System Prompt

`PESAgent` logs which level’s override was applied and composes the final system prompt using the resolver.

By using named presets (tags) with variables where possible, and freeform `content` only when needed, you get a consistent, ergonomic customization flow across instance, thread, and call levels.