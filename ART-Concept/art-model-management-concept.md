# ART Framework Model Management Concept (v0.2.4)

## 1. Introduction & Overview

The Agent Reasoning & Tooling (ART) Framework provides a unified approach to building LLM-powered intelligent agents that can operate entirely client-side within web browsers. A core challenge in building such a system is managing interactions with multiple LLM providers, each with different APIs, models, capabilities, and pricing structures.

The Model Management components in ART address this challenge by extending the Reasoning System with:

1. **ModelRegistry** - Catalogs models across providers and tracks their capabilities
2. **Enhanced ReasoningEngine** - Supports multiple provider adapters and intelligent model selection
3. **ProviderFactory** - Simplifies creation and configuration of provider adapters
4. **QueryAnalyzer** - Automatically detects required capabilities from queries

These components maintain ART's modular architecture while adding powerful model management capabilities that simplify development of multi-provider applications.

## 2. Architecture Integration

### 2.1 Subsystem Placement

The Model Management components reside primarily within the Reasoning System of ART's architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                         ART Framework                           │
├─────────────────────────────────────────────────────────────────┤
│                         Agent Core (AC)                         │
├─────────────┬─────────────────────┬────────────────┬────────────┤
│  Reasoning  │     Tool System     │    Context     │    ...     │
│   System    │        (TS)         │   System (CS)  │            │
│    (RS)     │                     │                │            │
└─────────────┴─────────────────────┴────────────────┴────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Reasoning System                          │
├─────────────┬─────────────────────┬────────────────┬────────────┤
│   Model     │     Reasoning       │   Provider     │   Query    │
│  Registry   │      Engine         │    Factory     │  Analyzer  │
└─────┬───────┴─────────┬───────────┴────────┬───────┴─────┬──────┘
      │                 │                    │             │
      │                 ▼                    ▼             │
      │         ┌───────────────┐    ┌────────────────┐    │
      │         │ Anthropic     │    │ OpenAI         │    │
      │         │ Adapter       │    │ Adapter        │    │
      │         └───────────────┘    └────────────────┘    │
      │                 ▲                    ▲             │
      │                 │                    │             │
      │         ┌───────────────┐    ┌────────────────┐    │
      └────────►│ Model         │◄───┤ Model          │◄───┘
                │ Selection     │    │ Validation     │
                └───────────────┘    └────────────────┘
```

### 2.2 Integration with Other ART Subsystems

The Model Management components integrate with other ART subsystems:

1. **UI System** - A new `ModelSocket` type is added to the UI System for model-related events
2. **Context System** - The `ThreadConfig` interface is extended with `modelPreferences`
3. **Observation System** - Model-related observations are recorded throughout the process

### 2.3 Data Flow in Multi-Provider Scenario

1. Agent Core initiates a query via the Reasoning System
2. QueryAnalyzer (if used) detects required capabilities from the query
3. ReasoningEngine consults ThreadConfig for any model preferences 
4. ModelRegistry validates or suggests models based on capabilities
5. ProviderAdapter for the selected provider/model makes the API call
6. Observations are recorded and UI is updated via ModelSocket
7. Results are returned through the standard ART flow

## 3. ModelRegistry Component

The ModelRegistry serves as the centralized catalog of available models across all supported providers. It maintains metadata about each model's capabilities, context windows, pricing, and other relevant information.

### 3.1 Key Responsibilities

- Maintain an up-to-date registry of available models and their capabilities
- Provide model validation and selection based on capability requirements
- Support fallback strategies when preferred models are unavailable
- Generate UI-friendly model information for application interfaces

### 3.2 Model Capabilities

Each model in the registry is tagged with capability flags that indicate what features it supports:

```typescript
export enum ModelCapability {
  TEXT = 'text',               // Basic text generation
  VISION = 'vision',           // Image understanding
  STREAMING = 'streaming',     // Supports streaming
  TOOL_USE = 'tool_use',       // Function/tool calling
  RAG = 'rag',                 // Optimized for RAG
  CODE = 'code',               // Code generation
  REASONING = 'reasoning'      // Strong reasoning
}
```

### 3.3 Core Methods

```typescript
class ModelRegistry {
  // Registration methods
  registerProvider(provider: string, modelInfos: ModelInfo[]): void;
  
  // Query methods
  getModelInfo(provider: string, modelId: string): ModelInfo | null;
  getModelsForProvider(provider: string): ModelInfo[];
  
  // Selection methods
  validateModel(provider: string, modelId: string, requiredCapabilities?: ModelCapability[]): boolean;
  getBestModelForTask(provider: string, requiredCapabilities: ModelCapability[]): string | null;
  getFallbackModel(provider: string, originalModelId: string): string | null;
  getDefaultModelForProvider(provider: string): string | null;
  
  // UI-friendly data
  getAllModelsForUI(): ModelUIInfo[];
  getDisplayName(provider: string, modelId: string): string;
  getCapabilityDisplayName(capability: ModelCapability): string;
}
```

### 3.4 Model Information Schema

```typescript
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

// UI-friendly format with display names
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
```

## 4. ReasoningEngine Enhancements

The ReasoningEngine is enhanced to support multiple provider adapters and intelligent model selection.

### 4.1 Enhanced Construction

```typescript
// Original construction accepted a single adapter
const engine = new ReasoningEngine(openaiAdapter);

// Enhanced construction accepts multiple providers and the registry
const engine = new ReasoningEngine({
  providers: {
    'openai': openaiAdapter,
    'anthropic': anthropicAdapter,
    'gemini': geminiAdapter
  },
  defaultProvider: 'openai',
  modelRegistry: new ModelRegistry(),
  stateManager: stateManager,    // Optional integration with Context System
  uiSystem: uiSystem             // Optional integration with UI System
});
```

### 4.2 Enhanced Call Options

```typescript
// Extended call options interface
export interface EnhancedCallOptions extends CallOptions {
  // Standard call options
  threadId: string;
  traceId?: string;
  userId?: string;
  onThought?: (thought: string) => void;
  
  // Model selection options
  provider?: string;                           // Specific provider to use
  model?: string;                              // Specific model to use
  requiredCapabilities?: ModelCapability[];    // Capabilities needed for this call
  attemptFallback?: boolean;                   // Whether to try other providers on failure
}
```

### 4.3 Model Selection Process

The ReasoningEngine implements a sophisticated model selection process:

1. Check for explicitly specified provider/model in the call options
2. If no model specified, check for thread configuration preferences:
   - Look for capability-specific model preferences
   - Fall back to default provider preference if no capability match
3. Validate the selected model supports required capabilities
4. If validation fails, find best alternative from same provider
5. If no suitable model found, try other providers
6. If all fails, throw a meaningful error

### 4.4 Public Validation API

```typescript
// Public API for model validation
async validateModelForCapabilities(
  provider: string,
  modelId: string,
  requiredCapabilities: ModelCapability[]
): Promise<ModelValidationResult>;

// Validation result structure
interface ModelValidationResult {
  valid: boolean;
  requestedModel?: string;
  suggestedAlternatives?: Array<{
    provider: string;
    modelId: string;
    displayName: string;
  }>;
}
```

## 5. Provider Factory

The Provider Factory simplifies the creation and configuration of provider adapters.

### 5.1 Provider Configuration

```typescript
export interface ProviderConfig {
  provider: string;    // Provider identifier (e.g., 'openai', 'anthropic')
  apiKey: string;      // API key for authentication
  options?: Record<string, any>; // Provider-specific options
}
```

### 5.2 Factory Methods

```typescript
export class ProviderFactory {
  // Create multiple providers from configurations
  static createProviders(configs: ProviderConfig[]): Record<string, ProviderAdapter>;
  
  // Create a single provider adapter
  static createProvider(config: ProviderConfig): ProviderAdapter;
}
```

### 5.3 Supported Providers

```typescript
// Usage example
const providers = ProviderFactory.createProviders([
  {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
    options: { defaultModel: 'gpt-4o' }
  },
  {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    options: { defaultModel: 'claude-3-7-sonnet-20250219' }
  },
  {
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    options: { defaultModel: 'gemini-2.0-flash' }
  },
  {
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    options: { defaultModel: 'deepseek-v3-0324' }
  },
  {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    options: { defaultModel: 'openai/gpt-4o' }
  }
]);
```

## 6. Query Analyzer

The Query Analyzer automatically detects required capabilities from query content.

### 6.1 Capability Detection

```typescript
export class QueryAnalyzer {
  // Analyze a query to determine required capabilities
  analyzeQuery(query: string): ModelCapability[] {
    const requiredCapabilities: ModelCapability[] = [ModelCapability.TEXT];
    
    // Check for image content
    if (query.includes('data:image') || 
        /https?:.*\.(jpg|jpeg|png|gif|webp)/i.test(query)) {
      requiredCapabilities.push(ModelCapability.VISION);
    }
    
    // Check for code-related queries
    if (/\bcode\b|\bfunction\b|\bclass\b|\bdebug\b|\bprogramming\b/i.test(query)) {
      requiredCapabilities.push(ModelCapability.CODE);
    }
    
    // Check for complex reasoning queries
    if (/\banalyze\b|\bcompare\b|\bevaluate\b|\boptimize\b/i.test(query)) {
      requiredCapabilities.push(ModelCapability.REASONING);
    }
    
    return requiredCapabilities;
  }
}
```

### 6.2 Integration with ReasoningEngine

```typescript
// Automatic capability detection in ReasoningEngine
async call(prompt: FormattedPrompt, options: EnhancedCallOptions): Promise<string> {
  // Auto-detect capabilities if not specified
  if (!options.requiredCapabilities && typeof prompt === 'string') {
    options.requiredCapabilities = this.queryAnalyzer.analyzeQuery(prompt);
    Logger.debug(`Auto-detected capabilities: ${options.requiredCapabilities.join(', ')}`);
  }
  
  // Rest of implementation...
}
```

## 7. UI System Integration

### 7.1 Model Socket

A new `ModelSocket` extends the existing socket system in ART for model-related events:

```typescript
export interface ModelEvent {
  type: 'MODEL_CAPABILITY_MISMATCH' | 'MODEL_SELECTION_CHANGED' | 'MODEL_ERROR';
  originalModel?: string;
  requiredCapabilities?: ModelCapability[];
  suggestedModel?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class ModelSocket extends TypedSocket<ModelEvent> {
  // Implementation follows TypedSocket pattern
}

// UISystem extension
export class UISystem {
  // Existing methods
  getObservationSocket(): ObservationSocket;
  getConversationSocket(): ConversationSocket;
  
  // New method
  getModelSocket(): ModelSocket;
}
```

### 7.2 Model Selection Notifications

```typescript
// ReasoningEngine notifies UI of model selection changes
private notifyModelMismatch(
  originalProvider: string,
  originalModel: string,
  requiredCapabilities: ModelCapability[],
  suggestedModel: string,
  suggestedProvider?: string
): void {
  if (this.uiSystem && this.uiSystem.getModelSocket) {
    this.uiSystem.getModelSocket().notify({
      type: 'MODEL_CAPABILITY_MISMATCH',
      originalModel: `${originalProvider}/${originalModel}`,
      requiredCapabilities,
      suggestedModel: `${suggestedProvider || originalProvider}/${suggestedModel}`
    });
  }
}
```

### 7.3 UI Component Integration

```typescript
// Example React component using ModelSocket
function ModelStatusIndicator({ art, threadId }) {
  const [modelStatus, setModelStatus] = useState(null);
  
  useEffect(() => {
    // Subscribe to model events
    const unsubscribe = art.uiSystem.getModelSocket().subscribe(
      (event) => {
        if (event.type === 'MODEL_CAPABILITY_MISMATCH') {
          setModelStatus({
            message: `Model switched from ${event.originalModel} to ${event.suggestedModel}`,
            reason: `Required capabilities: ${event.requiredCapabilities.join(', ')}`
          });
        }
      },
      null, // No specific filter type
      { threadId } // Filter by thread
    );
    
    return unsubscribe;
  }, [art, threadId]);
  
  return modelStatus ? (
    <div className="model-status-alert">
      <p>{modelStatus.message}</p>
      <p className="reason">{modelStatus.reason}</p>
    </div>
  ) : null;
}
```

## 8. Thread Configuration for Model Preferences

The Context System's `ThreadConfig` is extended to support model preferences:

### 8.1 Configuration Structure

```typescript
export interface ModelPreferences {
  defaultProvider?: string;
  preferredModels?: {
    [capability in ModelCapability]?: {
      provider: string;
      modelId: string;
    }
  };
}

export interface ThreadConfig {
  // Existing fields
  reasoning: {
    // Existing reasoning fields
    modelPreferences?: ModelPreferences;
  };
  // Other fields
}
```

### 8.2 Setting Preferences

```typescript
// Example: Setting model preferences for a thread
await stateManager.updateThreadConfig('thread-123', {
  reasoning: {
    modelPreferences: {
      defaultProvider: 'anthropic',
      preferredModels: {
        [ModelCapability.REASONING]: { 
          provider: 'anthropic', 
          modelId: 'claude-3-7-sonnet-20250219' 
        },
        [ModelCapability.CODE]: { 
          provider: 'openai', 
          modelId: 'gpt-4o' 
        },
        [ModelCapability.VISION]: {
          provider: 'gemini',
          modelId: 'gemini-2.0-flash'
        }
      }
    }
  }
});
```

## 9. Usage Scenarios with User Stories

### 9.1 Basic Usage (Default Selection)

**User Story**: As a developer building a simple chatbot application, I want to use the default model selection so I can get up and running quickly without having to make provider-specific decisions.

```typescript
// Simplest possible integration - automatic model selection
await art.process({
  query: "What's the weather like?",
  threadId: 'thread-123',
});
```

The ART framework automatically selects an appropriate model based on the query and available providers. In this example, the developer doesn't need to specify any model details, and ART selects a model with basic text capabilities from the default provider.

### 9.2 Specific Provider/Model

**User Story**: As a developer building an AI-powered educational platform, I want to use a specific model known for its reasoning capabilities (Claude) to give my users the most accurate explanations for complex topics.

```typescript
// Explicitly specify provider and model for guaranteed behavior
await art.process({
  query: "Explain quantum computing with an analogy a high school student would understand",
  threadId: 'thread-123',
  options: {
    provider: 'anthropic',
    model: 'claude-3-7-sonnet-20250219'
  }
});
```

Here, the developer has specifically chosen Claude for a task requiring high-quality explanations. ART uses exactly this model and doesn't attempt to substitute others, even if they might be more efficient for simpler tasks.

### 9.3 Capability-Based Selection

**User Story**: As a developer of a visual analysis application, I need to ensure the model can interpret images without specifying exactly which provider to use, allowing ART to select the best available vision-capable model.

```typescript
// Let ART select any model with vision capabilities
await art.process({
  query: "Analyze this image and tell me what landmarks you can identify: https://example.com/image.jpg",
  threadId: 'thread-123',
  options: {
    requiredCapabilities: [ModelCapability.VISION]
  }
});
```

In this scenario, the developer specifies the required capability (vision) rather than a specific model. ART searches across all available providers for a model that supports vision capabilities and selects the best option, potentially considering factors like context window size and recency.

### 9.4 Capability Validation and User Choice

**User Story**: As a developer of an image analysis app, I want to validate if the user's chosen model supports vision capabilities before processing their request, and if not, allow them to choose from suitable alternatives.

```typescript
// User has selected gpt-3.5-turbo in the UI
const userSelectedProvider = 'openai';
const userSelectedModel = 'gpt-3.5-turbo';

// Validate if the model supports vision before proceeding
const validationResult = await art.reasoningEngine.validateModelForCapabilities(
  userSelectedProvider,
  userSelectedModel,
  [ModelCapability.VISION]
);

if (!validationResult.valid) {
  // Show UI dialog with alternative models
  const selectedAlternative = await showModelSelectionDialog(
    "The selected model doesn't support image analysis. Please choose an alternative:",
    validationResult.suggestedAlternatives
  );
  
  // User chose an alternative model
  if (selectedAlternative) {
    await art.process({
      query: "What objects can you see in this image?",
      threadId: 'thread-123',
      options: {
        provider: selectedAlternative.provider,
        model: selectedAlternative.modelId,
        imageUrl: "https://example.com/image.jpg"
      }
    });
  }
} else {
  // Proceed with the user's original choice
  await art.process({
    query: "What objects can you see in this image?",
    threadId: 'thread-123',
    options: {
      provider: userSelectedProvider,
      model: userSelectedModel,
      imageUrl: "https://example.com/image.jpg"
    }
  });
}
```

This scenario demonstrates how an application can check if a user-selected model supports the required capabilities before making a call, and offer alternatives if needed. It puts the user in control while ensuring they select a model that can actually perform the task.

### 9.5 Automatic Capability Detection

**User Story**: As a developer of a coding assistant application, I want the system to automatically detect when users are asking for code-related help and use an appropriate coding-optimized model without requiring explicit configuration.

```typescript
// No explicit capability specification, letting QueryAnalyzer do its work
await art.process({
  query: "Can you write a JavaScript function that finds the longest common subsequence between two strings?",
  threadId: 'thread-123',
  // No explicit capabilities - QueryAnalyzer will detect CODE capability
});
```

The QueryAnalyzer examines the input text, recognizes coding-related terminology ("JavaScript function"), and automatically adds the CODE capability to the required capabilities. ART then selects a model optimized for code generation, potentially from a provider known for strong coding abilities.

### 9.6 Configuration-Based Model Preferences

**User Story**: As a developer building a specialized assistant application, I want to configure different models for different types of tasks in a single conversation thread, so my users get optimal responses without interruption.

```typescript
// Configure thread preferences once during setup
await art.stateManager.updateThreadConfig('financial-advisor-thread', {
  reasoning: {
    modelPreferences: {
      defaultProvider: 'anthropic',
      preferredModels: {
        [ModelCapability.REASONING]: { 
          provider: 'anthropic', 
          modelId: 'claude-3-7-sonnet-20250219' // Use Claude for complex financial analysis
        },
        [ModelCapability.CODE]: { 
          provider: 'openai', 
          modelId: 'gpt-4o' // Use GPT-4o for generating financial scripts/code
        },
        [ModelCapability.VISION]: { 
          provider: 'gemini', 
          modelId: 'gemini-2.0-flash' // Use Gemini for chart/graph analysis
        }
      }
    }
  }
});

// Later, when processing different types of queries in the same thread:

// Will use Claude (REASONING capability)
await art.process({
  query: "Analyze the implications of the latest Fed interest rate decision on small business loans",
  threadId: 'financial-advisor-thread',
});

// Will use GPT-4o (CODE capability - detected by QueryAnalyzer)
await art.process({
  query: "Write a Python script to calculate mortgage payments with variable interest rates",
  threadId: 'financial-advisor-thread',
});

// Will use Gemini (VISION capability - detected from image URL)
await art.process({
  query: "What trends can you see in this stock performance chart? https://example.com/chart.jpg",
  threadId: 'financial-advisor-thread',
});
```

This example shows how a specialized application can use thread-specific model preferences to route different types of queries to the most appropriate models without explicit specification in each call. The user experiences a seamless conversation while getting optimized responses behind the scenes.

### 9.7 User Model Selection UI

**User Story**: As a developer building a power-user focused AI tool, I want to let my users choose which model to use from a dropdown that displays available capabilities, so they can make informed decisions based on their specific needs.

```typescript
// React component for model selection
function ModelSelectionInterface({ art, onModelSelect, currentThreadId }) {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get UI-friendly model information
    const loadModels = async () => {
      setLoading(true);
      try {
        const availableModels = art.reasoningEngine.getAvailableModelsForUI();
        setModels(availableModels);
        
        // Get current thread config to see if there's a default model
        const threadConfig = await art.stateManager.getThreadConfig(currentThreadId);
        if (threadConfig?.reasoning?.modelPreferences?.defaultProvider) {
          const defaultProvider = threadConfig.reasoning.modelPreferences.defaultProvider;
          const defaultModel = availableModels.find(m => m.provider === defaultProvider);
          if (defaultModel) setSelectedModel(defaultModel.id);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadModels();
  }, [art, currentThreadId]);
  
  const handleModelChange = (e) => {
    const modelId = e.target.value;
    setSelectedModel(modelId);
    
    // Extract provider and model ID
    const [provider, model] = modelId.split('/');
    onModelSelect({ provider, model });
  };
  
  // Group models by provider for organized dropdown
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {});
  
  if (loading) return <div>Loading available models...</div>;
  
  return (
    <div className="model-selector">
      <label htmlFor="model-select">Select AI Model:</label>
      <select 
        id="model-select" 
        value={selectedModel || ''} 
        onChange={handleModelChange}
        className="model-dropdown"
      >
        <option value="">-- Select a model --</option>
        
        {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
          <optgroup key={provider} label={provider.toUpperCase()}>
            {providerModels.map(model => (
              <option 
                key={model.id} 
                value={model.id}
                disabled={model.isDeprecated}
              >
                {model.displayName} 
                {model.isDeprecated ? " (Deprecated)" : ""} 
                {model.isBeta ? " (Beta)" : ""}
                {" — "}
                {model.capabilities.map(c => c.displayName).join(', ')}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      
      {selectedModel && (
        <div className="model-info">
          <h4>Selected Model Capabilities:</h4>
          <ul>
            {models
              .find(m => m.id === selectedModel)?.capabilities
              .map(cap => (
                <li key={cap.id}>{cap.displayName}</li>
              ))
            }
          </ul>
        </div>
      )}
    </div>
  );
}

// Usage in application
function AIChat() {
  const [selectedModel, setSelectedModel] = useState(null);
  
  const handleModelSelect = (model) => {
    setSelectedModel(model);
    // Could also update thread preferences here
  };
  
  const handleSubmit = async (query) => {
    await art.process({
      query,
      threadId: 'current-thread',
      options: {
        // Use selected model if available
        ...(selectedModel && {
          provider: selectedModel.provider,
          model: selectedModel.model
        })
      }
    });
  };
  
  return (
    <div className="ai-chat">
      <ModelSelectionInterface 
        art={art} 
        onModelSelect={handleModelSelect}
        currentThreadId="current-thread"
      />
      <ChatInterface onSubmit={handleSubmit} />
    </div>
  );
}
```

This example shows a complete React UI component that allows users to select from available models, grouped by provider and showing capabilities. The component also displays additional information about the selected model's capabilities, helping users make informed choices. The application then uses the selected model for subsequent queries.

### 9.8 Automatic Fallback with User Notification

**User Story**: As a developer of a resilient AI application, I want automatic fallback to alternative providers when the primary provider is unavailable, with clear user notification of the switch, to ensure uninterrupted service.

```typescript
// Set up UI subscription for model events 
function setupModelEventHandlers(art) {
  // Subscribe to model-related events
  const unsubscribe = art.uiSystem.getModelSocket().subscribe(
    (event) => {
      if (event.type === 'MODEL_CAPABILITY_MISMATCH') {
        // Show non-blocking notification to the user
        showToast(`Using ${event.suggestedModel} instead of ${event.originalModel} for better handling of this task.`);
      } else if (event.type === 'MODEL_ERROR') {
        // Show error notification
        showToast(`Error with ${event.originalModel}: ${event.error}. Trying alternative model.`);
      }
    },
    null, // Subscribe to all event types
    { threadId: 'resilient-thread' }
  );
  
  return unsubscribe;
}

// Process with automatic fallback enabled
async function processWithFallback(query) {
  try {
    const result = await art.process({
      query,
      threadId: 'resilient-thread',
      options: {
        provider: 'openai', // Try OpenAI first
        attemptFallback: true, // Enable cross-provider fallback
      }
    });
    return result;
  } catch (error) {
    // Even with fallback, all providers failed
    showErrorDialog("All available AI providers are currently unavailable. Please try again later.");
    return null;
  }
}

// Usage
const unsubscribe = setupModelEventHandlers(art);

// Later when user submits a query
const result = await processWithFallback("Generate a marketing plan for a sustainable clothing brand");

// When component unmounts
unsubscribe();
```

This scenario demonstrates how an application can configure automatic fallback between providers while keeping users informed through the UI. If OpenAI is unavailable or rate-limited, ART will automatically try other configured providers, and the UI will show an appropriate notification to the user explaining the switch.


## 10. Error Handling & Fallback Strategies

### 10.1 Error Types

The system handles several types of errors:

1. **Authentication Errors** - Invalid API keys
2. **Rate Limiting** - Provider quotas or limits exceeded
3. **Model Unavailability** - Model not available or deprecated
4. **Capability Mismatch** - Model doesn't support required features
5. **Content Filtering** - Provider rejects content
6. **Network Errors** - Connection issues

### 10.2 Fallback Strategies

The system implements multi-level fallback strategies:

1. **Within-Provider Fallback** - Try another model from the same provider
   ```typescript
   const fallbackModel = modelRegistry.getFallbackModel(provider, originalModel);
   ```

2. **Cross-Provider Fallback** - Switch to a different provider
   ```typescript
   // Enable cross-provider fallback
   await art.process({
     query: "Generate a story",
     threadId: 'thread-123',
     options: {
       provider: 'openai',
       attemptFallback: true // Will try other providers if openai fails
     }
   });
   ```

3. **Capability-Based Fallback** - Select a model based on required capabilities
   ```typescript
   const bestModel = modelRegistry.getBestModelForTask(provider, requiredCapabilities);
   ```

### 10.3 UI Error Handling

Errors are communicated to the UI through the ModelSocket:

```typescript
// ReasoningEngine emits error events
this.uiSystem.getModelSocket().notify({
  type: 'MODEL_ERROR',
  originalModel: `${provider}/${model}`,
  error: `${errorCode}: ${errorMessage}`,
  metadata: {
    attemptedProvider: provider,
    attemptedModel: model,
    errorDetails: error
  }
});

// UI subscribes to error events
art.uiSystem.getModelSocket().subscribe(
  (event) => {
    if (event.type === 'MODEL_ERROR') {
      showErrorNotification(event.error);
    }
  },
  'MODEL_ERROR',
  { threadId: 'thread-123' }
);
```

## 11. Conclusion

The ART Framework's Model Management capability provides a seamless, integrated approach to working with multiple LLM providers and models. By enhancing the existing Reasoning System with the ModelRegistry and related components, ART delivers several key benefits:

1. **Simplified Model Selection** - Automatic selection based on capabilities
2. **Provider Flexibility** - Easily switch between or fallback across providers
3. **UI Integration** - Real-time model status updates through typed sockets
4. **Capability Detection** - Automatic analysis of query requirements
5. **Thread-Specific Preferences** - Configure models per capability and thread

This implementation stays true to ART's architectural principles by:

1. **Maintaining Modular Design** - Components have clear, single responsibilities
2. **Preserving Subsystem Boundaries** - Model Management components reside within appropriate subsystems
3. **Extending Existing Interfaces** - Building on established patterns rather than creating parallel systems
4. **Providing Developer Convenience** - Making complex model management simple for application developers

The result is a powerful, flexible system that allows developers to focus on their application logic while ART handles the complexities of provider selection, model capabilities, and fallback strategies.
