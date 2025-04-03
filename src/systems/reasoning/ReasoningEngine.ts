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
      // Re-throw the error to be handled by the Agent Core
      throw error;
    }
  }
}