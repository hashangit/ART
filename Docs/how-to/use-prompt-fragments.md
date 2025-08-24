# How-To: Use Prompt Fragments with `PromptManager`

In ART Framework `v0.2.7+`, the `PromptManager`'s role has been streamlined. Agent logic (like `PESAgent`) is directly responsible for assembling the final `ArtStandardPrompt` object (an array of `ArtStandardMessage`s). The `PromptManager` provides reusable, named **prompt fragments** via its `getFragment()` method and can **validate** assembled prompts via `validatePrompt()`.

These fragments are pre-defined pieces of text, potentially with simple template variables, that can be embedded into the `content` of your `ArtStandardMessage` objects. This promotes consistency and reduces redundancy in your prompt construction logic.

## 1. Understanding `PromptManager.getFragment()`

*   **`getFragment(name: string, context?: Record<string, any>): string`**
    *   `name`: The unique string identifier for the fragment (e.g., "common_error_handling_instructions", "tool_description_prefix").
    *   `context` (Optional): A simple key-value object. If the fragment string contains placeholders like `{{myKey}}`, they will be replaced with the corresponding value from `context.myKey`.
    *   Returns the processed fragment string.
    *   Throws an `ARTError` with `ErrorCode.PROMPT_FRAGMENT_NOT_FOUND` if the `name` doesn't exist.

## 2. Defining Prompt Fragments

Currently, prompt fragments are defined directly within `src/systems/reasoning/PromptManager.ts` in a `PROMPT_FRAGMENTS` record:

```typescript
// Inside PromptManager.ts
const PROMPT_FRAGMENTS: Record<string, string> = {
    pes_system_default: "You are a helpful AI assistant...",
    pes_planning_instructions: "Based on the user query and conversation history, identify the user's intent and create a plan...",
    pes_tool_format_instructions: "Respond in the following format:\nIntent: ...\nTool Calls: [Output *only* the JSON array...]",
    // Add your custom fragments here
    custom_greeting: "Hello, {{userName}}! Welcome to our {{appName}} service.",
    error_prefix: "I encountered an issue: {{errorMessage}}"
};
```

**To add your own fragments:**

1.  Modify this `PROMPT_FRAGMENTS` object in `PromptManager.ts` or consider a more dynamic loading mechanism if you have many fragments (though this is not built-in for `v0.2.7`).
2.  Choose a unique, descriptive name for your fragment.
3.  Write the fragment text. You can use `{{variableName}}` for simple substitutions.
4.  Optionally, after assembling your `ArtStandardPrompt`, call `promptManager.validatePrompt(prompt)` to catch structural errors early.

## 3. Using Fragments in Agent Logic (e.g., Custom Agent or `PESAgent` Customization)

The `PESAgent` (and other `IAgentCore` implementations) are injected with a `PromptManager` instance by the `AgentFactory`. You can use this instance to retrieve fragments when constructing your `ArtStandardPrompt`.

**Example: Customizing `PESAgent`'s Planning Prompt (Conceptual)**

Let's say you want to add a standard preamble to the user query part of the `PESAgent`'s planning prompt.

**Step 3.1: Define a Fragment**

Add to `PROMPT_FRAGMENTS` in `PromptManager.ts`:
```typescript
const PROMPT_FRAGMENTS: Record<string, string> = {
    // ... other fragments ...
    planning_query_preamble: "Please carefully consider the following user request and the available tools."
};
```

**Step 3.2: Use the Fragment in Agent Logic**

If you were customizing `PESAgent` (or building your own agent), you might do something like this:

```typescript
// Inside your agent's process method, when constructing the planning prompt:
// Assuming 'this.deps.promptManager' is your PromptManager instance

// ... (gathering systemPrompt, history, toolsDescription, props.query) ...

const queryPreamble = this.deps.promptManager.getFragment('planning_query_preamble');
const toolFormatInstructions = this.deps.promptManager.getFragment('pes_tool_format_instructions');

const planningUserContent = `
${queryPreamble}

User Query: ${props.query}

Available Tools:
${toolsDescription}

${toolFormatInstructions}
`;

const planningPrompt: ArtStandardPrompt = [
    { role: 'system', content: systemPrompt },
    ...formattedHistory,
    { role: 'user', content: planningUserContent.trim() }
];

// ... then send planningPrompt to reasoningEngine.call() ...
```

**Example: Using Fragments with Context Variables**

**Fragment Definition (in `PromptManager.ts`):**
```typescript
const PROMPT_FRAGMENTS: Record<string, string> = {
    // ...
    tool_specific_guideline: "When using the '{{toolName}}' tool, remember to provide the '{{requiredArg}}' argument clearly."
};
```

**Usage in Agent Logic:**
```typescript
// const toolName = "weather_forecast";
// const requiredArg = "location";
// const guideline = this.deps.promptManager.getFragment(
//     'tool_specific_guideline',
//     { toolName: toolName, requiredArg: requiredArg }
// );
// // guideline would be: "When using the 'weather_forecast' tool, remember to provide the 'location' argument clearly."

// This 'guideline' string can then be embedded into the content of an ArtStandardMessage.
```

## 4. Validating the Assembled Prompt (Optional)

After your agent logic has fully constructed the `ArtStandardPrompt` object (an array of `ArtStandardMessage`s), potentially using several fragments, you can use `PromptManager.validatePrompt()` for an extra sanity check:

```typescript
// const finalAssembledPrompt: ArtStandardPrompt = [ /* ... your messages ... */ ];
//
// try {
//   const validatedPrompt = this.deps.promptManager.validatePrompt(finalAssembledPrompt);
//   // Send validatedPrompt to ReasoningEngine
// } catch (e) {
//   // Handle prompt validation error (ARTError with ErrorCode.PROMPT_VALIDATION_FAILED)
//   Logger.error("Constructed prompt failed validation:", e);
// }
```
This validation uses Zod schemas defined in `src/types/schemas.ts`.

## Benefits of Using Fragments

*   **Consistency:** Ensures standard phrasing for common instructions or warnings across different prompts or agents.
*   **Maintainability:** If a common piece of instruction needs to change, you only need to update it in one place (the fragment definition).
*   **Readability:** Can make your agent's prompt construction logic cleaner by referencing named fragments instead of having very long inline strings.

While the `PromptManager` in ART `v0.2.7` doesn't handle full template rendering into the `ArtStandardPrompt` structure, its `getFragment()` method provides a valuable utility for managing and reusing common textual components of your prompts.