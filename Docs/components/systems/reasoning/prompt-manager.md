# Deep Dive: `PromptManager`

In ART Framework `v0.2.7`, the `PromptManager` serves a more focused role compared to traditional template-based prompt management systems. Its primary responsibilities are to provide access to pre-defined **prompt fragments** and to **validate** fully constructed `ArtStandardPrompt` objects. The actual assembly of the `ArtStandardPrompt` (the array of `ArtStandardMessage` objects) is now handled directly by the agent logic (e.g., within `PESAgent`).

*   **Source:** `src/systems/reasoning/PromptManager.ts`
*   **Implements:** `PromptManager` interface from `src/core/interfaces.ts`

## Core Responsibilities & Methods

1.  **Providing Prompt Fragments:**
    *   **`getFragment(name: string, context?: Record<string, any>): string`**
        *   **Purpose:** To retrieve named, reusable pieces of text that can be incorporated into prompts.
        *   **Process:**
            1.  Looks up the `name` in an internal `PROMPT_FRAGMENTS` record (a simple key-value store of strings defined within `PromptManager.ts`).
            2.  If the fragment is not found, it throws an `ARTError` with `ErrorCode.PROMPT_FRAGMENT_NOT_FOUND`.
            3.  **Basic Substitution:** If a `context` object is provided, the method performs a simple string replacement for placeholders like `{{key}}` within the fragment string, using corresponding values from the `context`. If a key in a placeholder is not found in the `context`, the placeholder remains in the string.
            4.  Returns the processed fragment string.
        *   **Example Fragments (Conceptual, in `PromptManager.ts`):**
            ```typescript
            const PROMPT_FRAGMENTS: Record<string, string> = {
                pes_system_default: "You are a helpful AI assistant...",
                pes_planning_instructions: "Based on the user query...",
                common_tool_format: "Tool Calls: [Output *only* the JSON array...]"
            };
            ```
        *   **Usage by Agent Logic:**
            ```typescript
            // In PESAgent or custom agent logic
            // const systemInstruction = this.deps.promptManager.getFragment('pes_system_default');
            // const planningUserContent = `
            //   ${this.deps.promptManager.getFragment('pes_planning_instructions')}
            //   User Query: ${props.query}
            //   Available Tools: ${toolsDescription}
            //   ${this.deps.promptManager.getFragment('common_tool_format')}
            // `;
            //
            // const planningPrompt: ArtStandardPrompt = [
            //   { role: 'system', content: systemInstruction },
            //   // ... history messages ...
            //   { role: 'user', content: planningUserContent }
            // ];
            ```

2.  **Validating `ArtStandardPrompt` Objects:**
    *   **`validatePrompt(prompt: ArtStandardPrompt): ArtStandardPrompt`**
        *   **Purpose:** To ensure that a fully assembled `ArtStandardPrompt` object (an array of `ArtStandardMessage` objects) conforms to the expected structure and types defined by the Zod schema (`ArtStandardPromptSchema` from `src/types/schemas.ts`).
        *   **Process:**
            1.  Uses `ArtStandardPromptSchema.parse(prompt)`. The `parse` method from Zod will throw a `ZodError` if validation fails.
            2.  If validation is successful, it returns the (potentially normalized by Zod) `prompt` object.
            3.  If validation fails (a `ZodError` is thrown):
                *   Logs the detailed Zod errors.
                *   Throws an `ARTError` with `ErrorCode.PROMPT_VALIDATION_FAILED`, including the original `ZodError` for context.
        *   **Usage by Agent Logic:** After agent logic has constructed the complete `ArtStandardPrompt` object, it can optionally call this method for an extra layer of validation before sending it to the `ReasoningEngine`.
            ```typescript
            // In PESAgent or custom agent logic, after constructing 'myAssembledPrompt'
            // try {
            //   const validatedPrompt = this.deps.promptManager.validatePrompt(myAssembledPrompt);
            //   // ... send validatedPrompt to ReasoningEngine ...
            // } catch (validationError) {
            //   // Handle prompt validation failure
            // }
            ```

## Shift in Responsibility for Prompt Assembly

In earlier design concepts or other frameworks, a `PromptManager` might be responsible for taking a template name and a large context object, and then rendering a complete, complex prompt.

In ART `v0.2.7`, this responsibility is shifted:

*   **Agent Logic (e.g., `PESAgent`)** is responsible for the **assembly** of the `ArtStandardPrompt` object. This means the agent code itself defines the sequence of `ArtStandardMessage`s and constructs their `role` and `content` fields. This approach offers greater flexibility and direct control over the prompt structure within the agent's specific workflow (like the distinct planning and synthesis phases of `PESAgent`).
*   **`PromptManager`** acts as a **utility** to:
    *   Provide reusable text **fragments** that the agent logic can embed into the `content` of the messages it creates.
    *   Offer a **validation** step for the finally assembled `ArtStandardPrompt` object against a standard schema.

This division of labor keeps the `PromptManager` relatively simple and stateless, while empowering the agent logic with full control over the crucial process of prompt construction tailored to its operational phase and the LLM's requirements.