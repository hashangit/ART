# ART Framework v0.2.5: Enhanced Model Management - Implementation Checklist

## Phase 1: Core Types & Interface Definitions

*   [ ] **1.1 Define `EncryptedSecretsRepository` Interface:**
    *   File: `src/core/interfaces.ts` (or `src/systems/storage/interfaces.ts`)
    *   Define contract for secure client-side credential storage (methods: `isLocked`, `unlockWithPassword`, `lock`, `saveApiKey`, `getApiKey`, `deleteApiKey`).
*   [ ] **1.2 Modify `ProviderAdapter` Interface:**
    *   File: `src/core/interfaces.ts`
    *   Add optional methods: `listModels?`, `pullModel?`, `deleteModel?`, `abortRequest?`.
*   [ ] **1.3 Modify `CallOptions` Interface:**
    *   File: `src/types/index.ts`
    *   Add optional fields: `requestId?`, `images?`, `tools?`, `onChunk?`, `abortSignal?`, `responseSchema?`. Keep `onThought?`.
*   [ ] **1.4 Define New Supporting Types:**
    *   File: `src/types/index.ts`
    *   Add definitions for: `ImageInput`, `StreamChunk`, `ProviderModelInfo`, `ModelInfo` (comprehensive), `PullModelOptions`, `PullProgress`.
*   [ ] **1.5 Define/Update Configuration Types:**
    *   File: `src/types/index.ts` (or `src/config/types.ts`)
    *   Define: `ProviderInstanceConfig`, `ModelPreferences` (incl. `fallbackInstances`), `CostPreferences`, `ThreadReasoningConfig`.
    *   Update `ThreadConfig` to use `ThreadReasoningConfig`.
*   [ ] **1.6 Define `ModelRegistryRepository` Interface:**
    *   File: `src/core/interfaces.ts` (or `src/systems/storage/interfaces.ts`)
    *   Define `IModelRegistryRepository` contract for persisting `ModelInfo` (methods: `getModel`, `saveModel`, `deleteModel`, `queryModels`).

## Phase 2: Core Architectural Refactoring

*   [ ] **2.1 Implement `ProviderInstanceManager`:**
    *   File: `src/core/provider-instance-manager.ts`
    *   Create class to instantiate/manage adapters based on `ProviderInstanceConfig[]`.
    *   Handle `isLocal` constraint, optional `EncryptedSecretsRepository` for API keys.
    *   Implement `initialize`, `getProvider`.
    *   Add unit tests (mock adapters/repo).
*   [ ] **2.2 Refactor `AgentFactory`:**
    *   File: `src/core/agent-factory.ts`
    *   Update `AgentFactoryConfig` import.
    *   Accept `providers: ProviderInstanceConfig[]`.
    *   Instantiate and initialize `ProviderInstanceManager`.
    *   Inject `ProviderInstanceManager` into `ReasoningEngineImpl`.
    *   Update `createArtInstance` function.
    *   Update tests.
*   [ ] **2.3 Refactor `ReasoningEngine` (Initial):**
    *   File: `src/systems/reasoning/ReasoningEngine.ts`
    *   Inject `ProviderInstanceManager`, `StateManager`.
    *   Modify `call` to load `ThreadContext`, determine `targetInstanceId` (use directly for now, defer Router), get adapter via `ProviderInstanceManager`, call `adapter.call()`.
    *   Update tests.

## Phase 3: Foundational Reasoning Components

*   [ ] **3.1 Implement `ModelRegistryRepository`:**
    *   File: `src/systems/storage/repositories/ModelRegistryRepository.ts`
    *   Implement `IModelRegistryRepository` using injected `StorageAdapter`.
    *   Perform CRUDQ operations on `ModelInfo` in collection `art_model_registry`.
    *   Add unit tests (mock adapter).
*   [ ] **3.2 Implement `ModelRegistry`:**
    *   File: `src/systems/reasoning/ModelRegistry.ts`
    *   Inject `ModelRegistryRepository`.
    *   Implement `initialize()` (load from static config, e.g., `src/config/default-models.json` - **confirm/create file**).
    *   Implement methods: `registerModel`, `getModelInfo`, `findModelsWithCapabilities`, `validateModelCapabilities`, `getAllModelsForUI`.
    *   Add unit tests.
*   [ ] **3.3 Implement `CostTrackingService`:**
    *   File: `src/systems/reasoning/CostTrackingService.ts`
    *   Inject `ModelRegistry`, `ObservationManager`.
    *   Implement `recordUsage`, calculate cost, store usage in-memory.
    *   Implement `getThreadUsage`, budget checks against `CostPreferences`, record warnings via `ObservationManager`.
    *   Add unit tests.
*   [ ] **3.4 Implement `ModelRouter`:**
    *   File: `src/systems/reasoning/ModelRouter.ts`
    *   Inject `ModelRegistry`, `StateManager`, `CostTrackingService`.
    *   Implement `selectProviderInstance`: Get `ThreadConfig`, filter registry by capabilities, apply `ModelPreferences` (incl. fallbacks), apply basic cost preference, select candidate.
    *   Implement basic reactive fallback.
    *   Add unit tests.
*   [ ] **3.5 Integrate Router & Cost Service into `ReasoningEngine`:**
    *   File: `src/systems/reasoning/ReasoningEngine.ts`
    *   Inject `ModelRouter`, `CostTrackingService`.
    *   Update `call`: Use `ModelRouter.selectProviderInstance`, pass `CostPreferences` to `CostTrackingService`, call `costTrackingService.recordUsage`. Handle routing/fallback results.
    *   Update integration tests.

## Phase 4: Ollama Adapter Implementation

*   [ ] **4.1 Install Dependency:** `npm install ollama`.
*   [ ] **4.2 Implement `OllamaAdapter`:**
    *   File: `src/adapters/reasoning/ollama.ts`
    *   Implement `ProviderAdapter`.
    *   `call`: Map inputs, handle `AbortSignal`, images, tools, streaming (`onChunk`), thought parsing (`onThought`), temporary client for aborts, report usage.
    *   `listModels`: Implement using `ollama.list()`.
    *   `pullModel`: Implement using `ollama.pull()`, handle `onProgress`.
    *   `deleteModel`: Implement using `ollama.delete()`.
    *   `abortRequest`: Implement using temporary client map.
*   [ ] **4.3 Implement `ollama.test.ts`:**
    *   File: `src/adapters/reasoning/ollama.test.ts`
    *   Write comprehensive unit tests mocking `ollama` library.
*   [ ] **4.4 Integrate Factory:**
    *   File: `src/core/provider-instance-manager.ts`
    *   Add `'ollama'` case in `initialize`, import `OllamaAdapter`.
*   [ ] **4.5 Add TODOs:** Note application-layer integration points in code.

## Phase 5: Gemini Adapter Enhancements

*   [ ] **5.1 Modify `GeminiAdapter.call`:**
    *   File: `src/adapters/reasoning/gemini.ts`
    *   Update streaming loop to differentiate thoughts (`onThought`) vs content (`onChunk`) if possible.
    *   Handle `responseSchema` in `CallOptions` by adding relevant `generationConfig` parameters. Parse JSON if requested.
    *   Update unit tests.

## Phase 6: Other Adapter Updates

*   [ ] **6.1 Update Existing Adapters (`OpenAI`, `Anthropic`, `DeepSeek`, `OpenRouter`):**
    *   Files: `src/adapters/reasoning/*.ts` (excluding ollama, gemini)
    *   Add stub implementations for `listModels`, `pullModel`, `deleteModel`.
    *   Implement `abortRequest` using `AbortController` on internal `fetch` if applicable, otherwise stub.
    *   Ensure `call` accepts updated `CallOptions` and passes `abortSignal` to `fetch`.
    *   Update tests.

## Phase 7: Subsystem Integrations

*   [ ] **7.1 Update `StateManager`:**
    *   Files: `src/systems/context/managers/StateManager.ts`, `src/core/interfaces.ts`
    *   Modify `loadThreadContext` for new `ThreadConfig`.
    *   Implement `updateThreadReasoningPreferences`.
    *   Update tests.
*   [ ] **7.2 Enhance `ObservationManager` / Add Events:**
    *   Files: `src/systems/observation/observation-manager.ts`, relevant components.
    *   Ensure `record` handles new event types/metadata.
    *   Add `record` calls for `MODEL_ROUTE_DECISION`, `COST_WARNING`, `MODEL_PULL_PROGRESS`, etc.
*   [ ] **7.3 Implement `ModelSocket`:**
    *   File: `src/systems/ui/model-socket.ts`
    *   Create class extending `TypedSocket<ModelEvent, ModelEventType | ModelEventType[]>`. Define `ModelEvent`.
*   [ ] **7.4 Integrate `ModelSocket` Notifications:**
    *   Files: `src/systems/observation/observation-manager.ts` (or components).
    *   Modify components/manager to call `uiSystem.getModelSocket().notify(eventData)` for relevant events.
    *   Verify with tests.
*   [ ] **7.5 Update `UISystem`:**
    *   Files: `src/systems/ui/ui-system.ts`, `src/core/interfaces.ts`
    *   Instantiate `ModelSocket`. Add `getModelSocket()` getter.

## Phase 8: Optional Components

*   [ ] **8.1 (Optional) Implement `QueryAnalyzer`:**
    *   File: `src/systems/reasoning/QueryAnalyzer.ts`
    *   Implement basic pattern matching. Add tests. Integrate optionally into `ReasoningEngine.call`.
*   [ ] **8.2 (Optional) Implement `EncryptedSecretsRepository`:**
    *   File: `src/systems/storage/repositories/EncryptedSecretsRepository.ts`
    *   Implement interface using `StorageAdapter` and `SubtleCrypto`. Add tests. Integrate optionally with `ProviderInstanceManager`. Document security implications.

## Phase 9: Final Testing & Documentation

*   [ ] **9.1 Integration Testing:** Test multi-provider flow, routing, fallbacks, cost checks, Ollama features end-to-end (mocking external APIs).
*   [ ] **9.2 E2E Testing:** Update `e2e-test-app` and Playwright tests for new features and events.
*   [ ] **9.3 Documentation Update:** Update README, Architecture docs, Guides, API Ref. Add/Update TODOs. Defer Speculative Decoding explicitly.
*   [ ] **9.4 Code Review & Refinement:** Address quality, consistency, performance.
*   [ ] **9.5 Final Build & Release Prep:** Verify build, update `changelog.md`, bump version to 0.2.5.