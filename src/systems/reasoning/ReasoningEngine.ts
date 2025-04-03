// src/systems/reasoning/ReasoningEngine.ts
import {
  ReasoningEngine as IReasoningEngine,
  ProviderAdapter,
  StateManager, // Added
  ObservationManager, // Added
  UISystem // Added
} from '../../core/interfaces';
import { FormattedPrompt, CallOptions, ThreadConfig } from '../../types'; // Added ThreadConfig
import { ModelRegistry, ModelCapability, ModelUIInfo } from './model-registry'; // Added ModelRegistry imports
import { Logger } from '../../utils/logger';
import { QueryAnalyzer } from './query-analyzer'; // Added QueryAnalyzer

// Add model-related types to CallOptions
export interface EnhancedCallOptions extends CallOptions {
  provider?: string;
  requiredCapabilities?: ModelCapability[];
  attemptFallback?: boolean;
}

// Structure for model validation results
export interface ModelValidationResult {
  valid: boolean;
  requestedModel?: string; // Format: "provider/modelId"
  suggestedAlternatives?: Array<{
    provider: string;
    modelId: string;
    displayName: string;
  }>;
}


export class ReasoningEngine implements IReasoningEngine {
  private providers: Record<string, ProviderAdapter> = {};
  private defaultProvider: string;
  private modelRegistry: ModelRegistry;
  private stateManager?: StateManager;
  private observationManager?: ObservationManager; // Optional for now
  private uiSystem?: UISystem; // Optional for UI notifications
  private queryAnalyzer: QueryAnalyzer; // Added

  /**
   * Creates an instance of ReasoningEngine with multiple providers and model selection logic.
   */
  constructor(options: {
    providers: Record<string, ProviderAdapter>;
    defaultProvider: string;
    modelRegistry: ModelRegistry;
    stateManager?: StateManager; // Optional: For thread-specific model preferences
    observationManager?: ObservationManager; // Optional: For logging model selection events?
    uiSystem?: UISystem; // Optional: For notifying UI of model mismatches
  }) {
    if (!options.providers || Object.keys(options.providers).length === 0) {
      throw new Error('ReasoningEngine requires at least one ProviderAdapter.');
    }
    if (!options.defaultProvider || !options.providers[options.defaultProvider]) {
      throw new Error('ReasoningEngine requires a valid defaultProvider that exists in the providers list.');
    }
     if (!options.modelRegistry) {
      throw new Error('ReasoningEngine requires a ModelRegistry instance.');
    }

    this.providers = options.providers;
    this.defaultProvider = options.defaultProvider;
    this.modelRegistry = options.modelRegistry;
    this.stateManager = options.stateManager;
    this.observationManager = options.observationManager;
    this.uiSystem = options.uiSystem;
    this.queryAnalyzer = new QueryAnalyzer(); // Instantiate QueryAnalyzer

    Logger.info(`ReasoningEngine initialized with providers: ${Object.keys(this.providers).join(', ')}, Default: ${this.defaultProvider}`);
  }

  /**
   * Selects the appropriate provider and model, then calls the LLM.
   * @param prompt - The formatted prompt.
   * @param options - Enhanced call options including provider/capability preferences.
   * @returns The raw string response from the selected LLM adapter.
   */
  async call(prompt: FormattedPrompt, options: EnhancedCallOptions): Promise<string> {
     // Auto-detect capabilities if not specified and prompt is string
     if (!options.requiredCapabilities && typeof prompt === 'string') {
        options.requiredCapabilities = this.queryAnalyzer.analyzeQuery(prompt);
        Logger.debug(`Auto-detected capabilities: ${options.requiredCapabilities.join(', ')}`, { threadId: options.threadId });
     }

    const { provider, model } = await this.selectProviderAndModel(options);

    // Update options with selected provider and model for the actual call
    const finalCallOptions: CallOptions = {
      ...options, // Pass original options through
      model // Override model with the selected one
    };

    try {
      Logger.debug(`ReasoningEngine calling ${provider}/${model}`, {
        threadId: options.threadId,
        traceId: options.traceId,
        requiredCapabilities: options.requiredCapabilities
      });

      // Call the selected provider's adapter
      const result = await this.providers[provider].call(prompt, finalCallOptions);
      return result;

    } catch (error: any) {
      // Implement fallback logic if enabled and applicable
      if (options.attemptFallback !== false && provider !== this.defaultProvider) { // Default to true if undefined
        Logger.warn(`Call to ${provider}/${model} failed, attempting fallback to default provider ${this.defaultProvider}`, {
          error: error.message,
          threadId: options.threadId,
          traceId: options.traceId
        });

        // Retry with the default provider, ensuring no infinite loop
        return this.call(prompt, {
          ...options,
          provider: this.defaultProvider, // Explicitly set default provider
          model: undefined, // Let selection logic pick default provider's model
          attemptFallback: false // Prevent further fallbacks on this retry
        });
      }

      // If fallback is disabled or already tried, re-throw the original error
      Logger.error(`ReasoningEngine encountered an error during adapter call (${provider}/${model}): ${error.message}`, { error, threadId: options.threadId, traceId: options.traceId });
      throw error;
    }
  }

   /**
   * Determines the provider and model to use based on options and thread config.
   * Handles validation and fallback selection.
   */
  private async selectProviderAndModel(options: EnhancedCallOptions): Promise<{
    provider: string;
    model: string;
  }> {
    let preferredProvider = options.provider || this.defaultProvider;
    let preferredModel = options.model; // Can be undefined

    // 1. Validate preferredProvider
    if (!this.providers[preferredProvider]) {
      Logger.warn(`Requested provider '${preferredProvider}' not available, using default: ${this.defaultProvider}`, { threadId: options.threadId });
      preferredProvider = this.defaultProvider;
      preferredModel = undefined; // Reset model if provider changed
    }

    const requiredCapabilities = options.requiredCapabilities || [ModelCapability.TEXT];

    // 2. Try to get thread-specific model preferences if StateManager is available
    let threadConfig: ThreadConfig | null = null;
    if (this.stateManager && options.threadId) {
      try {
        // Assuming loadThreadContext returns the full context including config
        const context = await this.stateManager.loadThreadContext(options.threadId);
        threadConfig = context?.config || null;

        if (threadConfig?.reasoning?.modelPreferences) {
          const prefs = threadConfig.reasoning.modelPreferences;
          let foundPreference = false;

          // Check capability-specific preferences first
          if (prefs.preferredModels) {
            for (const capability of requiredCapabilities) {
              const preferred = prefs.preferredModels[capability];
              if (preferred && this.providers[preferred.provider]) { // Check if provider is available
                 const isValid = this.modelRegistry.validateModel(
                    preferred.provider, preferred.modelId, [capability] // Validate for *this* capability
                 );
                 if (isValid) {
                    Logger.debug(`Using thread preference for capability ${capability}: ${preferred.provider}/${preferred.modelId}`, { threadId: options.threadId });
                    preferredProvider = preferred.provider;
                    preferredModel = preferred.modelId;
                    foundPreference = true;
                    break; // Use the first matching capability preference
                 } else {
                     Logger.warn(`Thread preferred model ${preferred.provider}/${preferred.modelId} for ${capability} is invalid or lacks capability. Ignoring preference.`, { threadId: options.threadId });
                 }
              }
            }
          }

          // If no specific capability preference matched, check default provider preference
          if (!foundPreference && prefs.defaultProvider && this.providers[prefs.defaultProvider]) {
             Logger.debug(`Using thread default provider preference: ${prefs.defaultProvider}`, { threadId: options.threadId });
             preferredProvider = prefs.defaultProvider;
             preferredModel = undefined; // Let selection logic pick model for this provider
          }
        }
      } catch (error: any) {
        Logger.warn(`Error loading thread config for model preferences: ${error.message}`, { threadId: options.threadId });
      }
    }

    // 3. Determine the final model to use
    let finalProvider = preferredProvider;
    let finalModel: string | null = null;

    if (preferredModel) {
      // If a specific model was requested (either via options or thread config)
      const isValid = this.modelRegistry.validateModel(finalProvider, preferredModel, requiredCapabilities);
      if (isValid) {
        finalModel = preferredModel;
        Logger.debug(`Using specified model: ${finalProvider}/${finalModel}`, { threadId: options.threadId });
      } else {
        Logger.warn(`Specified model ${finalProvider}/${preferredModel} does not meet required capabilities: ${requiredCapabilities.join(', ')}. Attempting fallback.`, { threadId: options.threadId });
        // Notify UI about mismatch before finding fallback
        this.notifyModelMismatch(finalProvider, preferredModel, requiredCapabilities, null, null, options.threadId);
        finalModel = this.modelRegistry.getFallbackModel(finalProvider, requiredCapabilities);
        if (finalModel) {
            Logger.info(`Using fallback model for ${finalProvider}: ${finalModel}`, { threadId: options.threadId });
            // Notify UI about the fallback selection
            this.notifyModelMismatch(finalProvider, preferredModel, requiredCapabilities, finalProvider, finalModel, options.threadId);
        }
      }
    } else {
      // No specific model requested, find the best for the provider and capabilities
      finalModel = this.modelRegistry.getBestModelForTask(finalProvider, requiredCapabilities);
      if (finalModel) {
          Logger.debug(`Selected best model for ${finalProvider}: ${finalModel}`, { threadId: options.threadId });
      } else {
          // If no "best" found, try the provider's default
          finalModel = this.modelRegistry.getDefaultModelForProvider(finalProvider);
          if (finalModel && this.modelRegistry.validateModel(finalProvider, finalModel, requiredCapabilities)) {
              Logger.debug(`Using default model for ${finalProvider}: ${finalModel}`, { threadId: options.threadId });
          } else {
              finalModel = null; // Default model doesn't meet capabilities either
          }
      }
    }

    // 4. If no suitable model found for the preferred/default provider, try *any* provider
    if (!finalModel) {
      Logger.warn(`No suitable model found for provider ${finalProvider}. Searching all providers.`, { threadId: options.threadId });
      for (const providerName of Object.keys(this.providers)) {
        if (providerName === finalProvider) continue; // Skip the one we already checked

        const alternativeModel = this.modelRegistry.getBestModelForTask(providerName, requiredCapabilities) ||
                                 this.modelRegistry.getDefaultModelForProvider(providerName);

        if (alternativeModel && this.modelRegistry.validateModel(providerName, alternativeModel, requiredCapabilities)) {
          Logger.info(`Using alternative provider and model: ${providerName}/${alternativeModel}`, { threadId: options.threadId });
          finalProvider = providerName;
          finalModel = alternativeModel;
           // Notify UI about the switch
           this.notifyModelMismatch(preferredProvider, preferredModel || 'auto', requiredCapabilities, finalProvider, finalModel, options.threadId);
          break;
        }
      }
    }

    // 5. Final check - if still no model, throw an error
    if (!finalModel) {
      const errorMsg = `No suitable model found across any provider for capabilities: ${requiredCapabilities.join(', ')}`;
      Logger.error(errorMsg, { threadId: options.threadId });
      throw new Error(errorMsg);
    }

    return { provider: finalProvider, model: finalModel };
  }

  /**
   * Validate if a model meets capabilities requirements and suggest alternatives.
   * Public API for application developers.
   */
  async validateModelForCapabilities(
    provider: string,
    modelId: string,
    requiredCapabilities: ModelCapability[]
  ): Promise<ModelValidationResult> {
    const isValid = this.modelRegistry.validateModel(
      provider, modelId, requiredCapabilities
    );

    const requestedModel = `${provider}/${modelId}`; // Format for consistency

    if (isValid) {
      return { valid: true, requestedModel };
    }

    // Find alternatives
    const suggestedAlternatives: ModelValidationResult['suggestedAlternatives'] = [];

    // First try same provider fallback
    const sameProviderFallback = this.modelRegistry.getFallbackModel(provider, requiredCapabilities);
    if (sameProviderFallback) {
      suggestedAlternatives.push({
        provider,
        modelId: sameProviderFallback,
        displayName: this.modelRegistry.getDisplayName(provider, sameProviderFallback)
      });
    }

    // Then try other providers
    for (const providerName of Object.keys(this.providers)) {
      if (providerName === provider) continue; // Skip original provider

      const alternativeModel = this.modelRegistry.getFallbackModel(providerName, requiredCapabilities);
      if (alternativeModel && !suggestedAlternatives.some(alt => alt.provider === providerName && alt.modelId === alternativeModel)) { // Avoid duplicates
        suggestedAlternatives.push({
          provider: providerName,
          modelId: alternativeModel,
          displayName: this.modelRegistry.getDisplayName(providerName, alternativeModel)
        });
      }
    }

    return {
      valid: false,
      requestedModel,
      suggestedAlternatives
    };
  }

  /**
   * Notify UI system about model capability mismatch or substitution (if configured).
   */
  private notifyModelMismatch(
    originalProvider: string,
    originalModel: string | null, // Can be null if auto-selected failed
    requiredCapabilities: ModelCapability[],
    suggestedProvider: string | null,
    suggestedModel: string | null,
    threadId?: string
  ): void {
    // Check if uiSystem and the specific socket method exist
    if (this.uiSystem && typeof this.uiSystem.getModelSocket === 'function') {
      try {
        const modelSocket = this.uiSystem.getModelSocket();
        if (modelSocket && typeof modelSocket.notify === 'function') {
             modelSocket.notify({
                type: 'MODEL_CAPABILITY_MISMATCH', // Or maybe 'MODEL_SUBSTITUTION'?
                originalModel: originalModel ? `${originalProvider}/${originalModel}` : `Auto-select for ${originalProvider}`,
                requiredCapabilities,
                suggestedModel: suggestedProvider && suggestedModel ? `${suggestedProvider}/${suggestedModel}` : 'None suitable found'
             }, { targetThreadId: threadId }); // Target specific thread if ID available
        }
      } catch (error: any) {
        Logger.warn(`Failed to notify UI of model mismatch: ${error.message}`, { threadId });
      }
    }
  }

  /**
   * Get all available models in UI-friendly format.
   * Public API for application UI components.
   */
  getAvailableModelsForUI(): ModelUIInfo[] {
    // Delegate directly to the ModelRegistry instance
    return this.modelRegistry.getAllModelsForUI();
  }
}