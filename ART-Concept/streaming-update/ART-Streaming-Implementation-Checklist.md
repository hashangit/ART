# ART Framework: Streaming & Metadata Implementation Checklist

This checklist provides a granular breakdown of tasks required to implement the streaming and metadata features outlined in the `ART-Streaming-Implementation-Plan.md`.

**Legend:**
*   `[ ]`: Task not started
*   `[/]`: Task in progress
*   `[x]`: Task completed
*   **(P#):** Priority (P1=High, P2=Medium, P3=Low) - *Initial suggestion, adjust as needed.*
*   **(Ref: X.Y):** Refers to section X.Y in `ART-Streaming-Implementation-Plan.md`.

---

## Phase 1: Core Type System & Interface Modifications (Ref: 7.1, 7.2)

*   **Priority:** P1 (Foundation for all other changes)
*   **Goal:** Update core definitions to support streaming concepts.

*   [x] **(P1)** Define `StreamEvent` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [x] Include `type: 'TOKEN' | 'METADATA' | 'ERROR' | 'END'`.
    *   [x] Include `data: any`.
    *   [x] Include `tokenType?: 'LLM_THINKING' | ... | 'FINAL_SYNTHESIS_LLM_RESPONSE'`.
    *   [x] Include `threadId: string`.
    *   [x] Include `traceId: string`.
    *   [x] Include `sessionId?: string`.
*   [x] **(P1)** Define `LLMMetadata` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [x] Include fields: `inputTokens?`, `outputTokens?`, `thinkingTokens?`, `timeToFirstTokenMs?`, `totalGenerationTimeMs?`, `stopReason?`, `providerRawUsage?`, `traceId?`.
*   [x] **(P1)** Modify `CallOptions` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [x] Add `stream?: boolean`.
    *   [x] Add `callContext?: 'AGENT_THOUGHT' | 'FINAL_SYNTHESIS' | string`.
    *   *Decision:* Keep optional callback fields commented out for now, prioritizing socket communication.
*   [x] **(P1)** Modify `ExecutionMetadata` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [x] Add `llmMetadata?: LLMMetadata`.
*   [x] **(P1)** Modify `ObservationType` enum in `src/types/index.ts`. (Ref: 7.2)
    *   [x] Add `LLM_STREAM_START`.
    *   [x] Add `LLM_STREAM_METADATA`.
    *   [x] Add `LLM_STREAM_END`.
    *   [x] Add `LLM_STREAM_ERROR`.
*   [x] **(P1)** Modify `ReasoningEngine` interface in `src/core/interfaces.ts`. (Ref: 7.1)
    *   [x] Change `call(...)` return type to `Promise<AsyncIterable<StreamEvent>>`.
*   [x] **(P2)** Update relevant JSDoc comments for all modified types and interfaces.

---

## Phase 2: UI System Modifications (Ref: 7.5)

*   **Priority:** P1 (Needed early for Agent Core and UI integration)
*   **Goal:** Create the communication channel for stream events.

*   [x] **(P1)** Implement `LLMStreamSocket` class in `src/systems/ui/llm-stream-socket.ts`.
    *   [x] Implement `TypedSocket<StreamEvent>`.
    *   [x] Implement `subscribe` and `notify` methods (placeholder).
    *   *Decision:* No repository dependency needed initially, as it primarily broadcasts.
*   [x] **(P1)** Modify `UISystem` class in `src/systems/ui/ui-system.ts`.
    *   [x] Add `private llmStreamSocketInstance: LLMStreamSocket;`.
    *   [x] Instantiate `LLMStreamSocket` in the constructor.
    *   [x] Add `getLLMStreamSocket(): LLMStreamSocket` method.
*   [x] **(P1)** Update `UISystem` interface in `src/core/interfaces.ts`.
    *   [x] Add `getLLMStreamSocket(): LLMStreamSocket;` method signature.
*   [x] **(P1)** Update Dependency Injection (`AgentFactory` or manual setup).
    *   [x] Ensure `UISystem` instance (with the new socket) is correctly instantiated and potentially injected where needed (e.g., into Agent Core).

---

## Phase 3: Adapter Modifications (Ref: 7.3)

*   **Priority:** P2 (Implement per provider)
*   **Goal:** Enable specific LLM providers to produce the stream events.
*   **Note:** Repeat these steps for each target `ProviderAdapter` (e.g., OpenAI, Anthropic, Gemini).

*   [x] **(P2)** Modify `Adapter.call` method signature to match `ReasoningEngine` (`Promise<AsyncIterable<StreamEvent>>`). (Completed for OpenAIAdapter)
*   [x] **(P2)** Implement logic to check `options.stream`. (Completed for OpenAIAdapter)
    *   [x] If `false`, perform non-streaming call and yield minimal events (`TOKEN` with full response, `METADATA` if available, `END`). (Completed for OpenAIAdapter)
*   [/] **(P2)** Implement streaming logic (if `options.stream` is true): (In progress for OpenAIAdapter)
    *   [x] Connect to provider's streaming endpoint. (Done in OpenAIAdapter)
    *   [x] Implement async generator function (`async function* () {}`) to handle stream consumption and yielding. (Done in OpenAIAdapter - `processStream`)
    *   [x] Parse provider-specific stream chunks (SSE, JSON lines, etc.). (Basic SSE parsing done for OpenAIAdapter)
    *   [ ] **(P1 - Per Adapter)** Implement provider-specific logic to detect thinking tokens (Type 1 thoughts). (N/A for OpenAI Chat Stream)
    *   [ ] Extract metadata (token counts, timing, stop reason) from stream/final message. (N/A for OpenAI Chat Stream)
    *   [x] Yield `StreamEvent` objects for `TOKEN`, `METADATA`, `ERROR`, `END`. (Basic TOKEN/ERROR/END done for OpenAIAdapter; METADATA N/A for stream)
    *   [x] Ensure `threadId`, `traceId`, `sessionId` are included. (Done for OpenAIAdapter)
    *   [x] Calculate and set `tokenType` based on `options.callContext` and Type 1 thought detection. (Done for OpenAIAdapter based on callContext)
    *   [ ] Package metadata into `LLMMetadata` structure for `METADATA` events. (N/A for OpenAI Chat Stream)
*   [ ] **(P3)** (Optional) Implement legacy `onThought` callback invocation if desired for transitional compatibility.
*   [x] **(P2)** Add unit/integration tests for streaming behavior for each modified adapter. (Completed E2E test for OpenAIAdapter in `e2e/adapters.spec.ts`)

---

## Phase 4: Agent Core Modifications (Ref: 7.4)

*   **Priority:** P1 (Core orchestration logic)
*   **Goal:** Consume the stream, drive sockets/observations, and manage final response aggregation.
*   **Note:** Modify target `IAgentCore` implementations (e.g., `PESAgent`, `ReActAgent`).

*   [x] **(P1)** Update constructor dependencies to include `UISystem`.
*   [x] **(P1)** Modify `process` method logic:
    *   [x] Pass `stream: true` and appropriate `callContext` in `CallOptions` when calling `reasoningEngine.call`.
    *   [x] Implement `async for await (const event of stream)` loop to consume the iterator.
    *   [x] Initialize response buffer string and aggregated `LLMMetadata` object.
    *   [x] Implement `switch (event.type)` logic:
    *   [x] `TOKEN`: Push to `uiSystem.getLLMStreamSocket()`. Append to buffer if final response token.
    *   [x] `METADATA`: Push to `uiSystem.getLLMStreamSocket()`. Call `observationManager.record(LLM_STREAM_METADATA, ...)`. Aggregate metadata.
    *   [x] `ERROR`: Push to `uiSystem.getLLMStreamSocket()`. Call `observationManager.record(LLM_STREAM_ERROR, ...)`. Implement error handling.
    *   [x] `END`: Push to `uiSystem.getLLMStreamSocket()`. Call `observationManager.record(LLM_STREAM_END, ...)`. Finalize loop.
    *   [x] (Optional) Call `observationManager.record(LLM_STREAM_START, ...)` before the loop.
*   [x] **(P1)** Implement logic *after* the loop (on successful `END`):
    *   [x] Construct final `ConversationMessage` from the response buffer.
    *   [x] Call `conversationManager.addMessages()`.
    *   [x] Populate `llmMetadata` field in `ExecutionMetadata`.
    *   [x] Construct and return final `AgentFinalResponse`.
*   [x] **(P2)** Update unit/integration tests for Agent Core to cover streaming scenarios. (Completed E2E test for PESAgent in `e2e/pes-flow.spec.ts`)

---

## Phase 5: Observation System Modifications (Ref: 7.6)

*   **Priority:** P2 (Supporting logging of stream events)
*   **Goal:** Ensure the Observation system can store the new discrete stream events.

*   [x] **(P2)** Verify `ObservationManager.record` can handle the new `ObservationType` values (`LLM_STREAM_METADATA`, `LLM_STREAM_END`, `LLM_STREAM_ERROR`). (Code likely requires no change if `type` is just passed through).
*   [x] **(P2)** Verify `IObservationRepository` interface supports new types/content. (No change needed).
*   [x] **(P2)** Verify concrete `ObservationRepository` implementation(s) (e.g., using `StorageAdapter`) supports storing/querying new types/content. (Relies on StorageAdapter; no repo change needed).
*   [ ] **(P3)** Update tests for `ObservationManager` and `ObservationRepository` if applicable.

---

## Phase 6: UI Logic Implementation (Ref: 7.7)

*   **Priority:** P2 (Application/Example level)
*   **Goal:** Demonstrate how to consume the stream events in a UI.
*   **Note:** This applies to example applications (like `sample-app`) or consuming applications.

*   [x] **(P2)** Update UI component(s) to subscribe to `LLMStreamSocket`. (Done in `sample-app/index.ts` CLI)
    *   `const unsub = uiSystem.getLLMStreamSocket().subscribe(handleStreamEvent, filter?, { threadId });`
*   [x] **(P2)** Implement `handleStreamEvent(event: StreamEvent)` callback: (Done in `sample-app/index.ts` CLI)
    *   [ ] Use `event.traceId` to correlate events to the correct UI message element. (N/A for CLI demo)
    *   [x] Handle `TOKEN` events: Append `event.data` to temporary message state. Differentiate display based on `event.tokenType`. (Printed directly in CLI demo)
    *   [x] Handle `METADATA` events: Display `event.data` (e.g., token counts) if desired. (Logged in CLI demo)
    *   [x] Handle `END` events: Finalize temporary message state (e.g., remove cursor). (Printed newline in CLI demo)
    *   [x] Handle `ERROR` events: Display error state for the temporary message. (Logged in CLI demo)
*   [x] **(P2)** Implement UI reconciliation logic: (Handled in `sample-app/index.ts` CLI by not re-printing final content)
    *   [ ] Subscribe to `ConversationSocket` as usual. (Not needed for CLI demo)
    *   [ ] When final `ConversationMessage` arrives, use `traceId` (or other correlation) to find the corresponding temporary streamed message element. (N/A for CLI demo)
    *   [ ] Replace the temporary element's content and ID with the final message data. (N/A for CLI demo)
*   [ ] **(P3)** Update UI component tests.

---

## Phase 7: Documentation & Examples

*   **Priority:** P3
*   **Goal:** Document the new features and provide usage examples.

*   [ ] **(P3)** Update `ART-Comprehensive-Guide.md` or other developer documentation:
    *   [ ] Explain the streaming architecture (`AsyncIterable`, `StreamEvent`, `LLMStreamSocket`).
    *   [ ] Document new/modified types (`StreamEvent`, `LLMMetadata`, `CallOptions`, `ExecutionMetadata`, `ObservationType`).
    *   [ ] Provide examples of how to implement streaming in Adapters.
    *   [ ] Provide examples of how to consume stream events in UI code.
    *   [ ] Explain thinking vs. response token handling.
    *   [ ] Explain metadata delivery.
*   [ ] **(P3)** Update or create new examples in `sample-app` demonstrating streaming UI.

---