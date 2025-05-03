// src/systems/reasoning/PromptManager.ts
import Mustache from 'mustache';
import { z } from 'zod';
import {
  ArtStandardPrompt,
  PromptContext,
} from '../../types';
import { PromptManager as PromptManagerInterface } from '../../core/interfaces';
import { ARTError, ErrorCode } from '../../errors';
import { Logger } from '../../utils/logger';

// Define Zod schemas for validation (same as before)
const ArtStandardMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  name: z.string().optional(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
  tool_call_id: z.string().optional(),
}).strict();

const ArtStandardPromptSchema = z.array(ArtStandardMessageSchema);

/**
 * Custom Mustache escape function for JSON strings.
 * Escapes backslashes and double quotes.
 * @param text The raw text to escape.
 * @returns The JSON-escaped string.
 */
function escapeJsonString(text: any): string {
    const str = String(text);
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}


/**
 * Stateless implementation of the `PromptManager` interface using Mustache.js.
 * Assembles a provider-agnostic `ArtStandardPrompt` based on a Mustache blueprint
 * string and a `PromptContext` object provided by the agent logic.
 * Uses a custom JSON string escape function.
 *
 * @implements {PromptManagerInterface}
 * @see {PromptContext}
 * @see {ArtStandardPrompt}
 */
export class PromptManager implements PromptManagerInterface {
  /**
   * Assembles a standardized prompt using a Mustache blueprint and context data.
   * The blueprint is expected to render directly into a JSON string representing
   * the `ArtStandardPrompt` array structure. Assumes {{{ }}} is used for all
   * string variable insertions within the JSON structure.
   *
   * @param {string} blueprint - The Mustache template string. Should use {{{variable}}} for string insertions.
   * @param {PromptContext} context - An object containing the data to be injected into the Mustache blueprint.
   * @returns {Promise<ArtStandardPrompt>} A promise resolving to the assembled `ArtStandardPrompt`.
   * @throws {ARTError} If rendering or parsing fails.
   */
  async assemblePrompt(
    blueprint: string,
    context: PromptContext,
  ): Promise<ArtStandardPrompt> {
    try {
      // Define render options with the custom escape function
      const renderOptions = {
        escape: escapeJsonString
      };

      // Render the blueprint using the custom JSON escape function via options
      // This applies the escape function specifically to {{variable}} tags for this call only.
      const renderedJsonString = Mustache.render(
        blueprint,
        context,
        undefined, // No partials
        renderOptions // Pass options with custom escape function
      );

      // --- Rest of the function remains the same ---

      // Pre-Parsing Check
      const trimmedRenderedJson = renderedJsonString.trim();
      if (!trimmedRenderedJson.startsWith('{') && !trimmedRenderedJson.startsWith('[')) {
          Logger.error("Rendered blueprint did not produce a string starting with '{' or '['.", {
              output: trimmedRenderedJson.substring(0, 500) + (trimmedRenderedJson.length > 500 ? '...' : ''),
              contextKeys: Object.keys(context)
          });
          throw new ARTError(
              'Rendered template does not appear to be valid JSON.',
              ErrorCode.PROMPT_ASSEMBLY_FAILED
          );
      }

      // Parse and Validate
      try {
        const potentialPrompt = JSON.parse(trimmedRenderedJson);
        const validatedPrompt = ArtStandardPromptSchema.parse(potentialPrompt);
        return validatedPrompt;

      } catch (validationOrParseError: any) {
        const isZodError = validationOrParseError instanceof z.ZodError;
        const errorMessage = isZodError
          ? `Rendered prompt failed Zod validation: ${validationOrParseError.errors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          : `Failed to parse rendered blueprint into JSON: ${validationOrParseError.message}`;

        Logger.error("Failed to parse or validate rendered prompt JSON.", {
            error: errorMessage,
            isZodError: isZodError,
            output: trimmedRenderedJson.substring(0, 500) + (trimmedRenderedJson.length > 500 ? '...' : ''),
            contextKeys: Object.keys(context)
        });

        throw new ARTError(
          errorMessage,
          ErrorCode.PROMPT_ASSEMBLY_FAILED,
          validationOrParseError
        );
      }
    } catch (renderError: any) {
      Logger.error("Failed to render prompt blueprint using Mustache.", {
          error: renderError.message,
          stack: renderError.stack,
          contextKeys: Object.keys(context)
      });
      throw new ARTError(
        `Failed to render prompt blueprint using Mustache. Error: ${renderError.message}`,
        ErrorCode.PROMPT_ASSEMBLY_FAILED,
        renderError
      );
    }
    // No finally block needed as we are not modifying global state
  }
}