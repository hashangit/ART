// src/types/schemas.ts
import { z } from 'zod';
import { ArtStandardMessageRole } from './index'; // Import role type from main types

/**
 * Zod schema for validating a single ArtStandardMessage object.
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
 * Zod schema for validating an entire ArtStandardPrompt (an array of messages).
 */
export const ArtStandardPromptSchema = z.array(ArtStandardMessageSchema);