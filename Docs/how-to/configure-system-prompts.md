# How-To: Configuring System Prompts in ART Framework

This guide explains how to configure and customize system prompts for your agents in the ART Framework (`v0.2.8` and later), leveraging the new hierarchical system.

## Understanding the System Prompt Layers

As detailed in the "Core Concept: System Prompt Hierarchy and Customization" document, system prompts are resolved in the following order of precedence (highest to lowest), with each level's custom prompt part (if present) being appended to the agent's internal base prompt:

1.  **Call-Level**: Via `AgentProps.options.systemPrompt`
2.  **Thread-Level**: Via `ThreadConfig.systemPrompt`
3.  **Instance-Level**: Via `ArtInstanceConfig.defaultSystemPrompt`
4.  **Agent Base Prompt**: Internal to the agent (e.g., `PESAgent.defaultSystemPrompt`)

The final system prompt is effectively: `Agent Base Prompt + "\n\n" + Highest Precedence Custom Prompt Part`.

## 1. Setting an Instance-Level Default System Prompt

This sets a default custom prompt for all agents created by a specific ART instance, unless overridden at a more specific level.

**File**: Your ART instance creation script (e.g., `main.ts`, `index.ts`)
**Property**: `defaultSystemPrompt` in `ArtInstanceConfig`

```typescript
// Example: main.ts
import { createArtInstance, ArtInstanceConfig } from '@art-framework/core'; // Adjust import path
// ... other imports

async function initializeMyAgent() {
  const config: ArtInstanceConfig = {
    storage: { type: 'memory' },
    providers: { /* ... your provider manager config ... */ },
    // ... other instance configurations ...
    defaultSystemPrompt: "You are a witty and slightly sarcastic assistant. You always try to find humor in the user's query."
  };

  const art = await createArtInstance(config);
  return art;
}

// When an agent (e.g., PESAgent) is created by this 'art' instance,
// and no thread or call-level system prompt is set, its system prompt will be:
// "You are a helpful AI assistant... (PESAgent's base)
//
// You are a witty and slightly sarcastic assistant. You always try to find humor in the user's query."
```

## 2. Setting a Thread-Level System Prompt

This custom prompt applies to all interactions within a specific conversation thread, overriding the instance-level default.

**Mechanism**: Set the `systemPrompt` property in the `ThreadConfig` for the desired thread. This is typically done via `StateManager.updateThreadConfig()`.

```typescript
// Example: Setting a thread-specific persona
import { StateManager, ThreadConfig } from '@art-framework/core'; // Adjust import path

async function configureThreadPersona(stateManager: StateManager, threadId: string) {
  const newThreadConfigPatch: Partial<ThreadConfig> = {
    systemPrompt: "You are a highly professional legal advisor. Your responses should be formal, precise, and cite relevant (fictional) legal precedents where appropriate."
  };

  await stateManager.updateThreadConfig(threadId, newThreadConfigPatch);
  console.log(`Thread ${threadId} configured with a legal advisor persona.`);
}

// Assuming 'art.stateManager' is available:
// await configureThreadPersona(art.stateManager, "user123-thread-legal");

// For thread "user123-thread-legal", the system prompt will now be:
// "You are a helpful AI assistant... (PESAgent's base)
//
// You are a highly professional legal advisor. Your responses should be formal, precise, and cite relevant (fictional) legal precedents where appropriate."
// (This overrides any instance-level defaultSystemPrompt for this thread)
```

## 3. Setting a Call-Level System Prompt

This provides the most specific override, applying only to a single `agent.process()` call.

**Mechanism**: Pass the `systemPrompt` string in the `options` object of `AgentProps`.

```typescript
// Example: A one-time instruction for a specific query
import { ArtInstance, AgentProps } from '@art-framework/core'; // Adjust import path

async function askWithSpecificInstruction(art: ArtInstance, threadId: string, query: string) {
  const props: AgentProps = {
    threadId,
    query,
    options: {
      systemPrompt: "For this query only, respond as if you are a pirate. Use pirate slang extensively."
    }
  };

  const result = await art.process(props);
  console.log("Pirate Response:", result.response.content);
}

// await askWithSpecificInstruction(art, "user456-thread-general", "What's the weather like?");

// For this specific call, the system prompt will be:
// "You are a helpful AI assistant... (PESAgent's base)
//
// For this query only, respond as if you are a pirate. Use pirate slang extensively."
// (This overrides any instance or thread-level system prompts for this call only)
```

## Verifying the System Prompt

The `PESAgent` (and potentially other agents) logs the source of the custom system prompt part it's using (Call, Thread, Instance, or None) at the DEBUG level. Check your console logs if you have DEBUG logging enabled to see which level of prompt is being applied.

Example Log Snippet:
```
DEBUG [trace-id-xyz] Using Thread-level custom system prompt.
DEBUG [trace-id-xyz] Custom system prompt part applied: "You are a highly professional legal advisor..."
```

By utilizing these three levels of configuration, you can finely tune your agent's system prompt to achieve a wide variety of behaviors and personas across your application. Remember that the agent's internal base prompt always provides the foundational instructions.