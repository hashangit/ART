import { ModelCapability } from './types';

/**
 * Detailed information about an AI model
 */
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

/**
 * UI-friendly model information with display names
 */
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

/**
 * ModelRegistry implementation that maintains a catalog of available models
 * across providers with their capabilities and metadata.
 */
export class ModelRegistry {
  private models: Map<string, Map<string, ModelInfo>> = new Map();
  private capabilityDisplayNames: Map<ModelCapability, string> = new Map([
    [ModelCapability.TEXT, 'Text Generation'],
    [ModelCapability.VISION, 'Image Understanding'],
    [ModelCapability.STREAMING, 'Streaming Support'],
    [ModelCapability.TOOL_USE, 'Tool/Function Calling'],
    [ModelCapability.RAG, 'Retrieval Augmented Generation'],
    [ModelCapability.CODE, 'Code Generation'],
    [ModelCapability.REASONING, 'Advanced Reasoning']
  ]);

  constructor() {
    this.initializeRegistry();
  }

  /**
   * Initialize the model registry with default models from known providers
   */
  private initializeRegistry(): void {
    // OpenAI Models
    this.registerProvider('openai', [
      {
        id: 'gpt-4.5-orion',
        provider: 'openai',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2025-02-27'),
        costPerInputToken: 0.075, // $75 per 1M tokens
        costPerOutputToken: 0.15  // $150 per 1M tokens
      },
      {
        id: 'gpt-4o',
        provider: 'openai',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-08-06'),
        costPerInputToken: 0.0025, // $2.50 per 1M tokens
        costPerOutputToken: 0.01   // $10.00 per 1M tokens
      },
      {
        id: 'gpt-4o-mini',
        provider: 'openai',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE
        ],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-11-15'),
        costPerInputToken: 0.0015, // $1.50 per 1M tokens
        costPerOutputToken: 0.006  // $6.00 per 1M tokens
      },
      {
        id: 'gpt-4o-long-output',
        provider: 'openai',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 128000,
        maxOutputTokens: 16384,    // 4x more than standard output
        releasedAt: new Date('2024-10-15'),
        costPerInputToken: 0.0025, // $2.50 per 1M tokens
        costPerOutputToken: 0.015  // $15.00 per 1M tokens
      },
      {
        id: 'gpt-3.5-turbo',
        provider: 'openai',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE
        ],
        contextWindow: 16385,
        maxOutputTokens: 4096,
        releasedAt: new Date('2023-03-15'),
        costPerInputToken: 0.0001, // $0.10 per 1M tokens
        costPerOutputToken: 0.0002 // $0.20 per 1M tokens
      }
    ]);

    // Anthropic Models
    this.registerProvider('anthropic', [
      {
        id: 'claude-3-7-sonnet-20250219',
        provider: 'anthropic',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 200000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2025-02-19'),
        costPerInputToken: 0.003,  // $3.00 per 1M tokens
        costPerOutputToken: 0.015  // $15.00 per 1M tokens
      },
      {
        id: 'claude-3-7-sonnet-thinking',
        provider: 'anthropic',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 200000,
        maxOutputTokens: 128000,   // Extended thinking mode
        releasedAt: new Date('2025-02-19'),
        costPerInputToken: 0.003,  // $3.00 per 1M tokens
        costPerOutputToken: 0.015  // $15.00 per 1M tokens
      },
      {
        id: 'claude-3-5-sonnet',
        provider: 'anthropic',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 200000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-09-25'),
        costPerInputToken: 0.003,  // $3.00 per 1M tokens
        costPerOutputToken: 0.015  // $15.00 per 1M tokens
      },
      {
        id: 'claude-3-5-haiku',
        provider: 'anthropic',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE
        ],
        contextWindow: 200000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-12-03'),
        costPerInputToken: 0.0008, // $0.80 per 1M tokens
        costPerOutputToken: 0.004  // $4.00 per 1M tokens
      },
      {
        id: 'claude-3-opus',
        provider: 'anthropic',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 200000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-03-04'),
        costPerInputToken: 0.015,  // $15.00 per 1M tokens
        costPerOutputToken: 0.075  // $75.00 per 1M tokens
      }
    ]);

    // Google Gemini Models
    this.registerProvider('gemini', [
      {
        id: 'gemini-2.5-pro',
        provider: 'gemini',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 1000000,   // 1M tokens
        maxOutputTokens: 8192,
        releasedAt: new Date('2025-03-25'),
        costPerInputToken: 0.0035, // $3.50 per 1M tokens
        costPerOutputToken: 0.0105 // $10.50 per 1M tokens
      },
      {
        id: 'gemini-2.0-pro',
        provider: 'gemini',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 1000000,   // 1M tokens
        maxOutputTokens: 8192,
        releasedAt: new Date('2024-12-15'),
        costPerInputToken: 0.0025, // $2.50 per 1M tokens
        costPerOutputToken: 0.0075 // $7.50 per 1M tokens
      },
      {
        id: 'gemini-2.0-flash',
        provider: 'gemini',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE
        ],
        contextWindow: 1000000,   // 1M tokens
        maxOutputTokens: 8192,
        releasedAt: new Date('2024-12-15'),
        costPerInputToken: 0.0015, // $1.50 per 1M tokens
        costPerOutputToken: 0.005  // $5.00 per 1M tokens
      },
      {
        id: 'gemini-2.0-flash-lite',
        provider: 'gemini',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE
        ],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-12-15'),
        costPerInputToken: 0.0005, // $0.50 per 1M tokens
        costPerOutputToken: 0.002  // $2.00 per 1M tokens
      }
    ]);

    // DeepSeek Models
    this.registerProvider('deepseek', [
      {
        id: 'deepseek-v3-0324',
        provider: 'deepseek',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE,
          ModelCapability.RAG,
          ModelCapability.REASONING
        ],
        contextWindow: 130000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2025-03-24'),
        costPerInputToken: 0.0015, // $1.50 per 1M tokens
        costPerOutputToken: 0.003  // $3.00 per 1M tokens
      },
      {
        id: 'deepseek-v3',
        provider: 'deepseek',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE,
          ModelCapability.RAG,
          ModelCapability.REASONING
        ],
        contextWindow: 130000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2025-01-13'),
        costPerInputToken: 0.0015, // $1.50 per 1M tokens
        costPerOutputToken: 0.003  // $3.00 per 1M tokens
      },
      {
        id: 'deepseek-coder-v2',
        provider: 'deepseek',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.STREAMING,
          ModelCapability.CODE
        ],
        contextWindow: 128000,
        maxOutputTokens: 8000,
        releasedAt: new Date('2024-07-01'),
        costPerInputToken: 0.0012, // $1.20 per 1M tokens
        costPerOutputToken: 0.0025 // $2.50 per 1M tokens
      }
    ]);

    // OpenRouter Models (proxies to other providers)
    this.registerProvider('openrouter', [
      {
        id: 'openai/gpt-4.5-orion',
        provider: 'openrouter',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2025-02-27'),
        costPerInputToken: 0.08,  // OpenRouter markup
        costPerOutputToken: 0.16
      },
      {
        id: 'openai/gpt-4o',
        provider: 'openrouter',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-08-06'),
        costPerInputToken: 0.003,  // OpenRouter markup
        costPerOutputToken: 0.012
      },
      {
        id: 'anthropic/claude-3-7-sonnet',
        provider: 'openrouter',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 200000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2025-02-19'),
        costPerInputToken: 0.0035,
        costPerOutputToken: 0.016
      },
      {
        id: 'google/gemini-2.5-pro',
        provider: 'openrouter',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.VISION,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.RAG,
          ModelCapability.CODE,
          ModelCapability.REASONING
        ],
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        releasedAt: new Date('2025-03-25'),
        costPerInputToken: 0.004,
        costPerOutputToken: 0.012
      },
      {
        id: 'deepseek/deepseek-v3-0324',
        provider: 'openrouter',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE,
          ModelCapability.RAG,
          ModelCapability.REASONING
        ],
        contextWindow: 130000,
        maxOutputTokens: 4096,
        releasedAt: new Date('2025-03-24'),
        costPerInputToken: 0.0018,
        costPerOutputToken: 0.0035
      },
      {
        id: 'mistral/mistral-large-2',
        provider: 'openrouter',
        capabilities: [
          ModelCapability.TEXT,
          ModelCapability.STREAMING,
          ModelCapability.TOOL_USE,
          ModelCapability.CODE
        ],
        contextWindow: 32768,
        maxOutputTokens: 4096,
        releasedAt: new Date('2024-05-01'),
        costPerInputToken: 0.0015,
        costPerOutputToken: 0.0045
      }
    ]);
  }
  
  // Rest of the ModelRegistry implementation remains unchanged
  
  registerProvider(provider: string, modelInfos: ModelInfo[]): void {
    if (!this.models.has(provider)) {
      this.models.set(provider, new Map());
    }

    const providerModels = this.models.get(provider)!;
    modelInfos.forEach(modelInfo => {
      providerModels.set(modelInfo.id, modelInfo);
    });
  }

  getModelInfo(provider: string, modelId: string): ModelInfo | null {
    const providerModels = this.models.get(provider);
    if (!providerModels) return null;
    return providerModels.get(modelId) || null;
  }

  getModelsForProvider(provider: string): ModelInfo[] {
    const providerModels = this.models.get(provider);
    if (!providerModels) return [];
    return Array.from(providerModels.values());
  }

  validateModel(
    provider: string, 
    modelId: string, 
    requiredCapabilities?: ModelCapability[]
  ): boolean {
    const modelInfo = this.getModelInfo(provider, modelId);
    if (!modelInfo) return false;
    
    // If no specific capabilities required, any valid model is fine
    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true;
    }
    
    // Check if model supports all required capabilities
    return requiredCapabilities.every(cap => 
      modelInfo.capabilities.includes(cap)
    );
  }

  getBestModelForTask(
    provider: string, 
    requiredCapabilities: ModelCapability[]
  ): string | null {
    const models = this.getModelsForProvider(provider);
    
    // Filter models by required capabilities and not deprecated
    const suitableModels = models
      .filter(model => !model.deprecated)
      .filter(model => requiredCapabilities.every(cap => 
        model.capabilities.includes(cap)
      ));
    
    if (suitableModels.length === 0) return null;
    
    // Sort by:
    // 1. Most recent release date (newest first)
    // 2. Largest context window
    // 3. Not in beta (more stable models first)
    suitableModels.sort((a, b) => {
      // Release date comparison (newest first)
      if (a.releasedAt && b.releasedAt) {
        const dateComparison = b.releasedAt.getTime() - a.releasedAt.getTime();
        if (dateComparison !== 0) return dateComparison;
      } else if (a.releasedAt) {
        return -1; // a has a date, b doesn't
      } else if (b.releasedAt) {
        return 1;  // b has a date, a doesn't
      }
      
      // Context window comparison (largest first)
      const contextComparison = b.contextWindow - a.contextWindow;
      if (contextComparison !== 0) return contextComparison;
      
      // Beta status comparison (non-beta first)
      if (a.beta === b.beta) return 0;
      return a.beta ? 1 : -1;
    });
    
    return suitableModels[0]?.id || null;
  }

  getFallbackModel(provider: string, originalModelId: string): string | null {
    const originalModel = this.getModelInfo(provider, originalModelId);
    if (!originalModel) return null;
    
    // Get all non-deprecated models from the same provider
    const availableModels = this.getModelsForProvider(provider)
      .filter(model => !model.deprecated && model.id !== originalModelId);
    
    if (availableModels.length === 0) return null;
    
    // Try to find a model with similar capabilities
    const similarModels = availableModels
      .filter(model => originalModel.capabilities.every(cap => 
        model.capabilities.includes(cap)
      ));
    
    if (similarModels.length > 0) {
      // Sort by closeness to original context window
      similarModels.sort((a, b) => {
        const aDiff = Math.abs(a.contextWindow - originalModel.contextWindow);
        const bDiff = Math.abs(b.contextWindow - originalModel.contextWindow);
        return aDiff - bDiff;
      });
      
      return similarModels[0].id;
    }
    
    // If no model with all the same capabilities, get default model
    return this.getDefaultModelForProvider(provider);
  }

  getDefaultModelForProvider(provider: string): string | null {
    const models = this.getModelsForProvider(provider)
      .filter(model => !model.deprecated);
    
    if (models.length === 0) return null;
    
    // Use the model with the most capabilities that's not in beta
    const stableModels = models.filter(model => !model.beta);
    const modelsToConsider = stableModels.length > 0 ? stableModels : models;
    
    modelsToConsider.sort((a, b) => {
      // Most capabilities first
      const capabilitiesDiff = b.capabilities.length - a.capabilities.length;
      if (capabilitiesDiff !== 0) return capabilitiesDiff;
      
      // Most recent release date
      if (a.releasedAt && b.releasedAt) {
        return b.releasedAt.getTime() - a.releasedAt.getTime();
      }
      
      return 0;
    });
    
    return modelsToConsider[0]?.id || null;
  }

  getAllModelsForUI(): ModelUIInfo[] {
    const result: ModelUIInfo[] = [];
    
    this.models.forEach((providerModels, provider) => {
      providerModels.forEach((modelInfo, modelId) => {
        result.push({
          id: `${provider}/${modelId}`,
          displayName: this.getDisplayName(provider, modelId),
          provider,
          modelId,
          capabilities: modelInfo.capabilities.map(cap => ({
            id: cap,
            displayName: this.getCapabilityDisplayName(cap)
          })),
          contextWindow: modelInfo.contextWindow,
          isDeprecated: modelInfo.deprecated,
          isBeta: modelInfo.beta
        });
      });
    });
    
    return result;
  }

  getDisplayName(provider: string, modelId: string): string {
    const model = this.getModelInfo(provider, modelId);
    if (!model) return `${provider}/${modelId}`;
    
    // Format the display name based on the provider and model
    switch (provider) {
      case 'openai':
        return modelId.toUpperCase(); // e.g., "GPT-4O"
      case 'anthropic':
        // Format Claude models nicely, e.g., "Claude 3.7 Sonnet"
        return modelId
          .replace('claude-', 'Claude ')
          .replace(/(-\d+)$/, ''); // Remove date suffix if present
      case 'gemini':
        // Format Gemini models, e.g., "Gemini 2.5 Pro"
        return modelId
          .replace('gemini-', 'Gemini ')
          .replace('-', ' ');
      case 'deepseek':
        // Format DeepSeek models, e.g., "DeepSeek V3"
        return modelId
          .replace('deepseek-', 'DeepSeek ')
          .replace('v', 'V')
          .replace('r', 'R');
      case 'openrouter':
        // For OpenRouter proxied models, show original provider
        const [origProvider, origModel] = modelId.split('/');
        return `${origProvider.charAt(0).toUpperCase() + origProvider.slice(1)} ${origModel}`;
      default:
        return modelId;
    }
  }

  getCapabilityDisplayName(capability: ModelCapability): string {
    return this.capabilityDisplayNames.get(capability) || capability;
  }
}