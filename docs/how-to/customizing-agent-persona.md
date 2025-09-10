# How to Customize the Agent's Persona

The ART framework provides a powerful, multi-layered system for customizing the identity and behavior of your agent. This is achieved by defining an `AgentPersona` at the instance, thread, or even individual call level, allowing for incredible flexibility.

This guide will walk you through the advanced features of agent persona customization.

## What is an Agent Persona?

The `AgentPersona` is a configuration object that defines two key aspects of your agent:

-   `name`: A string that sets the agent's identity (e.g., "Zoi", "CodeBot"). This is used in the final **synthesis** stage to instruct the LLM on who it should be.
-   `prompts`: An object containing separate system prompts for the two main stages of the agent's reasoning process:
    -   `planning`: A system prompt that guides the agent's reasoning, expertise, and tool selection.
    -   `synthesis`: A system prompt that shapes the agent's tone, formatting, and final response structure.

By separating these prompts, you can fine-tune the agent's behavior with precision. For example, you can have a highly technical and analytical prompt for planning, and a friendly, easy-to-understand prompt for synthesis.

Here is the interface definition:

```typescript
export interface AgentPersona {
  name: string;
  prompts: {
    planning?: string;
    synthesis?: string;
  };
}
```

## The Override Hierarchy

The agent's final persona is resolved using a clear hierarchy. Settings at a more specific level will always override those at a broader level:

1.  **Call-level Persona**: Defined in the `options` of an `art.process()` call. This is the most specific and will override all other settings for that single execution.
2.  **Thread-level Persona**: Defined in the `threadConfig` when a thread is created or updated. This applies to all executions within that specific conversation thread.
3.  **Instance-level Persona**: Defined in the `ArtInstanceConfig` when you create your ART instance. This is the default persona for all agents in the instance.

## How to Use Personas

### 1. Instance-Level (Default Persona)

This is the most common way to set a default character for your agent.

```typescript:main.ts
import { createArtInstance } from 'art-framework';
import type { ArtInstanceConfig, AgentPersona } from 'art-framework';

const defaultPersona: AgentPersona = {
  name: 'CodeBot',
  prompts: {
    planning: 'You are an expert software engineer. Your task is to analyze the user query and create a precise plan to solve it. Identify the best tools and functions for the job.',
    synthesis: 'You are CodeBot, a friendly and helpful coding assistant. Synthesize the results into a clear, well-formatted response with code examples.'
  }
};

const config: ArtInstanceConfig = {
  storage: { type: 'memory' },
  providers: { /* ... */ },
  persona: defaultPersona,
};

const art = await createArtInstance(config);
```

### 2. Thread-Level (Mode Switching)

You can override the persona for a specific conversation, which is great for implementing different "modes" in your application. For example, a "beginner" mode vs. an "expert" mode.

```typescript
const expertModePersona: Partial<AgentPersona> = {
  prompts: {
    synthesis: 'You are CodeBot, speaking to an expert user. Be concise, technical, and skip the introductory explanations.'
  }
};

const result = await art.process({
  query: 'Implement a binary search tree in Rust.',
  threadId: 'expert-thread-1',
  threadConfig: {
    providerConfig: { /* ... */ },
    persona: expertModePersona,
  },
});
```

In this example, the agent will still use the `name` ("CodeBot") and the `planning` prompt from the instance-level persona, but it will use the new, more direct `synthesis` prompt for the final response.

### 3. Call-Level (Dynamic, One-Time Changes)

For ultimate flexibility, you can change the persona for a single call. This is useful for one-off requests where you need a very specific behavior.

```typescript
const oneTimePersona: Partial<AgentPersona> = {
  name: 'SecurityAnalyst',
  prompts: {
    planning: 'You are a security analyst. Analyze the following code for potential vulnerabilities. Focus on injection attacks and improper error handling.',
  }
};

const result = await art.process({
  query: 'Review this login function for security issues: `...`',
  threadId: 'expert-thread-1',
  options: {
    persona: oneTimePersona,
  }
});
```

In this case, for this single execution:
-   The agent's name will be **"SecurityAnalyst"**.
-   It will use the specialized `planning` prompt.
-   It will fall back to the thread-level `synthesis` prompt ("Be concise, technical...").

By combining these three levels, you have complete control over your agent's identity and behavior, allowing you to create dynamic, context-aware, and highly specialized AI applications.
