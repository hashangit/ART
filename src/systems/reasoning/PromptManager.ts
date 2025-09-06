// src/systems/reasoning/PromptManager.ts
import { PromptManager as PromptManagerInterface } from '@/core/interfaces';
import { ArtStandardPrompt, PromptBlueprint, PromptContext } from '@/types';
import { ArtStandardPromptSchema } from '@/types/schemas'; // Import Zod schema (Reverted - trying this path again)
import { ARTError, ErrorCode } from '@/errors';
import { Logger } from '@/utils/logger';
import { ZodError } from 'zod'; // Import ZodError for type checking
import mustache from 'mustache';

// --- Define Prompt Fragments ---
// Store fragments in a simple object for now. Could be loaded from files later.
const PROMPT_FRAGMENTS: Record<string, string> = {
    // PES Agent Fragments
    pes_system_default: `You are a helpful AI assistant. You need to understand a user's query, potentially use tools to gather information, and then synthesize a final response.`,
    pes_planning_instructions: `Based on the user query and conversation history, identify the user's intent and create a plan to fulfill it using the available tools if necessary.`,
    pes_tool_format_instructions: `Respond in the following format:\nIntent: [Briefly describe the user's goal]\nPlan: [Provide a step-by-step plan. If tools are needed, list them clearly.]\nTool Calls: [Output *only* the JSON array of tool calls required by the assistant, matching the ArtStandardMessage tool_calls format: [{\\"id\\": \\"call_abc123\\", \\"type\\": \\"function\\", \\"function\\": {\\"name\\": \\"tool_name\\", \\"arguments\\": \\"{\\\\\\"arg1\\\\\\": \\\\\\"value1\\\\\\"}\\"}}] or [] if no tools are needed. Do not add any other text in this section.]`,
    pes_synthesis_instructions: `Based on the user query, the plan, and the results of any tool executions, synthesize a final response to the user.\nIf the tools failed or provided unexpected results, explain the issue and try to answer based on available information or ask for clarification.`,
    // Add other common fragments as needed
};
// -----------------------------

/**
 * Implements the PromptManager interface for the hybrid approach.
 * Provides named prompt fragments and validates prompt objects.
 */
export class PromptManager implements PromptManagerInterface {

    // No constructor needed for this simple implementation

    /**
     * Retrieves a named prompt fragment.
     * Basic substitution using {{key}} is supported via context.
     *
     * @param name - The unique identifier for the fragment.
     * @param context - Optional data for simple variable substitution.
     * @returns The processed prompt fragment string.
     * @throws {ARTError} If the fragment is not found.
     */
    getFragment(name: string, context?: Record<string, any>): string {
        const fragment = PROMPT_FRAGMENTS[name];
        if (fragment === undefined) {
            Logger.error(`[PromptManager] Prompt fragment not found: ${name}`);
            throw new ARTError(`Prompt fragment not found: ${name}`, ErrorCode.PROMPT_FRAGMENT_NOT_FOUND);
        }

        // Basic substitution (replace {{key}} with context[key])
        if (context) {
            return fragment.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const trimmedKey = key.trim();
                const value = context[trimmedKey];
                // Return value if found, otherwise keep the original {{key}}
                return value !== undefined ? String(value) : match;
            });
        }

        return fragment;
    }

    /**
     * Validates a constructed prompt object against the standard schema.
     *
     * @param prompt - The ArtStandardPrompt object constructed by the agent.
     * @returns The validated prompt object (potentially after normalization if the schema does that).
     * @throws {ARTError} If validation fails (can be caught and wrapped in ARTError).
     */
    validatePrompt(prompt: ArtStandardPrompt): ArtStandardPrompt {
        try {
            // Use parse, which throws on failure
            const validatedPrompt = ArtStandardPromptSchema.parse(prompt);
            return validatedPrompt;
        } catch (error: any) {
            if (error instanceof ZodError) {
                Logger.error(`[PromptManager] Prompt validation failed:`, error.errors);
                throw new ARTError(
                    `Constructed prompt failed validation: ${error.message}`,
                    ErrorCode.PROMPT_VALIDATION_FAILED,
                    error // Include Zod error details
                );
            }
            // Wrap unexpected errors
            Logger.error(`[PromptManager] Unexpected error during prompt validation:`, error);
            throw new ARTError(
                `Unexpected error during prompt validation: ${error.message}`,
                ErrorCode.PROMPT_VALIDATION_FAILED, // Use same code for now
                error
            );
        }
    }

    /**
     * Assembles a prompt using a Mustache template (blueprint) and context data.
     * Renders the template with the provided context and parses the result as an ArtStandardPrompt.
     *
     * @param blueprint - The Mustache template containing the prompt structure.
     * @param context - The context data to inject into the template.
     * @returns A promise resolving to the assembled ArtStandardPrompt.
     * @throws {ARTError} If template rendering or JSON parsing fails.
     */
    async assemblePrompt(blueprint: PromptBlueprint, context: PromptContext): Promise<ArtStandardPrompt> {
        try {
            // Render the Mustache template with the context
            const renderedTemplate = mustache.render(blueprint.template, context);
            
            // Parse the rendered template as JSON
            let parsedPrompt: any;
            try {
                parsedPrompt = JSON.parse(renderedTemplate);
            } catch (parseError: any) {
                Logger.error(`[PromptManager] Failed to parse rendered template as JSON:`, parseError);
                throw new ARTError(
                    `Failed to parse rendered template as JSON: ${parseError.message}`,
                    ErrorCode.PROMPT_ASSEMBLY_FAILED,
                    parseError
                );
            }

            // Ensure the parsed result is an array
            if (!Array.isArray(parsedPrompt)) {
                Logger.error(`[PromptManager] Rendered template is not an array:`, parsedPrompt);
                throw new ARTError(
                    `Rendered template is not an array: ${typeof parsedPrompt}`,
                    ErrorCode.PROMPT_ASSEMBLY_FAILED
                );
            }

            // Return the assembled prompt (cast to ArtStandardPrompt)
            return parsedPrompt as ArtStandardPrompt;
            
        } catch (error: any) {
            // If it's already an ARTError, re-throw it
            if (error instanceof ARTError) {
                throw error;
            }
            
            // Otherwise, wrap in ARTError
            Logger.error(`[PromptManager] Failed to render prompt template:`, error);
            throw new ARTError(
                `Failed to render prompt template: ${error.message}`,
                ErrorCode.PROMPT_ASSEMBLY_FAILED,
                error
            );
        }
    }
}