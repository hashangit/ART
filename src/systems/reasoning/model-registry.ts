// src/systems/reasoning/model-registry.ts
import { Logger } from '../../utils/logger';

// Define model capability flags
export enum ModelCapability {
  TEXT = 'text',               // Basic text generation
  VISION = 'vision',           // Image understanding
  STREAMING = 'streaming',     // Supports streaming
  TOOL_USE = 'tool_use',       // Function/tool calling
  RAG = 'rag',                 // Optimized for RAG
  CODE = 'code',               // Code generation
  REASONING = 'reasoning'      // Strong reasoning
}

// Define model information structure
export interface ModelInfo {
  id: string;                  // Model identifier
  provider: string;            // Provider name
  capabilities: ModelCapability[]; // Supported capabilities
  contextWindow: number;       // Max context window in tokens
  maxOutputTokens?: number;    // Max output tokens if different
  deprecated?: boolean;        // If true, model is deprecated
  beta?: boolean;              // If true, model is in beta/preview
  releasedAt?: Date;           // Release date if known
  costPerInputToken?: number;  // Cost per 1K input tokens (USD)
  costPerOutputToken?: number; // Cost per 1K output tokens (USD)
}

// UI-friendly model information
export interface ModelUIInfo {
  id: string;                  // Combined provider/model ID
  displayName: string;         // User-friendly name
  provider: string;            // Provider name
  modelId: string;             // Model identifier
  capabilities: {              // UI-friendly capabilities
    id: ModelCapability;
    displayName: string;
  }[];
  contextWindow: number;
  isDeprecated?: boolean;
  isBeta?: boolean;
}

export class ModelRegistry {
  private models: Map<string, ModelInfo> = new Map(); // Key: "provider/modelId"
  private providerModels: Map<string, string[]> = new Map(); // Key: provider, Value: [modelId, ...]

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    // Register OpenAI models
    this.registerProvider('openai', [
      {
        id: 'gpt-4o',
        provider: 'openai',
        capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE, ModelCapability.REASONING],
        contextWindow: 128000,
        releasedAt: new Date('2024-05-13') // Actual release date
      },
      {
        id: 'gpt-4-turbo',
        provider: 'openai',
        capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE, ModelCapability.REASONING],
        contextWindow: 128000,
        releasedAt: new Date('2024-04-09')
      },
       {
        id: 'gpt-3.5-turbo',
        provider: 'openai',
        capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE],
        contextWindow: 16385, // Often 16k, sometimes 4k depending on specific version
      },
      // Add more OpenAI models as needed
    ]);

    // Register Anthropic models
     this.registerProvider('anthropic', [
      {
        id: 'claude-3-5-sonnet-20240620',
        provider: 'anthropic',
        capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE, ModelCapability.REASONING],
        contextWindow: 200000,
        beta: true, // As of initial release
        releasedAt: new Date('2024-06-20')
      },
      {
        id: 'claude-3-opus-20240229',
        provider: 'anthropic',
        capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE, ModelCapability.REASONING],
        contextWindow: 200000,
        releasedAt: new Date('2024-02-29')
      },
      {
        id: 'claude-3-sonnet-20240229',
        provider: 'anthropic',
        capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE, ModelCapability.REASONING],
        contextWindow: 200000,
        releasedAt: new Date('2024-02-29')
      },
       {
        id: 'claude-3-haiku-20240307',
        provider: 'anthropic',
        capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE],
        contextWindow: 200000,
        releasedAt: new Date('2024-03-07')
      },
      // Add more Anthropic models as needed
    ]);

     // Register Google Gemini models
     this.registerProvider('gemini', [
       {
         id: 'gemini-1.5-pro-latest', // Use 'latest' tag or specific version
         provider: 'gemini',
         capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE, ModelCapability.REASONING],
         contextWindow: 1048576, // 1M context window
       },
       {
         id: 'gemini-1.5-flash-latest',
         provider: 'gemini',
         capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE],
         contextWindow: 1048576,
       },
        {
         id: 'gemini-pro', // Older model, often used as default
         provider: 'gemini',
         capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING, ModelCapability.TOOL_USE, ModelCapability.CODE],
         contextWindow: 30720, // ~32k
       },
       // Add more Gemini models as needed
     ]);

     // Register DeepSeek models
     this.registerProvider('deepseek', [
       {
         id: 'deepseek-v2-chat', // Assuming this is the latest chat model
         provider: 'deepseek',
         capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING, ModelCapability.CODE, ModelCapability.REASONING], // Check vision/tool use capabilities
         contextWindow: 128000,
       },
       {
         id: 'deepseek-chat', // Older model
         provider: 'deepseek',
         capabilities: [ModelCapability.TEXT, ModelCapability.STREAMING, ModelCapability.CODE],
         contextWindow: 32768, // Check context window
       },
       // Add more DeepSeek models as needed
     ]);

    // Register OpenRouter (as a concept - models are defined by their full ID)
    // We don't pre-register specific OpenRouter models, but the provider exists.
    this.providerModels.set('openrouter', []);


    Logger.info(`ModelRegistry initialized with ${this.models.size} models from ${this.providerModels.size} providers`);
  }

  /**
   * Registers a provider and its associated models.
   * @param providerName The name of the provider (e.g., 'openai').
   * @param models An array of ModelInfo objects for this provider.
   */
  registerProvider(providerName: string, models: ModelInfo[]): void {
    const modelIds: string[] = [];
    for (const model of models) {
      if (model.provider !== providerName) {
        Logger.warn(`Model ${model.id} has mismatched provider name '${model.provider}', expected '${providerName}'. Skipping.`);
        continue;
      }
      const fullId = `${providerName}/${model.id}`;
      if (this.models.has(fullId)) {
        Logger.warn(`Model ${fullId} is already registered. Overwriting.`);
      }
      this.models.set(fullId, model);
      modelIds.push(model.id);
    }
    this.providerModels.set(providerName, modelIds);
    Logger.debug(`Registered provider '${providerName}' with ${modelIds.length} models.`);
  }

   /**
   * Retrieves information about a specific model.
   * @param provider The provider name.
   * @param modelId The model identifier.
   * @returns ModelInfo or null if not found.
   */
  getModelInfo(provider: string, modelId: string): ModelInfo | null {
    // Handle OpenRouter case where modelId might already contain the provider
    if (provider === 'openrouter' && modelId.includes('/')) {
        const parts = modelId.split('/');
        provider = parts[0];
        modelId = parts.slice(1).join('/'); // Handle potential slashes in model name itself
    }
    const fullId = `${provider}/${modelId}`;
    return this.models.get(fullId) || null;
  }

  /**
   * Validates if a model supports all required capabilities.
   * @param provider The provider name.
   * @param modelId The model identifier.
   * @param requiredCapabilities An array of capabilities the model must support.
   * @returns True if the model supports all capabilities, false otherwise.
   */
  validateModel(provider: string, modelId: string, requiredCapabilities: ModelCapability[]): boolean {
    const modelInfo = this.getModelInfo(provider, modelId);
    if (!modelInfo || modelInfo.deprecated) {
      return false; // Model not found or deprecated
    }
    return requiredCapabilities.every(cap => modelInfo.capabilities.includes(cap));
  }

  /**
   * Finds the "best" available model from a specific provider for a given set of capabilities.
   * "Best" is subjective, here prioritizing non-beta, non-deprecated, latest released, largest context.
   * @param provider The provider name.
   * @param requiredCapabilities The capabilities needed.
   * @returns The model ID string or null if no suitable model found.
   */
  getBestModelForTask(provider: string, requiredCapabilities: ModelCapability[]): string | null {
    const providerModelIds = this.providerModels.get(provider);
    if (!providerModelIds) return null;

    const suitableModels = providerModelIds
      .map(id => this.getModelInfo(provider, id))
      .filter((info): info is ModelInfo =>
        info !== null &&
        !info.deprecated &&
        requiredCapabilities.every(cap => info.capabilities.includes(cap))
      )
      .sort((a, b) => {
        // Prioritize non-beta
        if (a.beta && !b.beta) return 1;
        if (!a.beta && b.beta) return -1;
        // Prioritize later release date
        if (a.releasedAt && b.releasedAt) {
          if (b.releasedAt.getTime() !== a.releasedAt.getTime()) {
            return b.releasedAt.getTime() - a.releasedAt.getTime();
          }
        }
        // Prioritize larger context window
        return b.contextWindow - a.contextWindow;
      });

    return suitableModels.length > 0 ? suitableModels[0].id : null;
  }

   /**
   * Gets the default model ID for a given provider (e.g., the first one registered).
   * @param provider The provider name.
   * @returns The default model ID or null if provider has no models.
   */
  getDefaultModelForProvider(provider: string): string | null {
    const modelIds = this.providerModels.get(provider);
    // Attempt to find a non-deprecated default, otherwise return the first one
    if (modelIds && modelIds.length > 0) {
        const nonDeprecated = modelIds.find(id => !this.getModelInfo(provider, id)?.deprecated);
        return nonDeprecated || modelIds[0];
    }
    return null;
  }

  /**
   * Gets a fallback model if the preferred one isn't suitable (e.g., default model).
   * @param provider The provider name.
   * @param requiredCapabilities Capabilities needed.
   * @returns A fallback model ID or null.
   */
  getFallbackModel(provider: string, requiredCapabilities: ModelCapability[]): string | null {
      // Try finding the best model first
      const fallback = this.getBestModelForTask(provider, requiredCapabilities);
      if (fallback) return fallback;

      // If no "best" found, try the default for the provider, checking capabilities
      const defaultModelId = this.getDefaultModelForProvider(provider);
      if (defaultModelId && this.validateModel(provider, defaultModelId, requiredCapabilities)) {
          return defaultModelId;
      }

      // As a last resort, find *any* model from the provider that meets capabilities
      const providerModelIds = this.providerModels.get(provider) || [];
      for (const modelId of providerModelIds) {
          if (this.validateModel(provider, modelId, requiredCapabilities)) {
              return modelId;
          }
      }

      return null; // No suitable fallback found
  }


  /**
   * Get all models in a UI-friendly format for display
   */
  getAllModelsForUI(): ModelUIInfo[] {
    const uiModels: ModelUIInfo[] = [];

    for (const [provider, modelIds] of this.providerModels.entries()) {
       // Skip OpenRouter here as its models aren't pre-registered in the same way
       if (provider === 'openrouter') continue;

      for (const modelId of modelIds) {
        const modelInfo = this.getModelInfo(provider, modelId);
        if (modelInfo) {
          uiModels.push({
            id: `${provider}/${modelId}`, // Use combined ID for selection
            displayName: this.getDisplayName(provider, modelId),
            provider: provider,
            modelId: modelId,
            capabilities: modelInfo.capabilities.map(cap => ({
              id: cap,
              displayName: this.getCapabilityDisplayName(cap)
            })),
            contextWindow: modelInfo.contextWindow,
            isDeprecated: !!modelInfo.deprecated,
            isBeta: !!modelInfo.beta
          });
        }
      }
    }

     // Sort models alphabetically by display name within each provider group (optional)
     uiModels.sort((a, b) => {
        if (a.provider !== b.provider) {
            return a.provider.localeCompare(b.provider);
        }
        return a.displayName.localeCompare(b.displayName);
     });

    return uiModels;
  }

  /**
   * Get a user-friendly display name for a capability
   */
  getCapabilityDisplayName(capability: ModelCapability): string {
    switch (capability) {
      case ModelCapability.TEXT: return "Text Generation";
      case ModelCapability.VISION: return "Image Understanding";
      case ModelCapability.STREAMING: return "Streaming";
      case ModelCapability.TOOL_USE: return "Tool Usage";
      case ModelCapability.RAG: return "RAG Optimized";
      case ModelCapability.CODE: return "Code Generation";
      case ModelCapability.REASONING: return "Advanced Reasoning";
      default: return capability; // Should already be a string if it reaches here
    }
  }

  /**
   * Get a user-friendly display name for a model
   */
  getDisplayName(provider: string, modelId: string): string {
    // Simple heuristic for display names, can be expanded
    let name = modelId;
    switch (provider) {
      case 'openai':
        name = name.replace('gpt-', 'GPT-').replace('-turbo', ' Turbo').replace('-o', 'o');
        break;
      case 'anthropic':
        name = name.replace('claude-', 'Claude ').replace('-opus', ' Opus').replace('-sonnet', ' Sonnet').replace('-haiku', ' Haiku');
        // Remove date strings like -20240229 for cleaner display
        name = name.replace(/-\d{8}$/, '');
        break;
      case 'gemini':
         name = name.replace('gemini-', 'Gemini ').replace('-pro', ' Pro').replace('-flash', ' Flash').replace('-latest', ' (Latest)');
         break;
      case 'deepseek':
          name = name.replace('deepseek-', 'DeepSeek ').replace('-v', ' V').replace('-chat', ' Chat').replace('-coder', ' Coder');
          break;
      // Add other providers as needed
    }
    // General cleanup: replace hyphens/underscores with spaces, capitalize words
    return name.replace(/[-_]/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}