/**
 * @module types/schemas
 * @description This module defines Zod schemas for validating the core data structures of the ART framework,
 * particularly the standardized prompt and message formats. These schemas ensure data integrity and consistency
 * when creating and processing prompts.
 *
 * @see {@link ArtStandardMessage} for the interface being validated.
 * @see {@link ArtStandardPrompt} for the array structure being validated.
 */
import { z } from 'zod';
import { ArtStandardMessageRole } from '@/types'; // Import role type from main types

/**
 * Zod schema for validating a single {@link ArtStandardMessage} object.
 *
 * @remarks
 * This schema enforces the structural and type requirements for each message, including:
 * - A valid `role` from the {@link ArtStandardMessageRole} enum.
 * - `content` that matches the expected type for a given role (e.g., string for 'user', string or null for 'assistant').
 * - The presence of `tool_call_id` for 'tool' or 'tool_result' roles.
 * - The structure of `tool_calls` when present in an 'assistant' message.
 *
 * It uses a `.refine()` method to implement context-aware validation based on the message's `role`.
 */
export const ArtStandardMessageSchema = z.object({
  role: z.custom<ArtStandardMessageRole>((val) => {
      // Basic check, refine if needed based on actual ArtStandardMessageRole definition
      // Ensure all roles from ArtStandardMessageRole are included here
      return typeof val === 'string' && ['system', 'user', 'assistant', 'tool', 'tool_request', 'tool_result'].includes(val);
  }, { message: "Invalid message role" }),
  // Define content explicitly matching 'string | object | null' from interface
  content: z.union([z.string(), z.record(z.any()), z.null()]),
  name: z.string().optional(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(), // Arguments are expected to be a stringified JSON
    }),
  })).optional(),
  tool_call_id: z.string().optional(),
}).strict().refine(data => {
    // Role-specific validation logic:
    if (data.role === 'tool' || data.role === 'tool_result') { // 'tool' is the standard, 'tool_result' might be used internally
        if (!data.tool_call_id) return false; // tool_call_id is required for tool role
        // Content for tool role should ideally be a string (stringified result)
        // if (typeof data.content !== 'string') return false; // Uncomment for stricter validation
    }
    if (data.role === 'assistant') {
        // Assistant content should be string or null (if only making tool calls)
        if (data.content !== null && typeof data.content !== 'string') return false;
        // If content is null/empty, tool_calls should ideally exist (though not strictly enforced here)
    }
    if (data.role === 'user' || data.role === 'system') {
        // User/System content must be a string
        if (typeof data.content !== 'string') return false;
    }
    // 'tool_request' role might not be used directly, validation TBD if needed.

    return true;
}, {
    message: "Invalid message structure based on role (e.g., tool_call_id missing for tool role, invalid content type for user/system, assistant content not string/null)",
    // path: ['role', 'content', 'tool_call_id'], // Optional: Specify path for better error reporting
});


/**
 * Zod schema for validating an entire {@link ArtStandardPrompt} (an array of messages).
 *
 * @remarks
 * This is a straightforward array schema that applies the {@link ArtStandardMessageSchema} to each element,
 * ensuring that every message in the prompt conforms to the required structure.
 */
export const ArtStandardPromptSchema = z.array(ArtStandardMessageSchema);