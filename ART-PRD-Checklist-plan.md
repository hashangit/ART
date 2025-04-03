## Product Requirements Document (PRD) - ART Framework v1.0

**Version:** 1.0
**Date:** 2025-04-03

**1. Executive Summary & Project Vision**

*   **Product:** Agent Reasoning & Tooling (ART) Framework
*   **Vision:** To provide developers with a powerful, modular, and browser-first JavaScript/TypeScript framework for building sophisticated LLM-powered intelligent agents capable of complex reasoning, planning, and tool usage, running primarily client-side.
*   **Problem:** Existing agent frameworks (LangChain, AutoGen, LangGraph) often require server-side components, limiting privacy, offline capability, and ease of deployment for purely web-based applications.
*   **Solution:** ART offers a comprehensive, standalone toolkit designed for the browser environment, leveraging WebAssembly (WASM) where feasible for local processing (LLMs, vector stores) and providing robust components for building production-ready agents.
*   **Target Audience:** Web developers (JavaScript/TypeScript) building applications requiring agentic capabilities (chatbots, assistants, automation tools) directly within the browser.

**2. Goals for v1.0**

*   Deliver a stable, well-tested core framework implementing the 7 key subsystems (Agent Core, Reasoning, Tool, Context, Observation, UI, Storage).
*   Provide a robust implementation of the Plan-Execute-Synthesize (PES) reasoning pattern as the default Agent Core.
*   Establish clear, well-defined TypeScript interfaces for all major components and data models.
*   Implement foundational Storage Adapters (In-Memory, IndexedDB).
*   Implement foundational Reasoning Provider Adapters (e.g., OpenAI, potentially a placeholder for WASM LLM).
*   Implement a secure and observable Tool System with schema validation and basic execution capabilities.
*   Implement a functional Observation System capturing key execution events (Intent, Plan, Thoughts, Tool Execution, Error).
*   Implement typed UI Sockets (Observation, Conversation) for decoupled UI updates.
*   Ensure the core framework operates entirely client-side without mandatory server components.
*   Provide basic examples and documentation for getting started.

**3. Non-Goals for v1.0**

*   Implementation of *all* roadmap features (e.g., Multi-Agent Coordination, GraphAgent, advanced WASM integrations like vector DBs/LLMs are future goals).
*   Extensive library of pre-built tools (focus on the *system* first, provide 1-2 examples).
*   Sophisticated RAG capabilities beyond basic context provision (advanced RAG is roadmap).
*   Advanced checkpointing and workflow resumption.
*   UI component libraries (focus on the backend framework and UI *sockets*).
*   Server-side synchronization adapters for storage.

**4. System Architecture (v1.0)**

ART comprises 7 interconnected subsystems orchestrated by the Agent Core:

```mermaid
graph TD
    AC[Agent Core (PES)] -- Orchestrates --> RS(Reasoning System)
    AC -- Orchestrates --> TS(Tool System)
    AC -- Uses --> CS(Context System)
    AC -- Reports To --> OS(Observation System)
    AC -- Returns Result --> App(Application)

    RS -- Uses --> CS
    RS -- Reports To --> OS
    RS -- Interacts With --> LLM(LLM Provider/WASM)

    TS -- Uses --> CS
    TS -- Reports To --> OS
    TS -- Executes --> ExtTool(External Tool/WASM Env)

    CS -- Manages --> SS(Storage System)
    CS -- Manages --> RAG(Context Providers)

    OS -- Stores In --> SS
    OS -- Notifies --> UI(UI System)

    UI -- Subscribes To --> OS
    UI -- Subscribes To --> CS
    UI -- Updates --> App

    SS -- Persists Data For --> CS
    SS -- Persists Data For --> OS

    App -- Initiates --> AC
    App -- Consumes --> UI

    subgraph ART Framework
        AC
        RS
        TS
        CS
        OS
        UI
        SS
        RAG
    end
```

*   **Agent Core (AC):** Central orchestrator (PES pattern for v1.0). Manages the flow, calls other systems.
*   **Reasoning System (RS):** Handles LLM interactions (prompting, calls, parsing). Interfaces with LLM providers or local WASM models.
*   **Tool System (TS):** Manages tool definition (schema), registration, validation, and secure execution.
*   **Context System (CS):** Manages conversation history (`ConversationManager`), thread configuration/state (`StateManager`), and dynamic context (`ContextProvider`). Relies on Storage System.
*   **Observation System (OS):** Creates, manages, and broadcasts structured records (Observations) of agent activities. Relies on Storage System and notifies UI System.
*   **UI System (UI):** Provides typed sockets (`ObservationSocket`, `ConversationSocket`) for decoupled communication with the application frontend.
*   **Storage System (SS):** Provides a unified persistence layer (via Adapters) for history, state, observations, etc.

**5. Core Components Specifications (v1.0)**

*(Note: Interfaces are conceptual TypeScript signatures)*

**5.1. Agent Core (AC)**
*   **Purpose:** Orchestrate the agent's execution flow based on a chosen pattern.
*   **v1.0 Pattern:** Plan-Execute-Synthesize (PES).
*   **Key Features:**
    *   Implement the 6-stage PES flow (Initiation, Planning Context, Planning Call, Tool Execution, Synthesis Call, Finalization).
    *   Coordinate interactions between RS, TS, CS, OS.
    *   Handle top-level error management during orchestration.
    *   Manage data flow (query, history, tool results, final response) between stages.
*   **Core Interface:**
    ```typescript
    interface AgentProps {
      query: string;
      threadId: string; // Mandatory identifier
      sessionId?: string;
      userId?: string;
      traceId?: string; // For E2E tracing
      options?: AgentOptions; // Runtime overrides
      // Injected Dependencies (via Factory)
      stateManager: StateManager;
      conversationManager: ConversationManager;
      toolRegistry: ToolRegistry;
      promptManager: PromptManager;
      reasoningEngine: ReasoningEngine;
      outputParser: OutputParser;
      observationManager: ObservationManager;
      toolSystem: ToolSystem;
      // ... other dependencies
    }

    interface AgentFinalResponse {
      response: ConversationMessage; // Final AI message
      metadata: ExecutionMetadata; // Status, duration, IDs, etc.
    }

    interface ExecutionMetadata {
      threadId: string;
      traceId?: string;
      userId?: string;
      status: 'success' | 'error' | 'partial';
      totalDurationMs: number;
      llmCost?: number; // Optional cost tracking
      error?: string;
    }

    interface IAgentCore {
      process(props: AgentProps): Promise<AgentFinalResponse>;
    }
    ```
*   **Subcomponents:** `PESAgent` (implements `IAgentCore`), `AgentFactory` (constructs instances).

**5.2. Reasoning System (RS)**
*   **Purpose:** Manage all interactions with Language Models.
*   **Key Features:**
    *   Construct prompts tailored for different phases (planning, synthesis).
    *   Execute LLM calls via Provider Adapters, handling configuration (`threadId` specific).
    *   Support streaming intermediate thoughts (`onThought` callback).
    *   Parse structured output from LLM responses (intent, plan, tool calls, final answer).
    *   Provide adapters for common LLM providers (e.g., OpenAI).
*   **Core Interfaces:**
    ```typescript
    // See ART-Framework-v0.2.4.html for detailed interfaces:
    interface ReasoningEngine { call(prompt: FormattedPrompt, options: CallOptions): Promise<string>; }
    interface PromptManager { createPlanningPrompt(...); createSynthesisPrompt(...); }
    interface OutputParser { parsePlanningOutput(...); parseSynthesisOutput(...); }
    interface ProviderAdapter extends ReasoningEngine { /* Provider-specific logic */ }
    interface CallOptions { threadId: string; traceId?: string; onThought?: (thought: string) => void; /* + LLM params */ }
    type FormattedPrompt = string | object; // Represents provider-specific prompt format
    interface ParsedToolCall { callId: string; toolName: string; arguments: any; }
    ```
*   **Subcomponents:** `PromptManager`, `ReasoningEngine`, `OutputParser`, `ProviderAdapter`(s) (e.g., `OpenAIAdapter`).

**5.3. Tool System (TS)**
*   **Purpose:** Define, discover, validate, and securely execute tools.
*   **Key Features:**
    *   Define tools using JSON Schema (`ToolSchema`).
    *   Register and retrieve tool executors (`ToolRegistry`).
    *   Validate tool calls against schemas and thread permissions (`StateManager`).
    *   Execute tool logic via `IToolExecutor` interface.
    *   Capture structured results (`ToolResult`) including status, output/error, metadata.
    *   Basic security considerations (timeouts).
    *   Report execution via `ObservationManager`.
*   **Core Interfaces:**
    ```typescript
    // See ART-Framework-v0.2.4.html for detailed interfaces:
    interface ToolSchema { name: string; description: string; inputSchema: object; /* + outputSchema?, examples? */ }
    interface IToolExecutor { schema: ToolSchema; execute(input: any, context: ExecutionContext): Promise<ToolResult>; }
    interface ExecutionContext { threadId: string; traceId?: string; userId?: string; /* + credentials? */ }
    interface ToolResult { callId: string; toolName: string; status: 'success' | 'error'; output?: any; error?: string; metadata?: object; }
    interface ToolRegistry { registerTool(...); getToolExecutor(...); getAvailableTools(...): ToolSchema[]; }
    interface ToolSystem { executeTools(toolCalls: ParsedToolCall[], threadId: string, traceId?: string): Promise<ToolResult[]>; }
    ```*   **Subcomponents:** `ToolSchema`, `IToolExecutor`, `ToolRegistry`, `ToolSystem`.

**5.4. Context System (CS)**
*   **Purpose:** Manage conversation history, thread configuration/state, and dynamic context.
*   **Key Features:**
    *   Manage conversation messages per `threadId` (`ConversationManager`).
    *   Manage thread-specific configuration (LLM, tools, prompts) and persistent state (`StateManager`).
    *   Retrieve context data (history, config) for prompts and execution checks.
    *   Interact with `StorageSystem` for persistence.
    *   (v1.0) Basic context provision; advanced RAG is future.
*   **Core Interfaces:**
    ```typescript
    // See ART-Framework-v0.2.4.html for detailed interfaces:
    interface StateManager {
        loadThreadContext(threadId: string, userId?: string): Promise<ThreadContext>;
        isToolEnabled(threadId: string, toolName: string): Promise<boolean>;
        getThreadConfigValue<T>(threadId: string, key: string): Promise<T>;
        saveStateIfModified(threadId: string): Promise<void>;
        // ... potentially methods to update state/config
    }
    interface ConversationManager {
        addMessages(threadId: string, messages: ConversationMessage[]): Promise<void>;
        getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]>;
    }
    interface ThreadConfig { reasoning: object; enabledTools: string[]; historyLimit: number; systemPrompt: string; /* ... */ }
    interface AgentState { /* User preferences, non-config state */ }
    interface ThreadContext { config: ThreadConfig; state: AgentState | null; }
    interface ConversationMessage { messageId: string; threadId: string; role: 'USER' | 'AI'; content: string; timestamp: number; metadata?: object; }
    interface MessageOptions { limit?: number; beforeTimestamp?: number; }
    ```
*   **Subcomponents:** `StateManager`, `ConversationManager`, `ContextProvider` (basic implementation for v1.0).

**5.5. Observation System (OS)**
*   **Purpose:** Provide transparency into agent operations by recording key events.
*   **Key Features:**
    *   Define standard `Observation` structure and types (`INTENT`, `PLAN`, `THOUGHTS`, `TOOL_EXECUTION`, `ERROR`).
    *   Generate observations with unique IDs, timestamps, `threadId`, `traceId`.
    *   Record observations triggered by other systems (AC, RS, TS).
    *   Persist observations via `StorageSystem`.
    *   Notify `UISystem` (`ObservationSocket`) of new observations.
*   **Core Interfaces:**
    ```typescript
    // See ART-Framework-v0.2.4.html for detailed interfaces:
    enum ObservationType { INTENT = "INTENT", PLAN = "PLAN", /* ... */ }
    interface Observation { id: string; threadId: string; traceId?: string; timestamp: number; type: ObservationType; title: string; content: any; metadata?: object; }
    interface ObservationManager {
        record(observationData: Omit<Observation, 'id' | 'timestamp' | 'title'>): Promise<void>;
        getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]>;
    }
    interface ObservationFilter { types?: ObservationType[]; /* + other criteria */ }
    ```
*   **Subcomponents:** `ObservationManager`, `ObservationRepository` (uses Storage Adapter).

**5.6. UI System (UI)**
*   **Purpose:** Decouple framework events from the application UI via typed sockets.
*   **Key Features:**
    *   Provide `TypedSocket` interface for publish/subscribe pattern.
    *   Implement `ObservationSocket` (filterable by `ObservationType`, `threadId`).
    *   Implement `ConversationSocket` (filterable by `MessageRole`, `threadId`).
    *   Allow UI to subscribe to specific data streams for efficient updates.
*   **Core Interfaces:**
    ```typescript
    // See ART-Framework-v0.2.4.html for detailed interfaces:
    interface TypedSocket<DataType, FilterType = any> {
        subscribe(callback: (data: DataType) => void, filter?: FilterType, options?: { threadId?: string }): () => void; // Returns unsubscribe fn
        notify(data: DataType, options?: { targetThreadId?: string; targetSessionId?: string }): void;
        getHistory?(filter?: FilterType, options?: { threadId?: string; limit?: number }): Promise<DataType[]>;
    }
    interface ObservationSocket extends TypedSocket<Observation, ObservationType> {}
    interface ConversationSocket extends TypedSocket<ConversationMessage, 'USER' | 'AI'> {}
    interface UISystem {
        getObservationSocket(): ObservationSocket;
        getConversationSocket(): ConversationSocket;
        // potentially getStateSocket(): StateSocket;
    }
    ```
*   **Subcomponents:** `TypedSocket` (implementation), `ObservationSocket`, `ConversationSocket`.

**5.7. Storage System (SS)**
*   **Purpose:** Provide a unified, adaptable persistence layer.
*   **Key Features:**
    *   Define `StorageAdapter` interface for CRUD and query operations.
    *   Implement `InMemoryStorageAdapter` (for testing/simple use).
    *   Implement `IndexedDBStorageAdapter` (for browser persistence).
    *   Provide specialized Repositories (`ObservationRepository`, `ConversationRepository`, `StateRepository`) that use the configured adapter.
    *   Ensure data is keyed/queryable by `threadId`.
*   **Core Interfaces:**
    ```typescript
    // See ART-Framework-v0.2.4.html for detailed interfaces:
    interface StorageAdapter {
        init?(config?: any): Promise<void>;
        get<T>(collection: string, id: string): Promise<T | null>;
        set<T>(collection: string, id: string, data: T): Promise<void>;
        delete(collection: string, id: string): Promise<void>;
        query<T>(collection: string, filter: FilterOptions): Promise<T[]>;
        // Optional: clearCollection, clearAll
    }
    interface FilterOptions { filter: object; sort?: object; limit?: number; /* ... */ }
    // Repositories use the adapter internally (e.g., ConversationRepository)
    ```
*   **Subcomponents:** `StorageAdapter` (interface), `InMemoryStorageAdapter`, `IndexedDBStorageAdapter`, `ObservationRepository`, `ConversationRepository`, `StateRepository`.

**6. Core Execution Flow (PES v1.0)**

*(Based on ART-Execution-Flow-v0.2.4.html)*

1.  **Initiation & Config:** `AgentCore.process` receives `AgentProps`. `StateManager` loads `ThreadConfig` and `AgentState` for `threadId` from `StateRepository` (using `StorageAdapter`). `traceId` established.
2.  **Planning Context:** `ConversationManager` gets history for `threadId` (via `ConversationRepository`). `StateManager` provides `enabledTools` list. `ToolRegistry` provides schemas for enabled tools. `StateManager` provides `systemPrompt`.
3.  **Planning Call:** `PromptManager` creates planning prompt. `ReasoningEngine` calls LLM (using config from `StateManager`), streams `THOUGHTS` via `onThought` -> `ObservationManager.record`. `OutputParser` extracts `intent`, `plan`, `toolCalls`. `ObservationManager` records `INTENT`, `PLAN` (or `ERROR`). Observations persisted via `ObservationRepository`. `ObservationSocket` notifies UI.
4.  **Tool Execution:** `AgentCore` passes `toolCalls` to `ToolSystem`. `ToolSystem` iterates: verifies tool enabled (`StateManager`), gets executor (`ToolRegistry`), validates args (schema), executes `IToolExecutor.execute()`, captures `ToolResult`. `ObservationManager` records `TOOL_EXECUTION` (or `ERROR`). Observation persisted. `ObservationSocket` notifies UI. `ToolSystem` returns array of `ToolResult`.
5.  **Synthesis Call:** `PromptManager` creates synthesis prompt (using query, intent, plan, `toolResults`, history, system prompt). `ReasoningEngine` calls LLM, streams `THOUGHTS` -> `ObservationManager.record`. `OutputParser` extracts final response content. `ObservationManager` records `THOUGHTS` (or `ERROR` on parse fail). Observations persisted. `ObservationSocket` notifies UI.
6.  **Finalization:** `AgentCore` formats `UserMessage` and `AgentMessage` with IDs, `threadId`, metadata. `ConversationManager` saves messages (via `ConversationRepository`). `StateManager` saves modified state (via `StateRepository`). `ConversationSocket` notifies UI of both messages. `AgentCore.process` resolves with `AgentFinalResponse`.

**7. Technical Requirements & Constraints**

*   **Language:** TypeScript (latest stable version, strict mode).
*   **Environment:** Modern Web Browsers (Chrome, Firefox, Safari, Edge latest versions). Node.js compatibility for testing/tooling.
*   **Modules:** ES Modules (ESM).
*   **Build System:** Standard tool like Vite, esbuild, or Rollup.
*   **Testing:** Jest or Vitest for unit/integration tests. Playwright or Cypress for E2E browser tests.
*   **Dependencies:** Minimize external dependencies. Core logic should be self-contained.
*   **Performance:**
    *   Minimize bundle size.
    *   Optimize for low memory usage in the browser.
    *   Efficient IndexedDB operations.
    *   Asynchronous operations prioritized.
*   **Security:**
    *   Input validation for tool arguments (JSON Schema).
    *   Basic timeouts for tool execution.
    *   (Future) Sandboxing for WASM tools/code execution.
*   **WASM Integration:** Design interfaces (Reasoning Adapter, Storage Adapter) to accommodate future WASM implementations, even if v1.0 uses placeholders or external APIs initially.

**8. API Design Principles & DX**

*   **Modularity:** Components should be loosely coupled and replaceable.
*   **Clarity:** Interfaces and data models should be explicit and well-typed.
*   **Consistency:** Naming conventions and API patterns should be consistent across the framework.
*   **Extensibility:** Design for extension (e.g., adding new reasoning patterns, storage adapters, tools).
*   **Documentation:** Comprehensive TSDoc comments, conceptual documentation, and usage examples.
*   **Error Handling:** Robust error types and clear error messages. Predictable error propagation.

**9. Observability & Debugging**

*   Leverage the `ObservationSystem` for detailed event logging.
*   Include `threadId` and `traceId` in logs and observations for correlation.
*   Provide configurable logging levels.
*   Ensure error observations contain sufficient context for debugging.

**10. Testing Strategy**

*   **Unit Tests:** Test individual functions, classes, and components in isolation (mocking dependencies). High coverage for core logic (parsing, state management, prompt generation).
*   **Integration Tests:** Test interactions between components (e.g., AgentCore orchestrating RS and TS). Test full PES flow with mocked LLM/Tools. Test Storage Adapter implementations.
*   **E2E Tests:** Test the framework within a simple browser application, interacting via UI sockets and verifying persisted data in IndexedDB.
*   **Typing Tests:** Ensure TypeScript definitions are accurate and prevent invalid usage.

**11. Release Criteria (v1.0)**

*   All 7 core systems implemented with specified v1.0 features.
*   PES Agent Core implementation is stable and passes integration tests.
*   `InMemoryStorageAdapter` and `IndexedDBStorageAdapter` are functional.
*   At least one `ProviderAdapter` (e.g., OpenAI) is functional.
*   `ToolSystem` correctly validates and executes tools based on schemas.
*   `ObservationSystem` correctly records and broadcasts all specified v1.0 event types.
*   `UISystem` sockets (`ObservationSocket`, `ConversationSocket`) function correctly with type/thread filtering.
*   Core PES execution flow passes E2E tests in target browsers.
*   Basic usage documentation and examples are available.
*   Minimum defined code coverage targets are met.

**12. Future Considerations (Post v1.0)**

*   Implement features from the roadmap (GraphAgent, WASM LLMs/VectorDBs, RAG, Multi-Agent, etc.).
*   Expand the library of built-in tools and provider adapters.
*   Develop UI component libraries.
*   Implement advanced checkpointing and state synchronization.
*   Performance profiling and optimization.

---

## Granular Task Checklist - ART Framework v1.0 Implementation

*(Sequential, hierarchical checklist. Dependencies noted where critical. Status: [ ] To Do, [P] In Progress, [D] Done)*

**Phase 0: Setup & Foundation (Library Build) (Est. Complexity: Medium)**

*   [D] **0.1:** Initialize project repository (Git).
*   [D] **0.2:** Setup `package.json` for library distribution (name, version, main, module, types, exports, files, scripts, dependencies, devDependencies, peerDependencies if any).
*   [D] **0.3:** Setup TypeScript project (`tsconfig.json`) configured for library builds (e.g., declaration: true, declarationMap: true, target: ESNext, module: ESNext, outDir).
*   [D] **0.4:** Setup build toolchain for bundling the library (e.g., using `tsc` for type generation and potentially Rollup, esbuild, or tsup for bundling ESM/CJS outputs). Define build scripts in `package.json`.
    *   [D] **0.4.1:** Configure TypeScript compilation (`tsc`) for declaration files.
    *   [D] **0.4.2:** Configure bundler (e.g., Rollup/tsup) for generating different module formats (ESM, CJS).
    *   [D] **0.4.3:** Define `build` script in `package.json`.
*   [D] **0.5:** Setup testing framework (e.g., Vitest, Jest) and configuration suitable for library testing (unit/integration tests).
*   [D] **0.6:** Setup linter (ESLint) and formatter (Prettier).
*   [D] **0.7:** Define project structure (e.g., `src/core`, `src/systems/...`, `src/adapters/...`, `src/types`, `dist`).
*   [D] **0.8:** Implement basic logging utility (consider making it configurable/injectable for consumers).
*   [D] **0.9:** Implement UUID generation utility.

**Phase 1: Core Interfaces & Data Models (Est. Complexity: Medium)**

*   [D] **1.1:** Define core TypeScript types (`src/types`):
    *   [D] `ConversationMessage` (including `MessageRole` enum)
    *   [D] `Observation` (including `ObservationType` enum)
    *   [D] `ToolSchema`
    *   [D] `ToolResult`
    *   [D] `ParsedToolCall`
    *   [D] `ThreadConfig`
    *   [D] `AgentState`
    *   [D] `ThreadContext`
    *   [D] `AgentProps`
    *   [D] `AgentFinalResponse`
    *   [D] `ExecutionMetadata`
    *   [D] `ExecutionContext` (for tools)
    *   [D] `CallOptions` (for reasoning)
    *   [D] `FormattedPrompt` (type alias)
    *   [D] `FilterOptions` (for storage)
    *   [D] `MessageOptions` (for history)
    *   [D] `ObservationFilter`
*   [D] **1.2:** Define core system interfaces (`src/core` or `src/systems/<name>/interfaces.ts`):
    *   [D] `IAgentCore`
    *   [D] `ReasoningEngine`
    *   [D] `PromptManager`
    *   [D] `OutputParser`
    *   [D] `ProviderAdapter` (extends `ReasoningEngine`)
    *   [D] `IToolExecutor`
    *   [D] `ToolRegistry`
    *   [D] `ToolSystem`
    *   [D] `StateManager`
    *   [D] `ConversationManager`
    *   [D] `ObservationManager`
    *   [D] `TypedSocket`
    *   [D] `ObservationSocket` (extends `TypedSocket`)
    *   [D] `ConversationSocket` (extends `TypedSocket`)
    *   [D] `UISystem`
    *   [D] `StorageAdapter`
    *   [D] Define interfaces for Repositories (`IObservationRepository`, etc.)

**Phase 2: Foundational Systems - Storage & Base Context (Est. Complexity: Medium-High)**

*   *Dependency: Phase 1 completed.*
*   [D] **2.1: Storage System (SS)**
    *   [D] **2.1.1:** Implement `InMemoryStorageAdapter` (`src/adapters/storage/inMemory.ts`).
    *   [D] **2.1.2:** Write unit tests for `InMemoryStorageAdapter`.
    *   [D] **2.1.3:** Implement `IndexedDBStorageAdapter` (`src/adapters/storage/indexedDB.ts`). (Requires careful async handling, schema versioning).
    *   [D] **2.1.4:** Write integration tests for `IndexedDBStorageAdapter` (requires browser environment or mock).
*   [D] **2.2: Context System (CS) - Repositories**
    *   *Dependency: 2.1 completed.*
    *   [D] **2.2.1:** Implement `ConversationRepository` (using `StorageAdapter`).
    *   [D] **2.2.2:** Unit tests for `ConversationRepository` (mocking adapter).
    *   [D] **2.2.3:** Implement `ObservationRepository` (using `StorageAdapter`).
    *   [D] **2.2.4:** Unit tests for `ObservationRepository`.
    *   [D] **2.2.5:** Implement `StateRepository` (for `ThreadConfig`, `AgentState`).
    *   [D] **2.2.6:** Unit tests for `StateRepository`.
*   [D] **2.3: Context System (CS) - Managers**
    *   *Dependency: 2.2 completed.*
    *   [D] **2.3.1:** Implement `ConversationManager` (using `ConversationRepository`).
    *   [D] **2.3.2:** Unit tests for `ConversationManager`.
    *   [D] **2.3.3:** Implement `StateManager` (using `StateRepository`). Include logic for loading context, checking enabled tools, getting config values, saving if modified.
    *   [D] **2.3.4:** Unit tests for `StateManager`.
    *   [D] **2.3.5:** Implement basic `ContextProvider` (v1.0 might just pass through data).

**Phase 3: Core Logic Systems - Reasoning & Tool (Est. Complexity: High)**

*   *Dependency: Phase 1 completed.*
*   [D] **3.1: Reasoning System (RS)**
    *   [D] **3.1.1:** Implement `PromptManager` (methods `createPlanningPrompt`, `createSynthesisPrompt`). Use basic templating.
    *   [D] **3.1.2:** Unit tests for `PromptManager`.
    *   [D] **3.1.3:** Implement `OutputParser` (methods `parsePlanningOutput`, `parseSynthesisOutput`). Handle potential formatting errors. Use regex or structured parsing.
    *   [D] **3.1.4:** Unit tests for `OutputParser`.
    *   [D] **3.1.5:** Implement a `ProviderAdapter` (e.g., `OpenAIAdapter`). Handle API calls, auth, `onThought` callback triggering.
    *   [D] **3.1.6:** Unit tests for `OpenAIAdapter` (mocking API calls).
    *   [D] **3.1.7:** Implement `ReasoningEngine` core logic (delegates to adapter, handles `CallOptions`).
    *   [D] **3.1.8:** Unit tests for `ReasoningEngine`.
*   [D] **3.2: Tool System (TS)**
    *   *Dependency: 2.3 (StateManager for tool checks).*
    *   [D] **3.2.1:** Implement `ToolRegistry` (register, getExecutor, getAvailableTools).
    *   [D] **3.2.2:** Unit tests for `ToolRegistry`.
    *   [D] **3.2.3:** Implement JSON Schema validation utility for tool inputs.
    *   [D] **3.2.4:** Implement `ToolSystem.executeTools` method. Include loop logic: check enabled (`StateManager`), get executor (`ToolRegistry`), validate args, execute `IToolExecutor`, handle errors/timeouts, format `ToolResult`.
    *   [D] **3.2.5:** Unit tests for `ToolSystem` (mocking executor, registry, stateManager).
    *   [D] **3.2.6:** Create a simple example `IToolExecutor` (e.g., `CalculatorTool`).
    *   [D] **3.2.7:** Unit tests for `CalculatorTool`.

**Phase 4: Orchestration & Observation (Est. Complexity: High)**

*   *Dependency: Phase 2 & 3 completed.*
*   [ ] **4.1: Observation System (OS)**
    *   *Dependency: 2.2.3 (ObservationRepository).*
    *   [ ] **4.1.1:** Implement `ObservationManager.record` method (create Observation object, save via repo).
    *   [ ] **4.1.2:** Implement `ObservationManager.getObservations` method.
    *   [ ] **4.1.3:** Unit tests for `ObservationManager`.
*   [ ] **4.2: Agent Core (AC) - PES Implementation**
    *   *Dependency: 4.1, All managers/systems from Phase 2 & 3.*
    *   [ ] **4.2.1:** Implement `PESAgent.process` method following the 6 stages outlined in PRD Section 6.
    *   [ ] **4.2.2:** Integrate calls to `StateManager`, `ConversationManager`, `PromptManager`, `ReasoningEngine`, `OutputParser`, `ToolSystem`.
    *   [ ] **4.2.3:** Integrate calls to `ObservationManager.record` at appropriate points (Thoughts, Intent, Plan, Tool Execution, Errors).
    *   [ ] **4.2.4:** Implement final message formatting and saving (`ConversationManager`).
    *   [ ] **4.2.5:** Implement final state saving (`StateManager`).
    *   [ ] **4.2.6:** Implement robust error handling throughout the flow, generating `ERROR` observations.
    *   [ ] **4.2.7:** Write integration tests for `PESAgent` (mocking external dependencies like LLM API, complex tools).
*   [ ] **4.3: Agent Factory**
    *   [ ] **4.3.1:** Implement `AgentFactory` to instantiate `PESAgent` and inject dependencies (configured StorageAdapter, ReasoningAdapter, Tools, etc.).
    *   [ ] **4.3.2:** Unit tests for `AgentFactory`.

**Phase 5: UI Integration (Est. Complexity: Medium)**

*   *Dependency: Phase 1 (Interfaces), Phase 4.1 (ObservationManager), Phase 2.3 (ConversationManager).*
*   [ ] **5.1:** Implement `TypedSocket` base class/logic (simple pub/sub).
*   [ ] **5.2:** Implement `ObservationSocket` (extends `TypedSocket`).
*   [ ] **5.3:** Implement `ConversationSocket` (extends `TypedSocket`).
*   [ ] **5.4:** Integrate `ObservationSocket.notify` call within `ObservationManager.record`.
*   [ ] **5.5:** Integrate `ConversationSocket.notify` call within `ConversationManager.addMessages` (or AgentCore finalization).
*   [ ] **5.6:** Implement `UISystem` to provide access to sockets.
*   [ ] **5.7:** Unit tests for Sockets and UISystem.
*   [ ] **5.8:** Write basic examples demonstrating socket subscription in plain JS.

**Phase 6: Integration, Testing, Documentation & Release Prep (Est. Complexity: High)**

*   *Dependency: All previous phases.*
*   [ ] **6.1: End-to-End (E2E) Testing**
    *   [ ] **6.1.1:** Set up E2E test environment (e.g., Playwright with a simple HTML page).
    *   [ ] **6.1.2:** Write E2E test for full PES flow using `InMemoryStorageAdapter` and mocked LLM/Tool.
    *   [ ] **6.1.3:** Write E2E test for full PES flow using `IndexedDBStorageAdapter` in a browser context. Verify persistence and UI socket updates.
*   [ ] **6.2: Documentation**
    *   [ ] **6.2.1:** Review and complete TSDoc comments for all public APIs.
    *   [ ] **6.2.2:** Write conceptual documentation (README, Architecture Overview, Getting Started Guide).
    *   [ ] **6.2.3:** Create usage examples for core PES flow.
    *   [ ] **6.2.4:** Generate API documentation from TSDoc.
*   [ ] **6.3: Build & Packaging**
    *   [ ] **6.3.1:** Configure build process for production output (minification, tree-shaking).
    *   [ ] **6.3.2:** Configure packaging for NPM (`package.json`).
*   [ ] **6.4: Performance & Refinement**
    *   [ ] **6.4.1:** Basic performance profiling in browser (memory, load time). Address obvious bottlenecks.
    *   [ ] **6.4.2:** Code review and refactoring for clarity and consistency.
*   [ ] **6.5: Release Checklist**
    *   [ ] **6.5.1:** All tests passing (Unit, Integration, E2E).
    *   [ ] **6.5.2:** Documentation complete and reviewed.
    *   [ ] **6.5.3:** Build process verified.
    *   [ ] **6.5.4:** Version bumped appropriately.
    *   [ ] **6.5.5:** (Optional) Publish to NPM.

**Cross-Cutting Concerns (Ongoing Tasks)**

*   [ ] Implement consistent error handling patterns across all components. Define custom error types if necessary.
*   [ ] Integrate logging utility calls at appropriate levels (debug, info, warn, error).
*   [ ] Ensure TypeScript strict mode compliance throughout development.
*   [ ] Continuously write and update unit/integration tests as features are implemented.
*   [ ] Maintain code quality standards (linting, formatting).
*   [ ] Identify and track technical debt.