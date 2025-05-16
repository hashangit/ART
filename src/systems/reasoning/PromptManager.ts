// src/systems/reasoning/PromptManager.ts
import { PromptManager as PromptManagerInterface } from '../../core/interfaces';
import { ArtStandardPrompt } from '../../types';
import { ArtStandardPromptSchema } from '../../types/schemas'; // Import Zod schema (Reverted - trying this path again)
import { ARTError, ErrorCode } from '../../errors';
import { Logger } from '../../utils/logger';
import { ZodError } from 'zod'; // Import ZodError for type checking

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
     * @returns The validated prompt object.
     * @throws {ARTError} If validation fails.
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
}