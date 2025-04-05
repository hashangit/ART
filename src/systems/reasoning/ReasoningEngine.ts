// src/systems/reasoning/ReasoningEngine.ts
import {
  ReasoningEngine as IReasoningEngine,
  ProviderAdapter,
} from '../../core/interfaces';
import { FormattedPrompt, CallOptions } from '../../types';
import { Logger } from '../../utils/logger';

export class ReasoningEngine implements IReasoningEngine {
  private adapter: ProviderAdapter;

  /**
   * Creates an instance of ReasoningEngine.
   * @param adapter - The configured ProviderAdapter to use for LLM calls.
   */
  constructor(adapter: ProviderAdapter) {
    if (!adapter) {
      throw new Error('ReasoningEngine requires a valid ProviderAdapter.');
    }
    this.adapter = adapter;
    Logger.info(`ReasoningEngine initialized with adapter: ${adapter.providerName}`);
  }

  /**
   * Delegates the LLM call to the configured ProviderAdapter.
   * @param prompt - The formatted prompt.
   * @param options - Call options.
   * @returns The raw string response from the LLM adapter.
   */
  async call(prompt: FormattedPrompt, options: CallOptions): Promise<string> {
    Logger.debug(`ReasoningEngine delegating call to adapter: ${this.adapter.providerName}`, { threadId: options.threadId, traceId: options.traceId });
    try {
      // Directly call the adapter's call method
      const result = await this.adapter.call(prompt, options);
      return result;
    } catch (error: any) {
      Logger.error(`ReasoningEngine encountered an error during adapter call: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });

      // TODO: Implement more nuanced error handling for adapter calls.
      // Currently, *any* error from the adapter.call (including network issues,
      // API errors, rate limits, etc.) is re-thrown, causing the Agent Core
      // (e.g., PESAgent) to potentially treat it as a fatal planning failure for the turn.
      // Consider:
      // 1. Differentiating error types (e.g., transient network vs. invalid API key vs. content filtering).
      // 2. For potentially recoverable errors (like temporary network glitches or maybe rate limits),
      //    instead of re-throwing, formulate an 'OBSERVATION' message detailing the error.
      //    This would allow the LLM/Agent to be aware of the issue and potentially retry or adjust its plan
      //    in the next turn, rather than halting the current turn with a generic "Planning phase failed".
      // 3. Define which errors should still be considered fatal and re-thrown.

      // Re-throw the error to be handled by the Agent Core (current behavior)
      throw error;
    }
  }
}