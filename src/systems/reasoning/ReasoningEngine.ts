// src/systems/reasoning/ReasoningEngine.ts
import {
  ReasoningEngine as IReasoningEngine,
  // Removed ProviderAdapter import
} from '../../core/interfaces';
import { FormattedPrompt, CallOptions, StreamEvent } from '../../types';
import { IProviderManager, ManagedAdapterAccessor, RuntimeProviderConfig } from '../../types/providers'; // Import ProviderManager types and RuntimeProviderConfig
import { Logger } from '../../utils/logger';

/**
 * Default implementation of the `ReasoningEngine` interface.
 * This class uses the `ProviderManager` to dynamically obtain `ProviderAdapter` instances
 * based on the runtime configuration provided in `CallOptions`.
 *
 * @implements {IReasoningEngine}
 */
export class ReasoningEngine implements IReasoningEngine {
  private providerManager: IProviderManager; // Replaced adapter with providerManager

  /**
   * Creates an instance of the ReasoningEngine.
   * @param providerManager - The `ProviderManager` instance used to obtain adapter instances at runtime.
   */
  constructor(providerManager: IProviderManager) {
    this.providerManager = providerManager;
    Logger.info('ReasoningEngine initialized with ProviderManager');
  }

  /**
   * Executes an LLM call by obtaining a `ProviderAdapter` instance from the `ProviderManager`
   * based on the `providerConfig` in `CallOptions`, and then delegating the call to the adapter.
   * Ensures the adapter instance is released back to the manager after the call.
   * @param prompt - The prompt to send to the LLM, potentially formatted specifically for the provider by the `PromptManager`.
   * @param options - Options controlling the LLM call, including mandatory `threadId`, tracing IDs, model parameters, streaming flags, and the crucial `providerConfig`.
   * @returns An AsyncIterable of StreamEvent objects, as returned by the adapter.
   * @throws {ARTError | Error} Re-throws any error encountered during adapter acquisition or initial call setup.
   */
   async call(prompt: FormattedPrompt, options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
     const providerConfig: RuntimeProviderConfig = options.providerConfig; // Extract providerConfig

     if (!providerConfig) {
         throw new Error("CallOptions must include 'providerConfig' for multi-provider architecture.");
     }

     Logger.debug(`ReasoningEngine requesting adapter for provider: ${providerConfig.providerName}, model: ${providerConfig.modelId}`, { threadId: options.threadId, traceId: options.traceId, stream: options.stream });

     let accessor: ManagedAdapterAccessor;
     try {
         // Obtain a managed adapter instance from the ProviderManager
         accessor = await this.providerManager.getAdapter(providerConfig);
         Logger.debug(`ReasoningEngine obtained adapter for signature: ${accessor.adapter.providerName}`, { threadId: options.threadId, traceId: options.traceId });
     } catch (error: any) {
         Logger.error(`ReasoningEngine failed to get adapter: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });
         // Re-throw errors from getAdapter (e.g., unknown provider, limits, conflicts)
         throw error;
     }

     // Use a try...finally block to ensure the adapter is released after stream consumption
     try {
         // Delegate the call to the obtained adapter instance
         const streamResult = await accessor.adapter.call(prompt, options);

         // Wrap the AsyncIterable to ensure release() is called when iteration is done or errors
         const releasingGenerator = (async function*() {
             try {
                 for await (const event of streamResult) {
                     yield event;
                 }
             } finally {
                 // This block executes when the generator finishes (stream consumed) or is exited (break, return, throw)
                 accessor.release();
                 Logger.debug(`ReasoningEngine released adapter for signature: ${accessor.adapter.providerName}`, { threadId: options.threadId, traceId: options.traceId });
             }
         })();

         return releasingGenerator;

     } catch (error: any) {
       Logger.error(`ReasoningEngine encountered an error during adapter call or stream processing: ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });

       // Ensure release is called even if the initial call() or stream setup fails
       accessor.release();
       Logger.debug(`ReasoningEngine released adapter after error for signature: ${accessor.adapter.providerName}`, { threadId: options.threadId, traceId: options.traceId });

       // Re-throw the error to be handled by the Agent Core
       throw error;
     }
   }
}