# ART Framework: Enhanced Model Management Strategy (v0.2.5 Proposal)

## 1. Introduction & Overview

The Agent Reasoning & Tooling (ART) Framework provides a unified approach to building LLM-powered intelligent agents operating client-side. Managing interactions with diverse LLM providers (APIs, models, capabilities, costs) is a core challenge.

This document outlines an enhanced strategy for Model Management within ART, building upon the initial concept (v0.2.4) to create a more flexible, robust, configurable, and observable system.

Key goals of this enhanced strategy include:

1.  **Dynamic Model Routing:** Intelligently select the best model/provider per task.
2.  **Centralized Configuration:** Manage provider settings and API keys securely and conveniently.
3.  **Enhanced Robustness:** Improve error handling, implement retries, and define fallback strategies.
4.  **Performance & Cost Optimization:** Introduce streaming support and comprehensive cost/token tracking with budget controls.
5.  **Improved Developer Experience:** Offer optional built-in features while maintaining flexibility.
6.  **Increased Observability:** Provide clear visibility into the model management lifecycle.

This strategy introduces or significantly enhances the following components: `ModelRegistry`, `ModelRouter`, `ReasoningEngine`, `ProviderFactory`, `ConfigurationService`, `CostTrackingService`, an optional `QueryAnalyzer`, and an optional `EncryptedSecretsRepository`.

## 2. Architecture Integration

### 2.1 Subsystem Placement

The enhanced Model Management components integrate primarily within the Reasoning System (RS), interacting closely with Context (CS), Observation (OS), and potentially Storage (SS) subsystems.

```mermaid
graph TD
    subgraph ART Framework
        AC[Agent Core]
        RS[Reasoning System]
        TS[Tool System]
        CS[Context System]
        OS[Observation System]
        SS[Storage System]
        UIS[UI System]
        AC --> RS
        AC --> TS
        AC --> CS
        RS --> OS
        TS --> OS
        CS --> OS
        RS --> CS
        RS <--> SS
        UIS <--> AC
        UIS <--> RS // Added for completeness
    end

    subgraph Reasoning System (RS)
        RE[ReasoningEngine]
        MR[ModelRouter]
        Reg[ModelRegistry]
        PF[ProviderFactory]
        QA[(QueryAnalyzer)]
        CfgS[ConfigurationService]
        CTS[CostTrackingService]
        ESR[(EncryptedSecretsRepository)]

        RE --> MR
        MR --> Reg
        MR -- Uses --> Adapters
        RE -.-> QA # Optional Use
        RE --> CTS
        Adapters -- Config Request --> CfgS
        PF -- Creates --> Adapters
        PF -- Optional Key Req --> ESR
        ESR -- Uses --> SS
        RE --> OS # Reasoning Engine logs high-level events
        MR --> OS # Model Router logs routing decisions, fallbacks
        Adapters --> OS # Adapters log API calls, errors, usage
        CTS --> OS # Cost Tracking logs budget events
    end

    subgraph Adapters
        Adp1[OpenAIAdapter]
        Adp2[AnthropicAdapter]
        AdpN[...]
    end

    style QA fill:#eee,stroke:#aaa,stroke-width:1px,stroke-dasharray: 5 5
    style ESR fill:#eee,stroke:#f66,stroke-width:2px,stroke-dasharray: 5 5
```

*(Diagram Note: QA and ESR are shown dashed/parenthesized as they are optional features).*

### 2.2 Integration with Other ART Subsystems

1.  **UI System (UIS):**
    *   Receives model-related events (selection changes, errors, cost warnings) via a dedicated `ModelSocket`.
    *   Can fetch available models (via `ReasoningEngine`/`ModelRegistry`) for user selection interfaces.
2.  **Context System (CS):**
    *   `ThreadConfig` stores `modelPreferences`, `costPreferences`, and the `autoDetectCapabilities` flag (for `QueryAnalyzer`).
    *   `StateManager` provides access to this configuration.
3.  **Observation System (OS):**
    *   Records detailed observations for all significant model management events (routing decisions, capability checks, API calls, streaming chunks, errors, fallbacks, cost/token usage, warnings). **This provides crucial visibility for debugging and monitoring.**
    *   Integrates with `CostTrackingService` to log budget warnings/violations.
4.  **Storage System (SS):**
    *   Optionally used by the `EncryptedSecretsRepository` for persistent, encrypted storage of API keys.
5.  **Agent Core (AC):**
    *   Initiates reasoning requests via `ReasoningEngine`, explicitly setting `requiredCapabilities` in `EnhancedCallOptions` based on the agent's current task or step.
    *   Enriches `ConversationMessage` with final metadata.
### 2.3 Data Flow Example (Dynamic Routing Scenario)

1.  Agent Core initiates a query via `ReasoningEngine.call()`, specifying `requiredCapabilities` (e.g., `[REASONING]`) in the options based on its internal logic (e.g., planning step).
2.  `ReasoningEngine` checks if capabilities are already specified. If not, *and* if `autoDetectCapabilities` is enabled for the thread, it *may* call `QueryAnalyzer` as a fallback/default. In this example, capabilities *are* specified, so `QueryAnalyzer` is skipped.
3.  `ReasoningEngine` passes the query, options (including the Agent-defined `requiredCapabilities`) to `ModelRouter`.
4.  `ModelRouter` consults `ThreadConfig` (via `StateManager`) for preferences (`modelPreferences`, `costPreferences`).
5.  `ModelRouter` queries `ModelRegistry` for models matching the required `[REASONING]` capability and preferences.
6.  `ModelRouter` potentially consults `CostTrackingService` for budget checks.
7.  `ModelRouter` selects the best provider/model (e.g., `anthropic/claude-3-opus`). Logs decision via OS.
8.  `ModelRouter` requests the corresponding adapter instance from `ProviderFactory`.
9.  `ProviderFactory` creates/retrieves the adapter.
10. The selected `ProviderAdapter` makes the API call. Logs call initiation via OS.
11. `CostTrackingService` records token usage and estimated cost. Logs usage via OS.
12. Observations are logged throughout via the `ObservationSystem`.
13. UI is updated via `ModelSocket` and `ConversationSocket`.
14. Results are returned to Agent Core.
## 3. ModelRegistry Component

The ModelRegistry serves as the centralized catalog of available models across all supported providers. It maintains metadata about each model's capabilities, context windows, pricing, and other relevant information.

### 3.1 Key Responsibilities

*   Maintain registry of models (provider, ID, capabilities, context window, pricing, etc.).
*   Provide methods for querying models based on provider or capabilities.
*   Support model validation against required capabilities.
*   Offer suggestions for suitable models or fallbacks.
*   Generate UI-friendly model information.

### 3.2 Model Capabilities (Unchanged)

```typescript
export enum ModelCapability {
  TEXT = 'text', VISION = 'vision', STREAMING = 'streaming',
  TOOL_USE = 'tool_use', RAG = 'rag', CODE = 'code', REASONING = 'reasoning'
}
```

### 3.3 Core Methods (Conceptual)

```typescript
class ModelRegistry {
  registerProvider(provider: string, modelInfos: ModelInfo[]): void;
  getModelInfo(provider: string, modelId: string): ModelInfo | null;
  getModelsByProvider(provider: string): ModelInfo[];
  findModelsWithCapabilities(requiredCapabilities: ModelCapability[], provider?: string): ModelInfo[];
  validateModelCapabilities(provider: string, modelId: string, requiredCapabilities: ModelCapability[]): boolean;
  // Potentially methods to suggest best fit based on criteria (cost, context, etc.)
  suggestBestModel(criteria: { capabilities: ModelCapability[], preferences?: ModelPreferences, costPrefs?: CostPreferences }): ModelInfo | null;
  getAllModelsForUI(): ModelUIInfo[];
  // ... other helper methods
}
```

### 3.4 Model Information Schema (Includes Cost)

```typescript
export interface ModelInfo {
  id: string; // Model identifier (e.g., 'gpt-4o')
  provider: string; // Provider name (e.g., 'openai')
  capabilities: ModelCapability[];
  contextWindow: number; // Tokens
  maxOutputTokens?: number; // Tokens
  costPerInputToken?: number; // Cost per 1K input tokens (USD) - For estimation
  costPerOutputToken?: number; // Cost per 1K output tokens (USD) - For estimation
  supportsStreaming?: boolean; // Explicit flag if capability enum isn't sufficient
  deprecated?: boolean;
  beta?: boolean;
  releasedAt?: Date;
}

// UI-friendly format (Conceptual - details may vary)
export interface ModelUIInfo {
  id: string; // Combined e.g., 'openai/gpt-4o'
  displayName: string;
  provider: string;
  modelId: string;
  capabilities: { id: ModelCapability; displayName: string; }[];
  contextWindow: number;
  isDeprecated?: boolean;
  isBeta?: boolean;
}
```

## 4. ReasoningEngine & ModelRouter

The `ReasoningEngine` orchestrates, while the `ModelRouter` selects and interacts with models based on requirements passed down (primarily from Agent Core).
### 4.1 ReasoningEngine Responsibilities

*   Acts as the primary entry point for reasoning tasks (`call` method).
*   Receives `requiredCapabilities` primarily from the Agent Core via `EnhancedCallOptions`.
*   Optionally utilizes `QueryAnalyzer` *only if* capabilities are not provided *and* the feature is enabled (`autoDetectCapabilities: true`), serving as a default mechanism.
*   Coordinates interactions between `ModelRouter`, `CostTrackingService`, and `PromptManager`.
*   Manages the overall flow of a reasoning turn.
*   Provides APIs for external interaction.

### 4.2 ModelRouter Responsibilities

*   Receives requests from `ReasoningEngine` with query details, options, and definitive `requiredCapabilities`.
*   Consults `StateManager` for `ThreadConfig` (model/cost preferences).
*   Queries `ModelRegistry` to find suitable models.
*   Applies selection logic (preferences, capabilities, cost, potentially load balancing).
*   Handles fallback logic if the initially selected model fails (consulting `ModelRegistry` for alternatives).
*   Interacts with `ProviderFactory` to get the chosen `ProviderAdapter` instance.
*   Invokes the selected adapter's `call` or `streamCall` method.
*   Reports outcomes (success, failure, fallback details) back to `ReasoningEngine`.

### 4.3 Enhanced Call Options

```typescript
export interface EnhancedCallOptions extends CallOptions {
  // ... standard options ...
  threadId: string;
  traceId?: string;
  userId?: string;
  onThought?: (thought: string) => void;

  // Model Selection / Requirements (Set primarily by Agent Core)
  requiredCapabilities?: ModelCapability[]; // Definitive list needed for this step
  preferredProvider?: string; // Hint for the router
  preferredModel?: string; // Hint for the router
  allowFallback?: boolean; // Allow router to try alternatives on failure

  // ... common LLM parameters ...
  temperature?: number;
  maxOutputTokens?: number; // Note: Use this consistently, avoid max_tokens alias if possible
  // ...
}
```

### 4.4 Public API Example (Conceptual)

```typescript
class ReasoningEngine {
  // Constructor likely takes ModelRouter, PromptManager, QueryAnalyzer, CostTrackingService, etc.
  constructor(dependencies: ReasoningEngineDependencies);

  async call(prompt: FormattedPrompt, options: EnhancedCallOptions): Promise<string>;

  // Expose registry info for UI
  getAvailableModelsForUI(): ModelUIInfo[];
  validateModelForCapabilities(provider: string, modelId: string, requiredCapabilities: ModelCapability[]): Promise<boolean>; // Simplified validation check
}
```

## 5. ProviderFactory

The `ProviderFactory` is enhanced to integrate with the optional `EncryptedSecretsRepository`.
### 5.1 Provider Configuration (Unchanged conceptually, but `apiKey` becomes optional if using secrets repo)

```typescript
export interface ProviderConfig {
  provider: string;
  apiKey?: string; // Optional: If not provided, factory attempts retrieval from secrets repo
  options?: Record<string, any>; // Base URL, default model for adapter, etc.
}
```

### 5.2 Factory Methods & Integration

```typescript
export class ProviderFactory {
  // Constructor might take ConfigurationService and optional EncryptedSecretsRepository
  constructor(configService: ConfigurationService, secretsRepo?: EncryptedSecretsRepository);

  // Get or create a provider adapter instance
  async getProviderAdapter(providerName: string, configOverride?: Partial<ProviderConfig>): Promise<ProviderAdapter>;

  // Internal logic example for getProviderAdapter:
  // 1. Check cache for existing adapter instance for 'providerName'.
  // 2. If not cached:
  //    a. Get base config for 'providerName' from ConfigurationService.
  //    b. Merge with 'configOverride'.
  //    c. Check if apiKey is present in merged config.
  //    d. If apiKey is MISSING and secretsRepo exists:
  //       i. Try `secretsRepo.getApiKey(providerName)`.
  //       ii. If successful, use the retrieved key.
  //       iii. If retrieval fails or secretsRepo doesn't exist, throw error (API key required).
  //    e. If apiKey IS present (from config or secretsRepo):
  //       i. Instantiate the correct adapter (e.g., OpenAIAdapter) with the final config.
  //       ii. Cache and return the instance.
  // 3. Return cached instance.
}
```

### 5.3 Supported Providers (Example Instantiation - Keys handled by Factory)

```typescript
// Configuration provided to ART initialization (e.g., from .env or secure source)
const providerConfigs: ProviderConfig[] = [
  { provider: 'openai', options: { defaultModel: 'gpt-4o' } }, // API key managed elsewhere or via secrets repo
  { provider: 'anthropic', options: { defaultModel: 'claude-3-5-sonnet-20240620' } },
  // ... other providers
];

// ART internally uses ProviderFactory with these configs
```

## 6. Query Analyzer (Optional Component)

### 6.1 Role and Limitations
The `QueryAnalyzer` provides an *optional* mechanism to automatically detect potential capability requirements based *only* on the textual content of a query.

*   **Optional Convenience:** It serves as a helper for simple use cases (direct Q&A, basic instruction following) where the query text itself is the main indicator of needs (e.g., detecting an image URL implies `VISION`).
*   **Default/Fallback:** Can provide a default set of capabilities if the Agent Core logic does not specify any for a particular call *and* if `autoDetectCapabilities` is enabled.
*   **Not Definitive for Agents:** In structured agent workflows (like PES), the Agent Core's understanding of the task step (planning, synthesis, etc.) is superior. Capabilities explicitly set by the Agent Core via `EnhancedCallOptions` **always take precedence** over `QueryAnalyzer` suggestions.
*   **Configuration:** Its use can be enabled/disabled per thread via the `autoDetectCapabilities` flag in `ThreadConfig.reasoning`.

### 6.2 Capability Detection Logic
```typescript
export class QueryAnalyzer {
  // Analyze a query string to determine likely required capabilities
  analyzeQuery(query: string): ModelCapability[] {
    // Returns a *suggestion* based on text patterns.
    // Agent Core logic ultimately decides the final requiredCapabilities.
    const suggestedCapabilities = new Set<ModelCapability>([ModelCapability.TEXT]);
    // ... (pattern matching logic as before) ...
    if (query.includes('data:image') || /https?:.*\.(jpg|jpeg|png|gif|webp)/i.test(query)) {
      suggestedCapabilities.add(ModelCapability.VISION);
    }
    // ... etc ...
    return Array.from(suggestedCapabilities);
  }
}
```
**(Future Enhancement)** While the current implementation uses straightforward keyword/pattern matching for simplicity, a future iteration should explore more robust semantic matching techniques. This could involve leveraging embedding models (e.g., Nomic) to calculate the similarity between the user's query and predefined capability descriptions. By applying a minimum similarity threshold, ART could achieve more nuanced and accurate capability detection, moving beyond simple keyword presence.

### 6.3 Integration with ReasoningEngine
The `ReasoningEngine` checks `options.requiredCapabilities`. If it's missing *and* `ThreadConfig.reasoning.autoDetectCapabilities` is `true`, it *may* call `queryAnalyzer.analyzeQuery()` to get a default suggestion to pass to the `ModelRouter`. Otherwise, it passes the Agent Core-defined capabilities directly.

## 7. UI System Integration

Integration remains crucial for notifying the user about model management events.
### 7.1 Model Socket (Events Expanded)

```typescript
export type ModelEventType =
  | 'MODEL_SELECTION_INITIATED' // Router starts selection process
  | 'MODEL_SELECTED' // Final model chosen for the call
  | 'MODEL_CAPABILITY_MISMATCH' // Explicitly requested model unsuitable, fallback suggested/used
  | 'MODEL_FALLBACK_ATTEMPT' // Attempting fallback due to error
  | 'MODEL_FALLBACK_SUCCESS' // Fallback succeeded with a new model
  | 'MODEL_FALLBACK_FAILED' // Fallback attempted but failed
  | 'MODEL_ERROR' // Non-transient error from the provider API
  | 'COST_WARNING_THRESHOLD_REACHED' // Thread cost/token warning limit hit
  | 'COST_LIMIT_REACHED'; // Thread cost/token hard limit hit (call likely blocked)

export interface ModelEvent {
  type: ModelEventType;
  threadId: string; // Ensure thread context is always present
  timestamp: number;
  provider?: string;
  modelId?: string;
  requiredCapabilities?: ModelCapability[];
  suggestedModel?: string; // e.g., 'openai/gpt-4o'
  error?: string; // Error message
  cost?: number; // Current thread cost (USD)
  tokens?: number; // Current thread tokens
  limit?: number; // The limit that was reached/warned about
  limitType?: 'cost' | 'token'; // Type of limit
  metadata?: Record<string, any>;
}

// ModelSocket and UISystem structure remain conceptually similar to v0.2.4
// but handle the expanded event types.
```

### 7.2 Notifications

The `ModelRouter`, `CostTrackingService`, and `ProviderAdapters` are responsible for emitting these events via the `ObservationSystem`, which then relays relevant events to the `UISystem`'s `ModelSocket`. UI components subscribe to these events to display status, warnings, or errors.

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

## 8. Thread Configuration Enhancements
Includes flag to control the optional `QueryAnalyzer`.
### 8.1 Configuration Structure (autoDetectCapabilities Added)
```typescript
// Preferences for cost control within a thread
export interface CostPreferences { /* ... as before ... */ }

// Preferences for model selection within a thread
export interface ModelPreferences { /* ... as before ... */ }

// Reasoning-specific configuration within ThreadConfig
export interface ReasoningConfig {
  modelPreferences?: ModelPreferences;
  costPreferences?: CostPreferences;
  // Flag to enable/disable the optional QueryAnalyzer for this thread
  autoDetectCapabilities?: boolean; // Defaults to false or true based on framework design decision
}

// Main Thread Configuration Interface
export interface ThreadConfig {
  // ... other existing fields ...
  reasoning?: ReasoningConfig;
  enabledTools?: string[];
  // ... other subsystem configurations
}
```

### 8.2 Setting Preferences Example (Includes autoDetectCapabilities)
```typescript
await stateManager.updateThreadConfig('thread-123', {
  reasoning: {
    modelPreferences: { /* ... */ },
    costPreferences: { /* ... */ },
    autoDetectCapabilities: false // Explicitly disable QueryAnalyzer for this structured agent thread
  }
});
```

## 9. Usage Scenarios (Updated Examples)
Scenarios where Agent Core defines capabilities (like 9.2, 9.3, 9.6) remain largely the same, emphasizing that `requiredCapabilities` is set in the options.
Scenarios relying on auto-detection (like 9.1, 9.5) should mention that `autoDetectCapabilities` must be enabled and no capabilities were explicitly provided by the caller.

### Example 9.1 (Revised - Auto-Detection Context)
```typescript
// Assumes autoDetectCapabilities is TRUE for this thread/globally
// and Agent Core does NOT specify requiredCapabilities for this simple call.
await art.process({
  query: "Write a short python script to list files in a directory.",
  threadId: 'thread-basic',
});
// Outcome: ReasoningEngine sees no requiredCapabilities, calls QueryAnalyzer (detects CODE).
// ModelRouter receives CODE, selects appropriate model.
```
### Example 9.2 (Capability Preference + Cost Control)
```typescript
// Thread configured with preference for REASONING and cost limits
await art.stateManager.updateThreadConfig('thread-costly', {
  reasoning: {
    modelPreferences: {
      preferredModels: { [ModelCapability.REASONING]: { provider: 'anthropic', modelId: 'claude-3-opus-20240229' } }
    },
    costPreferences: { maxCostPerCall: 0.10, maxTokensPerThread: 50000 }
  }
});

await art.process({
  query: "Analyze the ethical implications of AI in hiring.",
  threadId: 'thread-costly',
  options: { requiredCapabilities: [ModelCapability.REASONING] } // Explicit capability set by Agent Core
});
// Outcome: ReasoningEngine passes REASONING directly to ModelRouter.
// ModelRouter prioritizes Claude Opus. CostTrackingService monitors usage.
// If a call exceeds $0.10 or thread exceeds 50k tokens, an error/warning occurs.
```
### Example 9.3 Fallback Scenario
```typescript
// Assume OpenAI is configured as default, but is currently down.
await art.process({
  query: "Summarize this article: [link]",
  threadId: 'thread-fallback',
  options: { allowFallback: true } // Explicitly allow fallback
});
// Outcome: ModelRouter tries OpenAI (default). Adapter call fails.
// Router consults ModelRegistry for alternatives with TEXT capability.
// Selects another provider (e.g., Anthropic), gets adapter via ProviderFactory.
// Makes call with Anthropic. UI receives MODEL_FALLBACK_ATTEMPT/SUCCESS events.
```
### Example 9.4 Using Encrypted Secrets (Conceptual)
```typescript
// 1. Application startup/user login - Unlock the secrets repository
try {
  await art.secrets.unlockWithPassword(userProvidedPassword);
} catch (error) {
  // Handle incorrect password
}

// 2. Configure ProviderFactory to use the repository (done during ART init)

// 3. Process a query - API key retrieved automatically if needed
await art.process({
  query: "Translate this to French: Hello world",
  threadId: 'thread-secrets',
  options: { preferredProvider: 'openai' } // No API key passed directly
});
// Outcome: ProviderFactory sees no API key for OpenAI in config, calls
// art.secrets.getApiKey('openai'), decrypts stored key, and uses it.
```
### Example 9.5 (Revised - Auto-Detection Context)
```typescript
// Assumes autoDetectCapabilities is TRUE for this thread/globally
// and Agent Core does NOT specify requiredCapabilities.
await art.process({
  query: "Can you write a JavaScript function that finds the longest common subsequence between two strings?",
  threadId: 'thread-coding-auto',
});
// Outcome: ReasoningEngine sees no requiredCapabilities, calls QueryAnalyzer (detects CODE).
// ModelRouter receives CODE, selects appropriate model.
```
## 10. Error Handling & Fallback Strategies

### 10.1 Error Categorization

Adapters and the `ModelRouter` should categorize errors:

*   **Transient:** Network timeouts, temporary server errors (5xx), rate limits (maybe retryable).
*   **Configuration/Auth:** Invalid API key (401/403), invalid model ID.
*   **Request:** Bad request (400), capability mismatch, content filtering.
*   **Fatal:** Unrecoverable errors.

### 10.2 Retry & Fallback Logic (`ModelRouter`)

1.  **Initial Call:** Attempt call with the selected model/provider.
2.  **On Transient Error:** Apply retry logic (e.g., exponential backoff for N attempts). Log observations.
3.  **On Persistent Transient / Request / Config Error:**
    *   If `allowFallback` is `true`:
        *   Log observation (`MODEL_FALLBACK_ATTEMPT`).
        *   Query `ModelRegistry` for alternative models (same provider first, then others) matching capabilities and preferences.
        *   If alternatives found, select the best one, get adapter via `ProviderFactory`, and retry the call (goto step 1 with new model). Log `MODEL_FALLBACK_SUCCESS` or continue fallback on failure.
        *   If no suitable alternatives, log `MODEL_FALLBACK_FAILED` and propagate the final error.
    *   If `allowFallback` is `false`: Propagate the error immediately.
4.  **On Fatal Error:** Propagate error immediately.

**(Future Consideration: Fallback Consent)** A critical aspect to address in a future iteration is user consent for automatic fallback. When a primary model/provider fails or is deemed unsuitable (e.g., due to capability mismatch), ART might automatically switch to an alternative. However, this switch could have implications for cost, performance, data privacy (depending on the providers involved), or simply user expectation. Future work should define mechanisms for obtaining user consent before initiating fallbacks. This might involve:
*   Configurable consent levels per-thread (e.g., 'always allow automatic fallback', 'ask once per thread', 'never allow automatic fallback').
*   Clear UI notifications when a fallback occurs, even if pre-approved.
*   Careful design regarding the user experience of requesting and managing consent. This functionality is considered out of scope for the current model management definition but is important for robust, user-centric applications.

### 10.3 UI Error Handling

Errors are communicated via `ModelSocket` (`MODEL_ERROR`, `MODEL_FALLBACK_FAILED`) allowing the UI to display appropriate messages or take action.

## 11. Cost & Token Tracking

### 11.1 CostTrackingService

*   **Responsibilities:**
    *   Receive usage data (input/output tokens) from adapters after successful calls.
    *   Estimate costs based on token counts and `ModelInfo` pricing data (acknowledging potential inaccuracies vs provider billing).
    *   Aggregate costs and token counts per thread (and potentially other dimensions like user ID).
    *   Store/log data as needed (potentially using `StorageSystem`).
    *   Provide methods to query current usage/cost (e.g., `getThreadUsage(threadId)`).
    *   Enforce budget limits (both currency **and token-based**, e.g., `maxCostPerCall`, `maxTokensPerCall`, `maxCostPerThread`, `maxTokensPerThread`) defined in `ThreadConfig.costPreferences`. This check might occur in the `ModelRouter` before the call (estimation) and/or in the service after the call (actual).
    *   Emit events (`COST_WARNING_THRESHOLD_REACHED`, `COST_LIMIT_REACHED`) via the `ObservationSystem` / `ModelSocket`.
*   **(Implementation Note)** The precise behavior for enforcing cost and token limits (e.g., whether to perform pre-call estimation vs. post-call checks, and whether to trigger a hard stop or just issue a warning via the Observation System) will require detailed refinement during the actual implementation phase. The `CostPreferences` structure, however, provides the necessary configuration framework for defining these limits.

## 12. Optional Encrypted API Key Management

*(This section details the proposal for built-in, encrypted API key storage using the Storage System and SubtleCrypto, as outlined in the previous strategy document.)*

### 12.1 Goals
*   **Security:** Store keys encrypted (e.g., AES-GCM) using a key derived from a user-provided master password (not stored by ART).
*   **Convenience:** Simplify setup for certain use cases via ART APIs.
*   **Flexibility:** Allow easy opt-out in favor of external key management.

### 12.2 Proposed Functionality & Workflow
1.  **Master Key Requirement:** Requires user interaction to provide a master password for key derivation (e.g., PBKDF2) and session key management. ART does not store the master password.
2.  **Storage Collection:** Use a dedicated collection (e.g., `art_encrypted_secrets`) in the configured `StorageAdapter`.
3.  **`EncryptedSecretsRepository`:**
    *   Instantiated with `StorageAdapter`. Requires unlocking via master password.
    *   Methods: `saveApiKey(provider, key)`, `getApiKey(provider)`, `deleteApiKey(provider)`.
    *   Handles encryption/decryption using `SubtleCrypto` and the derived session key.
4.  **ART Client Access:** Expose repository via `art.secrets`. Application manages master password UI.
5.  **Factory Integration:** `ProviderFactory` calls `art.secrets.getApiKey()` if `apiKey` is missing in config. May trigger unlock prompt.
6.  **Opt-Out:** Providing `apiKey` directly in `ProviderConfig` bypasses the repository.

### 12.3 Security Considerations
*   Relies on standard browser crypto (`SubtleCrypto`).
*   Security hinges entirely on the user's master password strength and management.
*   Encrypted data is still accessible in browser storage (e.g., IndexedDB) via dev tools.
*   Requires careful session management for the derived key.
*   **Recommendation:** Document clearly as a convenience feature with inherent client-side limitations. Strongly recommend external/server-side key management for production/high-security applications.
## 13. Conclusion
This enhanced Model Management strategy transforms ART's interaction with LLMs... Key benefits include:

1.  **Intelligent Routing:** Dynamic selection primarily driven by Agent Core requirements, with optional assistance from `QueryAnalyzer`.
2.  **Centralized Control:** Unified configuration and optional secure key storage.
3.  **Increased Robustness:** Sophisticated error handling, retries, and fallback.
4.  **Optimized Usage:** Streaming support and comprehensive cost/token budget controls.
5.  **Enhanced Observability:** Clear visibility through detailed observations and UI events.

By implementing these enhancements, ART will provide developers with a significantly more powerful and flexible platform... while adhering to its core principles of modularity, developer convenience, and allowing Agent Core logic to dictate primary model needs.
