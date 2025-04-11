## ART Framework v0.2.5: Implementation Plan - Enhanced Model Management (v1.2 - Detailed)

**Version:** 1.2
**Date:** 2025-04-11 (Detailed for Coder LLM)

**1. Goal & Overview:**

Implement the enhanced Model Management strategy for ART v0.2.5. This involves refactoring the core Reasoning System to support multiple concurrent provider instances, introducing foundational intelligent routing capabilities (`ModelRouter`, `ModelRegistry`), adding comprehensive Ollama support (list, pull, delete, abort, streaming, images, tools), enhancing other adapters (Gemini), implementing basic cost tracking, integrating an optional encrypted API key repository, and ensuring seamless integration with existing ART subsystems (Context, Storage, Observation, UI). Speculative Decoding is explicitly deferred.

**Reference Documents:** (Assume coder LLM has access to these)

*   This conversation thread.
*   `ART-Concept/*` documents (Vision, v0.2.4 Overview, v0.2.5 Proposal, Flows)
*   `ART-Framework-Checklist-v0.2.4.html`
*   `changelog.md`
*   Existing v0.2.4 source code (`src/`).

**2. Implementation Phases:**

---

**Phase 1: Core Types & Interface Definitions**

*   **Goal:** Define/update the necessary data structures and contracts.
*   **Why:** Establishes the foundation and ensures type safety.
*   **Dependencies:** Existing `src/types/index.ts`, `src/core/interfaces.ts`.

*   **Steps:**

    1.  **Define `EncryptedSecretsRepository` Interface:**
        *   **File(s):** `src/core/interfaces.ts` (or potentially `src/systems/storage/interfaces.ts`)
        *   **Analysis:** Define the contract for secure, client-side credential storage.
        *   **Implementation:** Add the following interface definition:
            ```typescript
            /** Optional: Interface for managing encrypted credentials client-side. */
            export interface EncryptedSecretsRepository {
              /** Checks if the repository is currently locked. */
              isLocked(): Promise<boolean>;
              /** Attempts to unlock the repository using a password to derive the key. */
              unlockWithPassword(password: string): Promise<void>;
              /** Locks the repository, discarding the session key. */
              lock(): Promise<void>;
              /** Saves or updates an API key, encrypting it before storage. */
              saveApiKey(providerInstanceId: string, key: string): Promise<void>;
              /** Retrieves and decrypts an API key. Throws if locked. */
              getApiKey(providerInstanceId: string): Promise<string | null>;
              /** Deletes a stored API key. */
              deleteApiKey(providerInstanceId: string): Promise<void>;
            }
            ```
        *   **Post-Check:** Interface defined and exported.
    2.  **Modify `ProviderAdapter` Interface:**
        *   **File(s):** `src/core/interfaces.ts`
        *   **Analysis:** Extend the existing interface with optional methods for model management and cancellation.
        *   **Implementation:** Add the following *optional* method signatures to the `ProviderAdapter` interface: `listModels?(): Promise<ProviderModelInfo[]>;`, `pullModel?(modelName: string, options?: PullModelOptions): Promise<void>;`, `deleteModel?(modelName: string): Promise<void>;`, `abortRequest?(requestId: string): Promise<void>;`
        *   **Post-Check:** Interface updated.
    3.  **Modify `CallOptions` Interface:**
        *   **File(s):** `src/types/index.ts`
        *   **Analysis:** Extend with fields needed for new features (images, tools, streaming, abort).
        *   **Implementation:** Add the following *optional* fields: `requestId?: string;`, `images?: ImageInput[];`, `tools?: ToolSchema[];`, `onChunk?: (chunk: StreamChunk) => void;`, `abortSignal?: AbortSignal;`, `responseSchema?: JsonSchema;`. Keep `onThought?`.
        *   **Post-Check:** Interface updated.
    4.  **Define New Supporting Types:**
        *   **File(s):** `src/types/index.ts`
        *   **Analysis:** Define structures needed for the new features.
        *   **Implementation:** Add definitions for: `ImageInput`, `StreamChunk`, `ProviderModelInfo`, `ModelInfo` (comprehensive), `PullModelOptions`, `PullProgress`.
        *   **Post-Check:** Types defined and exported.
    5.  **Define/Update Configuration Types:**
        *   **File(s):** `src/types/index.ts` (or dedicated `src/config/types.ts`)
        *   **Analysis:** Define the new multi-provider config structure and update `ThreadConfig`.
        *   **Implementation:** Define `ProviderInstanceConfig`. Define `ModelPreferences` (including `fallbackInstances`). Define `CostPreferences`. Define `ThreadReasoningConfig` (using `instanceId`, `model?`, `parameters?`, `modelPreferences?`, `costPreferences?`, `autoDetectCapabilities?`). Update `ThreadConfig` to use `ThreadReasoningConfig`.
        *   **Post-Check:** Configuration types defined/updated and exported.
    6.  **Define `ModelRegistryRepository` Interface:**
        *   **File(s):** `src/core/interfaces.ts` (or `src/systems/storage/interfaces.ts`)
        *   **Analysis:** Define the contract for persisting `ModelInfo`.
        *   **Implementation:** Add interface `IModelRegistryRepository` with methods like `getModel(id: string)`, `saveModel(model: ModelInfo)`, `deleteModel(id: string)`, `queryModels(filter: FilterOptions)`.
        *   **Post-Check:** Interface defined.

---

**Phase 2: Core Architectural Refactoring**

*   **Goal:** Refactor `AgentFactory`, `ReasoningEngine` for multi-provider support via `ProviderInstanceManager`.
*   **Why:** Enables core multi-provider capability.
*   **Dependencies:** Phase 1.

*   **Steps:**
    1.  **Implement `ProviderInstanceManager`:**
        *   **File(s):** `src/core/provider-instance-manager.ts`
        *   **Analysis:** Needs to instantiate adapters based on config, enforce `isLocal` constraint, provide instances. Requires adapter classes and `ProviderInstanceConfig`. Optionally needs `EncryptedSecretsRepository`.
        *   **Implementation:** Create the class. Constructor optionally accepts `EncryptedSecretsRepository`. Implement `initialize(configs: ProviderInstanceConfig[])`: Loop through `configs`. Auto-detect `isLocal` for 'ollama' if not set. Check `isLocal` constraint. If `apiKey` is missing and `secretsRepo` is available and unlocked, call `secretsRepo.getApiKey(config.id)`. Instantiate correct `ProviderAdapter` (import necessary adapter classes). Store instance in `Map<string, ProviderAdapter>`. Implement `getProvider(instanceId)`. Handle initialization errors gracefully.
        *   **Post-Check:** Class implemented, unit tests pass (mock adapters, repo).
    2.  **Refactor `AgentFactory`:**
        *   **File(s):** `src/core/agent-factory.ts`
        *   **Analysis:** Needs to use `ProviderInstanceManager` instead of instantiating a single adapter. `AgentFactoryConfig` type needs update.
        *   **Implementation:** Update `AgentFactoryConfig` import. Change constructor to accept `providers: ProviderInstanceConfig[]`. In `initialize()`, instantiate `ProviderInstanceManager` (passing optional `EncryptedSecretsRepository` if provided to factory). Call `providerInstanceManager.initialize(this.config.providers)`. Remove `providerAdapter` property. Inject `ProviderInstanceManager` into `ReasoningEngineImpl` constructor. Update `createArtInstance` function.
        *   **Post-Check:** Factory initializes manager. Tests updated/pass.
    3.  **Refactor `ReasoningEngine`:**
        *   **File(s):** `src/systems/reasoning/ReasoningEngine.ts`
        *   **Analysis:** Needs `ProviderInstanceManager`, `StateManager`. `call` method needs to dispatch dynamically.
        *   **Implementation:** Inject `ProviderInstanceManager`, `StateManager` in constructor. Modify `call`: Load `ThreadContext` via `StateManager`. Determine `targetInstanceId`. *(Defer Router)* Use `instanceId` directly for now. Get `adapter` via `ProviderInstanceManager`. Handle errors. Prepare final `CallOptions`. Call `adapter.call()`. *(Defer Cost)*
        *   **Post-Check:** Engine dispatches correctly. Tests updated/pass.

---

**Phase 3: Foundational Reasoning Components**

*   **Goal:** Implement basic `ModelRegistry`, `ModelRouter`, `CostTrackingService`.
*   **Why:** Provides core logic for selection, capability awareness, cost tracking.
*   **Dependencies:** Phase 1, Phase 2, Storage System, `ObservationManager`.

*   **Steps:**
    1.  **Implement `ModelRegistryRepository`:**
        *   **File(s):** `src/systems/storage/repositories/ModelRegistryRepository.ts`
        *   **Analysis:** Needs `StorageAdapter`, `ModelInfo` type, `IModelRegistryRepository` interface.
        *   **Implementation:** Create class implementing `IModelRegistryRepository`. Use injected `StorageAdapter` for CRUDQ operations on `ModelInfo` in collection `art_model_registry`.
        *   **Post-Check:** Repository implemented, unit tests pass (mock adapter).
    2.  **Implement `ModelRegistry`:**
        *   **File(s):** `src/systems/reasoning/ModelRegistry.ts`
        *   **Analysis:** Needs `ModelRegistryRepository`, `ModelInfo` type, static config loading logic.
        *   **Implementation:** Inject `ModelRegistryRepository`. Implement `initialize()`: Load initial data from static config file (e.g., `src/config/default-models.json`). Implement `registerModel`, `getModelInfo`, `findModelsWithCapabilities`, `validateModelCapabilities`, `getAllModelsForUI` using the repository. Add TODOs for dynamic updates.
        *   **Post-Check:** Registry loads data, methods work. Unit tests pass.
    3.  **Implement `CostTrackingService`:**
        *   **File(s):** `src/systems/reasoning/CostTrackingService.ts`
        *   **Analysis:** Needs `ModelRegistry`, `ObservationManager`, `CostPreferences`, `ModelInfo`.
        *   **Implementation:** Inject `ModelRegistry`, `ObservationManager`. Implement `recordUsage(...)`. Calculate cost using `ModelRegistry`. Store usage in-memory `Map<string, { tokens: number; cost: number }>`. Implement `getThreadUsage`. Implement budget checks against `CostPreferences` (passed in) and call `observationManager.record` for warnings. Add TODOs for persistence/enforcement.
        *   **Post-Check:** Service tracks usage, checks budgets, emits observations. Unit tests pass.
    4.  **Implement `ModelRouter`:**
        *   **File(s):** `src/systems/reasoning/ModelRouter.ts`
        *   **Analysis:** Needs `ModelRegistry`, `StateManager`, `CostTrackingService`, `ModelPreferences`, `ModelCapability`.
        *   **Implementation:** Inject dependencies. Implement `selectProviderInstance(...)`: Get `ThreadConfig`. Filter `ModelRegistry` by capabilities. Apply `ModelPreferences` (incl. `fallbackInstances` logic). Apply basic cost preference. Select best candidate `instanceId`/`modelId`. Implement basic reactive fallback. Add TODOs for advanced routing.
        *   **Post-Check:** Router performs selection/fallback. Unit tests pass.
    5.  **Integrate Router & Cost Service into `ReasoningEngine`:**
        *   **File(s):** `src/systems/reasoning/ReasoningEngine.ts`
        *   **Analysis:** `ReasoningEngine.call` needs modification.
        *   **Implementation:** Inject `ModelRouter`, `CostTrackingService`. Update `call`: Use `ModelRouter.selectProviderInstance`. Pass `CostPreferences` to `CostTrackingService` for checks. Call `costTrackingService.recordUsage` on success. Handle routing/fallback results.
        *   **Post-Check:** Engine uses Router/Cost Service. Integration tests updated/pass.

---

**Phase 4: Ollama Adapter Implementation**

*   **Goal:** Add full Ollama support.
*   **Why:** Key requirement, enables local LLMs.
*   **Dependencies:** Phase 1, `ollama` npm package.

*   **Steps:**
    1.  **(Install)** Dependency: `npm install ollama`.
    2.  **(Implement)** `OllamaAdapter`:
        *   **File(s):** `src/adapters/reasoning/ollama.ts`
        *   **Analysis:** Needs `ProviderAdapter` interface, `ollama` library API, `CallOptions` fields (`images`, `tools`, `abortSignal`, `onChunk`, `onThought`, `requestId`), `ProviderInstanceConfig`. Needs temporary client strategy for aborts.
        *   **Implementation:** Implement `ProviderAdapter`. Constructor takes `ProviderInstanceConfig`, initializes main `Ollama` client.
            *   `call`: Map `FormattedPrompt`/`CallOptions` to `ollama.chat`. Handle `AbortSignal`. Handle `images`. Handle `tools`. Handle streaming (`onChunk`). Parse `<think>` tags for `onThought`. Use temporary client for streaming aborts (store `Map<string, OllamaClient>` keyed by `requestId`). Report usage (0 cost default).
            *   `listModels`: Call `ollama.list()`, map to `ProviderModelInfo[]`.
            *   `pullModel`: Call `ollama.pull()`, handle `onProgress`.
            *   `deleteModel`: Call `ollama.delete()`.
            *   `abortRequest`: Find temporary client by `requestId`, call `tempClient.abort()`, remove from map. Log warning if `AbortSignal` was expected but this method was called.
        *   **Post-Check:** Adapter implemented.
    3.  **(Implement)** `ollama.test.ts`:
        *   **File(s):** `src/adapters/reasoning/ollama.test.ts`
        *   **Analysis:** Needs `vitest`, mock of `ollama` library.
        *   **Implementation:** Write comprehensive unit tests mocking `ollama`, covering all methods, streaming, aborts (incl. temporary client isolation), errors, image/tool mapping, thought parsing.
        *   **Post-Check:** Tests pass.
    4.  **(Integrate)** Factory:
        *   **File(s):** `src/core/provider-instance-manager.ts`
        *   **Implementation:** Add `'ollama'` case in `initialize`. Import `OllamaAdapter`.
        *   **Post-Check:** Factory can instantiate Ollama adapter.
    5.  **(Add)** TODOs: Add specific TODOs in code for application-layer integration points.

---

**Phase 5: Gemini Adapter Enhancements**

*   **Goal:** Improve Gemini adapter for thoughts/chunks and structured output.
*   **Why:** Enhances functionality based on discussion.
*   **Dependencies:** Phase 1 (`CallOptions`), existing `GeminiAdapter`.

*   **Steps:**
    1.  **(Modify)** `GeminiAdapter.call`:
        *   **File(s):** `src/adapters/reasoning/gemini.ts`
        *   **Analysis:** Review Gemini streaming API for thought markers. Review `generationConfig` for structured output.
        *   **Implementation:** Update streaming loop to differentiate thoughts (if possible) for `onThought` vs content for `onChunk`. Check `CallOptions.responseSchema` and add relevant `generationConfig` parameters (`responseMimeType`, `responseSchema`) to API payload. Parse JSON if requested.
        *   **Post-Check:** Adapter handles features. Unit tests updated/pass.

---

**Phase 6: Other Adapter Updates**

*   **Goal:** Ensure all adapters conform to the updated interfaces.
*   **Why:** Maintains consistency.
*   **Dependencies:** Phase 1, existing adapters.

*   **Steps:**
    1.  **(Update)** **Existing Adapters (`OpenAI`, `Anthropic`, `DeepSeek`, `OpenRouter`):**
        *   **File(s):** `src/adapters/reasoning/*.ts` (excluding ollama, gemini)
        *   **Analysis:** Compare adapter signature with updated `ProviderAdapter` interface. Check if underlying API supports abort via `AbortSignal` on `fetch`.
        *   **Implementation:** Add *stub* implementations for `listModels`, `pullModel`, `deleteModel`. Implement `abortRequest` using `AbortController` on internal `fetch` if applicable, otherwise stub it. Ensure `call` accepts updated `CallOptions` and passes `abortSignal` to `fetch`.
        *   **Post-Check:** Adapters compile, existing tests updated/pass.

---

**Phase 7: Subsystem Integrations**

*   **Goal:** Connect new reasoning capabilities with other systems.
*   **Why:** Ensures features are configurable, observable, usable.
*   **Dependencies:** Phase 1, 3, 4, 5, 6. Existing subsystems.

*   **Steps:**
    1.  **(Update)** `StateManager`:
        *   **File(s):** `src/systems/context/managers/StateManager.ts`, `src/core/interfaces.ts`
        *   **Implementation:** Modify `loadThreadContext` for new `ThreadConfig`. Implement `updateThreadReasoningPreferences(...)` delegating to `StateRepository`.
        *   **Post-Check:** Handles new config. Tests pass.
    2.  **(Enhance)** `ObservationManager` / Add Events:
        *   **File(s):** `src/systems/observation/observation-manager.ts`, relevant components (Router, Cost Service, Adapters).
        *   **Implementation:** Ensure `record` handles new event types/metadata. Add `record` calls in components for `MODEL_ROUTE_DECISION`, `COST_WARNING`, `MODEL_PULL_PROGRESS`, etc.
        *   **Post-Check:** New observations recorded correctly.
    3.  **(Implement)** `ModelSocket`:
        *   **File(s):** `src/systems/ui/model-socket.ts`
        *   **Implementation:** Create class extending `TypedSocket<ModelEvent, ModelEventType | ModelEventType[]>`. Define `ModelEvent`.
        *   **Post-Check:** Socket class implemented.
    4.  **(Integrate)** `ModelSocket` Notifications:
        *   **File(s):** `src/systems/observation/observation-manager.ts` (or components directly).
        *   **Implementation:** Modify `ObservationManager` or components to call `uiSystem.getModelSocket().notify(eventData)` for relevant observations.
        *   **Post-Check:** UI socket receives events. Tests verify.
    5.  **(Update)** `UISystem`:
        *   **File(s):** `src/systems/ui/ui-system.ts`, `src/core/interfaces.ts`
        *   **Implementation:** Instantiate `ModelSocket`. Add `getModelSocket()` getter to interface and class.
        *   **Post-Check:** `UISystem` provides the new socket.

---

**Phase 8: Optional Components**

*   **Goal:** Implement optional convenience features.
*   **Why:** Enhances developer experience.
*   **Dependencies:** Relevant core components.

*   **Steps:**
    1.  **(Optional Implement)** `QueryAnalyzer`:
        *   **File(s):** `src/systems/reasoning/QueryAnalyzer.ts`
        *   **Implementation:** Basic pattern matching. Add tests. Integrate optionally into `ReasoningEngine.call`.
        *   **Post-Check:** Works when configured.
    2.  **(Optional Implement)** `EncryptedSecretsRepository`:
        *   **File(s):** `src/systems/storage/repositories/EncryptedSecretsRepository.ts`, `src/core/interfaces.ts`
        *   **Analysis:** Requires `StorageAdapter`, `SubtleCrypto` API knowledge.
        *   **Implementation:** Implement interface using `StorageAdapter` and `SubtleCrypto` (AES-GCM, PBKDF2). Add tests. Integrate optionally with `ProviderInstanceManager`. Document security implications carefully.
        *   **Post-Check:** Repository works, Manager uses it correctly.

---

**Phase 9: Final Testing & Documentation**

*   **Goal:** Ensure stability, quality, usability.
*   **Why:** Release readiness.
*   **Dependencies:** All previous phases.

*   **Steps:**
    1.  **(Test)** **Integration Testing:** Test multi-provider flow, routing, fallbacks, cost checks, Ollama features end-to-end within the framework (mocking external APIs).
    2.  **(Test)** **E2E Testing:** Update `e2e-test-app` and tests (`playwright`) for multi-provider config, routing, Ollama streaming/abort, `ModelSocket` events.
    3.  **(Document)** **Documentation Update:** Update all relevant docs (README, Architecture, Guides, API Ref) covering multi-provider setup, configuration, `ModelRegistry`/`Router`/`CostTracking`, Ollama usage, `ModelSocket`, interface changes. Add/Update TODOs for app-layer tasks. Defer Speculative Decoding.
    4.  **(Review)** **Code Review & Refinement:** Address quality, consistency, performance.
    5.  **(Release)** **Final Build & Release Prep:** Verify build, update `changelog.md`, bump version to 0.2.5.

---

