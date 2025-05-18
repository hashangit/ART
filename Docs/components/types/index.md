# Key Types Overview

The `src/types/index.ts` file (along with `src/types/providers.ts` and `src/types/schemas.ts`) serves as the central hub for most of the important data structures and type definitions used throughout the ART Framework. Understanding these types is essential for working with and extending ART.

This page provides an overview of some of the most critical types. For detailed definitions, refer to the source files.

## Core Agent Interaction Types

*   **`AgentProps`**:
    *   The input object passed to `IAgentCore.process()`.
    *   Contains `query: string`, `threadId: string`, and optional `sessionId`, `userId`, `traceId`, and `options: AgentOptions`.
*   **`AgentOptions`**:
    *   Optional overrides for a specific `process` call, like `llmParams`, `providerConfig` (for runtime LLM selection), `forceTools`.
*   **`AgentFinalResponse`**:
    *   The output object from `IAgentCore.process()`.
    *   Contains `response: ConversationMessage` (the final AI message) and `metadata: ExecutionMetadata`.
*   **`ExecutionMetadata`**:
    *   Summarizes an agent's execution cycle: `threadId`, `traceId`, `status` ('success', 'error', 'partial'), `totalDurationMs`, `llmCalls`, `toolCalls`, `error?` message, and `llmMetadata?`.

## Conversation and Messaging Types

*   **`MessageRole` (Enum):**
    *   Defines the sender of a message: `USER`, `AI`, `SYSTEM`, `TOOL`.
*   **`ConversationMessage`**:
    *   Structure for a single message in a conversation: `messageId`, `threadId`, `role`, `content: string`, `timestamp`, `metadata?`.
*   **`ArtStandardMessageRole` (Type Alias):**
    *   Roles used in `ArtStandardPrompt`: `'system' | 'user' | 'assistant' | 'tool_request' | 'tool_result' | 'tool'`.
*   **`ArtStandardMessage`**:
    *   The standardized message structure for `ArtStandardPrompt`. Includes `role`, `content` (can be string, object, or null depending on role), `name?`, `tool_calls?` (for assistant role, defining function calls), `tool_call_id?` (for tool_result role).
*   **`ArtStandardPrompt` (Type Alias):**
    *   `ArtStandardMessage[]`: An array of standardized messages, representing the complete prompt sent to `ProviderAdapter.call`. This is the primary prompt abstraction in ART.
*   **`MessageOptions`**:
    *   Options for retrieving messages, e.g., `limit`, `beforeTimestamp`, `afterTimestamp`.

## LLM Interaction and Streaming

*   **`StreamEvent`**:
    *   The standard object emitted by `ProviderAdapter.call()` when streaming.
    *   `type: 'TOKEN' | 'METADATA' | 'ERROR' | 'END'`.
    *   `data: any` (content depends on `type`).
    *   `tokenType?: string` (e.g., `AGENT_THOUGHT_LLM_RESPONSE`, `FINAL_SYNTHESIS_LLM_RESPONSE`) for `TOKEN` events, providing more context about the token's origin/purpose.
    *   Includes `threadId`, `traceId`, `sessionId?`.
*   **`LLMMetadata`**:
    *   Structure for metadata about an LLM call (often part of a `METADATA` `StreamEvent`): `inputTokens?`, `outputTokens?`, `timeToFirstTokenMs?`, `totalGenerationTimeMs?`, `stopReason?`, `providerRawUsage?`.
*   **`CallOptions`**:
    *   Options passed to `ReasoningEngine.call()` and `ProviderAdapter.call()`.
    *   Includes `threadId`, `traceId?`, `stream?`, `callContext?` (e.g., 'AGENT_THOUGHT', 'FINAL_SYNTHESIS'), and crucially `providerConfig: RuntimeProviderConfig`. Also allows arbitrary provider-specific parameters.
*   **`ModelCapability` (Enum):**
    *   Defines capabilities of an LLM like `TEXT`, `VISION`, `STREAMING`, `TOOL_USE`, `REASONING`. Used for model selection or validation.

## Tool System Types

*   **`ToolSchema`**:
    *   Defines a tool's interface: `name`, `description`, `inputSchema: JsonSchema`, `outputSchema?: JsonSchema`, `examples?`.
*   **`JsonSchema` (Type Alias for `JsonObjectSchema` or other basic schema types):**
    *   Represents a JSON Schema, primarily used for `ToolSchema.inputSchema` and `outputSchema`.
*   **`ParsedToolCall`**:
    *   Structure representing the LLM's request to call a tool, as parsed by `OutputParser`: `callId`, `toolName`, `arguments`.
*   **`ToolResult`**:
    *   The outcome of a tool execution: `callId`, `toolName`, `status: 'success' | 'error'`, `output?`, `error?`.
*   **`ExecutionContext`**:
    *   Context provided to a tool's `execute` method: `threadId`, `traceId?`, `userId?`.

## State and Configuration Types

*   **`ThreadConfig`**:
    *   Configuration for a specific conversation thread: `providerConfig: RuntimeProviderConfig` (default LLM setup for the thread), `enabledTools: string[]`, `historyLimit: number`.
*   **`AgentState`**:
    *   Persistent state for an agent within a thread: `data: any` (application-defined), `version?`.
*   **`ThreadContext`**:
    *   Bundles `config: ThreadConfig` and `state: AgentState | null`.
*   **`StateSavingStrategy` (Type Alias):**
    *   `'explicit' | 'implicit'`: Defines how `AgentState` is saved.

## Provider Management Types (`src/types/providers.ts`)

*   **`AvailableProviderEntry`**:
    *   Defines a provider adapter available to the `ProviderManager`: `name`, `adapter` (constructor), `isLocal?`.
*   **`ProviderManagerConfig`**:
    *   Configuration for `ProviderManager`: `availableProviders[]`, `maxParallelApiInstancesPerProvider?`, `apiInstanceIdleTimeoutSeconds?`.
*   **`RuntimeProviderConfig`**:
    *   Configuration for a *specific* LLM call: `providerName`, `modelId`, `adapterOptions` (e.g., API key). Passed in `CallOptions`.
*   **`ManagedAdapterAccessor`**:
    *   Object returned by `ProviderManager.getAdapter()`: `adapter: ProviderAdapter`, `release: () => void`.

## Observation Types

*   **`ObservationType` (Enum):**
    *   Categories of agent events: `INTENT`, `PLAN`, `TOOL_CALL`, `TOOL_EXECUTION`, `SYNTHESIS`, `ERROR`, `FINAL_RESPONSE`, `LLM_STREAM_START`, etc.
*   **`Observation`**:
    *   Structure for a recorded event: `id`, `threadId`, `timestamp`, `type`, `title`, `content: any`, `metadata?`.
*   **`ObservationFilter`**:
    *   Options for filtering observations: `types?`, `beforeTimestamp?`, `afterTimestamp?`.

## Error Types (`src/errors.ts`)

*   **`ErrorCode` (Enum):**
    *   Standardized error codes for various framework issues (e.g., `INVALID_CONFIG`, `LLM_PROVIDER_ERROR`, `TOOL_NOT_FOUND`).
*   **`ARTError` (Class):**
    *   Custom error class extending `Error`, includes `code: ErrorCode` and `originalError?`.

## Zod Schemas (`src/types/schemas.ts`)

*   **`ArtStandardMessageSchema`**: Zod schema for validating a single `ArtStandardMessage`.
*   **`ArtStandardPromptSchema`**: Zod schema for validating an `ArtStandardPrompt` (an array of messages).

These types collectively define the data contracts and structures that enable the different components of the ART Framework to communicate and operate effectively. Developers building with or extending ART will frequently interact with these types.