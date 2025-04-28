// src/systems/reasoning/ReasoningEngine.ts
import {
  ReasoningEngine as IReasoningEngine,
  ProviderAdapter,
} from '../../core/interfaces';
import { FormattedPrompt, CallOptions, StreamEvent } from '../../types'; // Added StreamEvent
import { Logger } from '../../utils/logger';

/**
 * Default implementation of the `ReasoningEngine` interface.
 * This class acts as a simple wrapper around a specific `ProviderAdapter`,
 * delegating the actual LLM call to the configured adapter.
 *
 * @implements {IReasoningEngine}
 */
export class ReasoningEngine implements IReasoningEngine {
  private adapter: ProviderAdapter;

  /**
   /**
    * Creates an instance of the ReasoningEngine.
    * @param adapter - The specific `ProviderAdapter` instance (e.g., `OpenAIAdapter`, `AnthropicAdapter`) that this engine will use to make LLM calls.
    * @throws {Error} If no valid adapter is provided.
    */
  constructor(adapter: ProviderAdapter) {
    if (!adapter) {
      throw new Error('ReasoningEngine requires a valid ProviderAdapter.');
    }
    this.adapter = adapter;
    Logger.info(`ReasoningEngine initialized with adapter: ${adapter.providerName}`);
  }

  /**
   /**
    * Executes an LLM call by delegating to the configured `ProviderAdapter`.
    * It passes the prompt and options directly to the adapter's `call` method.
    * @param prompt - The prompt to send to the LLM, potentially formatted specifically for the provider by the `PromptManager`.
    * @param options - Options controlling the LLM call, including mandatory `threadId`, tracing IDs, model parameters, streaming flags, and context.
    * @returns A promise resolving to an AsyncIterable of StreamEvent objects, as returned by the adapter.
    * @throws {ARTError | Error} Re-throws any error encountered by the underlying `ProviderAdapter` during the initial call setup (errors during stream consumption are handled via ERROR StreamEvents).
    */
   async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
     Logger.debug(`ReasoningEngine delegating call to adapter: ${this.adapter.providerName}`, { threadId: options.threadId, traceId: options.traceId, stream: options.stream });
     try {
       // Directly call the adapter's call method, which now returns an AsyncIterable
       const streamResult = await this.adapter.call(prompt, options);
       return streamResult;
     } catch (error: any) {
       Logger.error(`ReasoningEngine encountered an error during adapter call setup: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });

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