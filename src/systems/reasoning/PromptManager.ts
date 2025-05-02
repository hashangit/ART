// src/systems/reasoning/PromptManager.ts
import Mustache from 'mustache'; // Use default import (with esModuleInterop: true)
import {
  ArtStandardPrompt,
  PromptContext,
  // Removed unused imports like ConversationMessage, ToolResult, ToolSchema, ThreadContext
} from '../../types';
import { PromptManager as PromptManagerInterface } from '../../core/interfaces';
import { ARTError, ErrorCode } from '../../errors';

/**
 * Stateless implementation of the `PromptManager` interface using Mustache.js.
 * Assembles a provider-agnostic `ArtStandardPrompt` based on a Mustache blueprint
 * string and a `PromptContext` object provided by the agent logic.
 *
 * @implements {PromptManagerInterface}
 * @see {PromptContext}
 * @see {ArtStandardPrompt}
 */
export class PromptManager implements PromptManagerInterface {
  /**
   * Assembles a standardized prompt using a Mustache blueprint and context data.
   * The blueprint is expected to render directly into a JSON string representing
   * the `ArtStandardPrompt` array structure.
   *
   * @param {string} blueprint - The Mustache template string. It should be designed to output a valid JSON array string conforming to the `ArtStandardPrompt` structure when rendered with the provided context.
   * @param {PromptContext} context - An object containing the data to be injected into the Mustache blueprint.
   * @returns {Promise<ArtStandardPrompt>} A promise resolving to the assembled `ArtStandardPrompt` (an array of message objects).
   * @throws {ARTError} Throws an error with code `ErrorCode.PROMPT_ASSEMBLY_FAILED` if the Mustache rendering fails or if the rendered output cannot be parsed into a valid `ArtStandardPrompt` JSON array. The original rendering or parsing error is attached as `originalError`.
   */
  async assemblePrompt(
    blueprint: string,
    context: PromptContext,
  ): Promise<ArtStandardPrompt> {
    try {
      // Render the blueprint using Mustache.
      // Note: Mustache escapes HTML by default. If unescaped output is needed
      // in the blueprint (e.g., for JSON strings within the JSON structure),
      // use triple braces {{{variable}}} in the blueprint itself.
      const renderedJsonString = Mustache.render(blueprint, context); // Use namespace.render again

      // Parse the rendered string into an ArtStandardPrompt object
      try {
        const potentialPrompt = JSON.parse(renderedJsonString);

        // Basic validation: Check if it's an array
        if (!Array.isArray(potentialPrompt)) {
          // Log the invalid output for debugging
          console.error("Rendered blueprint did not produce a valid JSON array. Output:", renderedJsonString);
          throw new Error('Rendered template did not produce a valid JSON array.');
        }

        // TODO: Add more robust validation against ArtStandardMessage structure if needed
        // Example: Check if each item has 'role' and 'content' properties.
        // potentialPrompt.forEach((msg, index) => {
        //   if (typeof msg !== 'object' || msg === null || !msg.role || msg.content === undefined) {
        //     throw new Error(`Invalid message structure at index ${index} in rendered prompt.`);
        //   }
        // });

        return potentialPrompt as ArtStandardPrompt;
      } catch (parseError: any) {
        console.error("Failed to parse rendered prompt JSON:", renderedJsonString);
        // Pass the original error object directly as the third argument
        throw new ARTError(
          `Failed to parse rendered blueprint into ArtStandardPrompt JSON. Error: ${parseError.message}`,
          ErrorCode.PROMPT_ASSEMBLY_FAILED,
          parseError // Pass the original error object
        );
      }
    } catch (renderError: any) {
      console.error("Failed to render prompt blueprint:", renderError);
      // Pass the original error object directly as the third argument
      throw new ARTError(
        `Failed to render prompt blueprint using Mustache. Error: ${renderError.message}`,
        ErrorCode.PROMPT_ASSEMBLY_FAILED,
        renderError // Pass the original error object
      );
    }
  }
}