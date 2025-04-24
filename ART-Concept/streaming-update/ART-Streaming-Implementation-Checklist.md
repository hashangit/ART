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

*   [ ] **(P1)** Define `StreamEvent` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [ ] Include `type: 'TOKEN' | 'METADATA' | 'ERROR' | 'END'`.
    *   [ ] Include `data: any`.
    *   [ ] Include `tokenType?: 'LLM_THINKING' | ... | 'FINAL_SYNTHESIS_LLM_RESPONSE'`.
    *   [ ] Include `threadId: string`.
    *   [ ] Include `traceId: string`.
    *   [ ] Include `sessionId?: string`.
*   [ ] **(P1)** Define `LLMMetadata` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [ ] Include fields: `inputTokens?`, `outputTokens?`, `thinkingTokens?`, `timeToFirstTokenMs?`, `totalGenerationTimeMs?`, `stopReason?`, `providerRawUsage?`, `traceId?`.
*   [ ] **(P1)** Modify `CallOptions` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [ ] Add `stream?: boolean`.
    *   [ ] Add `callContext?: 'AGENT_THOUGHT' | 'FINAL_SYNTHESIS' | string`.
    *   *Decision:* Keep optional callback fields commented out for now, prioritizing socket communication.
*   [ ] **(P1)** Modify `ExecutionMetadata` interface in `src/types/index.ts`. (Ref: 7.2)
    *   [ ] Add `llmMetadata?: LLMMetadata`.
*   [ ] **(P1)** Modify `ObservationType` enum in `src/types/index.ts`. (Ref: 7.2)
    *   [ ] Add `LLM_STREAM_START`.
    *   [ ] Add `LLM_STREAM_METADATA`.
    *   [ ] Add `LLM_STREAM_END`.
    *   [ ] Add `LLM_STREAM_ERROR`.
*   [ ] **(P1)** Modify `ReasoningEngine` interface in `src/core/interfaces.ts`. (Ref: 7.1)
    *   [ ] Change `call(...)` return type to `Promise<AsyncIterable<StreamEvent>>`.
*   [ ] **(P2)** Update relevant JSDoc comments for all modified types and interfaces.

---

## Phase 2: UI System Modifications (Ref: 7.5)

*   **Priority:** P1 (Needed early for Agent Core and UI integration)
*   **Goal:** Create the communication channel for stream events.

*   [ ] **(P1)** Implement `LLMStreamSocket` class in `src/systems/ui/llm-stream-socket.ts`.
    *   [ ] Extend `TypedSocket<StreamEvent>`.
    *   [ ] Implement `subscribe` and `notify` methods.
    *   *Decision:* No repository dependency needed initially, as it primarily broadcasts.
*   [ ] **(P1)** Modify `UISystem` class in `src/systems/ui/ui-system.ts`.
    *   [ ] Add `private llmStreamSocketInstance: LLMStreamSocket;`.
    *   [ ] Instantiate `LLMStreamSocket` in the constructor.
    *   [ ] Add `getLLMStreamSocket(): LLMStreamSocket` method.
*   [ ] **(P1)** Update `UISystem` interface in `src/core/interfaces.ts`.
    *   [ ] Add `getLLMStreamSocket(): LLMStreamSocket;` method signature.
*   [ ] **(P1)** Update Dependency Injection (`AgentFactory` or manual setup).
    *   [ ] Ensure `UISystem` instance (with the new socket) is correctly instantiated and potentially injected where needed (e.g., into Agent Core).

---

## Phase 3: Adapter Modifications (Ref: 7.3)

*   **Priority:** P2 (Implement per provider)
*   **Goal:** Enable specific LLM providers to produce the stream events.
*   **Note:** Repeat these steps for each target `ProviderAdapter` (e.g., OpenAI, Anthropic, Gemini).

*   [ ] **(P2)** Modify `Adapter.call` method signature to match `ReasoningEngine` (`Promise<AsyncIterable<StreamEvent>>`).
*   [ ] **(P2)** Implement logic to check `options.stream`.
    *   [ ] If `false`, perform non-streaming call and yield minimal events (`TOKEN` with full response, `METADATA` if available, `END`).
*   [ ] **(P2)** Implement streaming logic (if `options.stream` is true):
    *   [ ] Connect to provider's streaming endpoint.
    *   [ ] Implement async generator function (`async function* () {}`) to handle stream consumption and yielding.
    *   [ ] Parse provider-specific stream chunks (SSE, JSON lines, etc.).
    *   [ ] **(P1 - Per Adapter)** Implement provider-specific logic to detect thinking tokens (Type 1 thoughts).
    *   [ ] Extract metadata (token counts, timing, stop reason) from stream/final message.
    *   [ ] Yield `StreamEvent` objects for `TOKEN`, `METADATA`, `ERROR`, `END`.
        *   [ ] Ensure `threadId`, `traceId`, `sessionId` are included.
        *   [ ] Calculate and set `tokenType` based on `options.callContext` and Type 1 thought detection.
        *   [ ] Package metadata into `LLMMetadata` structure for `METADATA` events.
*   [ ] **(P3)** (Optional) Implement legacy `onThought` callback invocation if desired for transitional compatibility.
*   [ ] **(P2)** Add unit/integration tests for streaming behavior for each modified adapter.

---

## Phase 4: Agent Core Modifications (Ref: 7.4)

*   **Priority:** P1 (Core orchestration logic)
*   **Goal:** Consume the stream, drive sockets/observations, and manage final response aggregation.
*   **Note:** Modify target `IAgentCore` implementations (e.g., `PESAgent`, `ReActAgent`).

*   [ ] **(P1)** Update constructor dependencies to include `UISystem`.
*   [ ] **(P1)** Modify `process` method logic:
    *   [ ] Pass `stream: true` and appropriate `callContext` in `CallOptions` when calling `reasoningEngine.call`.
    *   [ ] Implement `async for await (const event of stream)` loop to consume the iterator.
    *   [ ] Initialize response buffer string and aggregated `LLMMetadata` object.
    *   [ ] Implement `switch (event.type)` logic:
        *   [ ] `TOKEN`: Push to `uiSystem.getLLMStreamSocket()`. Append to buffer if final response token.
        *   [ ] `METADATA`: Push to `uiSystem.getLLMStreamSocket()`. Call `observationManager.record(LLM_STREAM_METADATA, ...)`. Aggregate metadata.
        *   [ ] `ERROR`: Push to `uiSystem.getLLMStreamSocket()`. Call `observationManager.record(LLM_STREAM_ERROR, ...)`. Implement error handling.
        *   [ ] `END`: Push to `uiSystem.getLLMStreamSocket()`. Call `observationManager.record(LLM_STREAM_END, ...)`. Finalize loop.
    *   [ ] (Optional) Call `observationManager.record(LLM_STREAM_START, ...)` before the loop.
*   [ ] **(P1)** Implement logic *after* the loop (on successful `END`):
    *   [ ] Construct final `ConversationMessage` from the response buffer.
    *   [ ] Call `conversationManager.addMessages()`.
    *   [ ] Populate `llmMetadata` field in `ExecutionMetadata`.
    *   [ ] Construct and return final `AgentFinalResponse`.
*   [ ] **(P2)** Update unit/integration tests for Agent Core to cover streaming scenarios.

---

## Phase 5: Observation System Modifications (Ref: 7.6)

*   **Priority:** P2 (Supporting logging of stream events)
*   **Goal:** Ensure the Observation system can store the new discrete stream events.

*   [ ] **(P2)** Verify `ObservationManager.record` can handle the new `ObservationType` values (`LLM_STREAM_METADATA`, `LLM_STREAM_END`, `LLM_STREAM_ERROR`). (Code likely requires no change if `type` is just passed through).
*   [ ] **(P2)** Update `IObservationRepository` interface if necessary (unlikely needed just for new types).
*   [ ] **(P2)** Update concrete `ObservationRepository` implementation(s) (e.g., using `StorageAdapter`) to ensure they can correctly store and query observations with the new types and potentially complex `content` (like `LLMMetadata` or `Error` objects).
*   [ ] **(P3)** Update tests for `ObservationManager` and `ObservationRepository` if applicable.

---

## Phase 6: UI Logic Implementation (Ref: 7.7)

*   **Priority:** P2 (Application/Example level)
*   **Goal:** Demonstrate how to consume the stream events in a UI.
*   **Note:** This applies to example applications (like `sample-app`) or consuming applications.

*   [ ] **(P2)** Update UI component(s) to subscribe to `LLMStreamSocket`.
    *   `const unsub = uiSystem.getLLMStreamSocket().subscribe(handleStreamEvent, filter?, { threadId });`
*   [ ] **(P2)** Implement `handleStreamEvent(event: StreamEvent)` callback:
    *   [ ] Use `event.traceId` to correlate events to the correct UI message element.
    *   [ ] Handle `TOKEN` events: Append `event.data` to temporary message state. Differentiate display based on `event.tokenType`.
    *   [ ] Handle `METADATA` events: Display `event.data` (e.g., token counts) if desired.
    *   [ ] Handle `END` events: Finalize temporary message state (e.g., remove cursor).
    *   [ ] Handle `ERROR` events: Display error state for the temporary message.
*   [ ] **(P2)** Implement UI reconciliation logic:
    *   [ ] Subscribe to `ConversationSocket` as usual.
    *   [ ] When final `ConversationMessage` arrives, use `traceId` (or other correlation) to find the corresponding temporary streamed message element.
    *   [ ] Replace the temporary element's content and ID with the final message data.
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