# ART Framework: MCP Integration Implementation Plan

**Version:** 1.0
**Date:** 2025-04-05

**Goal:** Implement MCP support in ART, focusing on WASM-based servers running client-side, based on the approved strategy document (`Strategy.md`).

**Status Legend:** `[ ]` To Do, `[P]` In Progress, `[D]` Done

---

## Phase 1: Core Interfaces, Types & Configuration Structures (Est. Complexity: Medium)

*   *Dependency: ART Core Interfaces (Phase 1 of PRD Checklist) defined.*
*   `[ ]` **1.1:** Define `McpToolDefinition` interface (`src/types/index.ts` or dedicated file).
    *   `[ ]` Include `schema: ToolSchema`.
    *   `[ ]` Include `mcpServerName: string`.
    *   `[ ]` Include any other necessary metadata (e.g., original tool name if different).
*   `[ ]` **1.2:** Define `McpServerConfig` interface (`src/types/index.ts` or dedicated file).
    *   `[ ]` Include `name: string` (unique identifier).
    *   `[ ]` Include `type: 'wasm' | 'stdio' | 'http'`.
    *   `[ ]` Include `connectionDetails: { workerUrl?: string; command?: string; args?: string[]; url?: string; }`.
    *   `[ ]` Include `requiresApiKey: boolean`.
    *   `[ ]` Include `apiKeyName?: string` (key name for storage/retrieval).
*   `[ ]` **1.3:** Define `Transport` interface (`src/core/interfaces.ts` or `src/systems/mcp/interfaces.ts`).
    *   *Align with `@modelcontextprotocol/sdk` `Transport` interface.*
    *   `[ ]` `start(): Promise<void>`.
    *   `[ ]` `stop(): Promise<void>`.
    *   `[ ]` `close(): Promise<void>`.
    *   `[ ]` `isConnected(): boolean`.
    *   `[ ]` `send(message: McpRequestMessage): Promise<void>`.
    *   `[ ]` `onMessage(callback: (message: McpResponseMessage) => void): () => void` (returns unsubscribe function).
    *   *Define or import necessary `McpRequestMessage` and `McpResponseMessage` types.*
*   `[ ]` **1.4:** Define `McpTransportManager` interface (`src/core/interfaces.ts` or `src/systems/mcp/interfaces.ts`).
    *   `[ ]` `addServer(config: McpServerConfig): Promise<void>`.
    *   `[ ]` `removeServer(serverName: string): Promise<void>`.
    *   `[ ]` `getServerStatus(serverName: string): Promise<'connected' | 'disconnected' | 'error' | 'connecting'>`.
    *   `[ ]` `executeMcpTool(toolCall: ParsedToolCall, context: ExecutionContext): Promise<ToolResult>`.
    *   `[ ]` `getMcpToolSchemas(serverName: string): Promise<ToolSchema[]>`.
*   `[ ]` **1.5:** Define `CredentialsRepository` interface (`src/core/interfaces.ts` or `src/systems/storage/interfaces.ts`).
    *   `[ ]` `setCredential(key: string, value: string, options?: { threadId?: string }): Promise<void>`.
    *   `[ ]` `getCredential(key: string, options?: { threadId?: string }): Promise<string | null>`.
    *   `[ ]` `deleteCredential(key: string, options?: { threadId?: string }): Promise<void>`.
*   `[ ]` **1.6:** (Optional) Define `McpStatusSocket` interface extending `TypedSocket` (`src/core/interfaces.ts` or `src/systems/ui/interfaces.ts`).

## Phase 2: Storage & Credentials (Est. Complexity: Medium)

*   *Dependency: Phase 1.5 defined, ART Storage System (Phase 2 of PRD Checklist) implemented.*
*   `[ ]` **2.1:** Implement `CredentialsRepository` (`src/systems/storage/repositories/CredentialsRepository.ts`).
    *   `[ ]` Use the configured `StorageAdapter`.
    *   `[ ]` Implement methods defined in the interface.
    *   `[ ]` Consider simple encryption/obfuscation for stored credentials (basic level for client-side).
*   `[ ]` **2.2:** Write unit tests for `CredentialsRepository` (mocking `StorageAdapter`).
*   `[ ]` **2.3:** Integrate `CredentialsRepository` into `AgentFactory` dependency injection.

## Phase 3: Transport Implementations (Est. Complexity: High)

*   *Dependency: Phase 1.3 defined.*
*   `[ ]` **3.1:** Implement `BrowserMcpTransport` (`src/adapters/mcp/BrowserMcpTransport.ts`).
    *   `[ ]` Implement the `Transport` interface.
    *   `[ ]` Constructor accepts `workerUrl`.
    *   `[ ]` `start()`: Creates `Worker`, establishes `MessageChannel`, sets up listeners.
    *   `[ ]` `send()`: Posts message via `MessageChannel` port.
    *   `[ ]` `onMessage()`: Registers callbacks triggered by messages received on the port.
    *   `[ ]` `stop()`/`close()`: Calls `worker.terminate()`, cleans up listeners and channels.
    *   `[ ]` Handle worker errors (`onerror`, instantiation errors).
*   `[ ]` **3.2:** Write unit/integration tests for `BrowserMcpTransport` (requires mocking `Worker`, `MessageChannel` or testing in a browser-like environment).
*   `[ ]` **3.3:** (Optional Secondary) Implement `StdioMcpTransport` (`src/adapters/mcp/StdioMcpTransport.ts`).
    *   *Requires Node.js environment.*
    *   `[ ]` Implement the `Transport` interface.
    *   `[ ]` Use Node.js `child_process.spawn`.
    *   `[ ]` `start()`: Spawns the process.
    *   `[ ]` `send()`: Writes to process `stdin`.
    *   `[ ]` `onMessage()`: Listens to process `stdout`, parses messages.
    *   `[ ]` `stop()`/`close()`: Terminates the child process.
    *   `[ ]` Handle process errors (`stderr`, exit codes).
*   `[ ]` **3.4:** (Optional Secondary) Write unit/integration tests for `StdioMcpTransport` (requires Node.js test environment).

## Phase 4: MCP Management Core (Est. Complexity: High)

*   *Dependency: Phase 1.4, Phase 2, Phase 3 completed. Requires `ObservationManager`, `ToolRegistry`.*
*   `[ ]` **4.1:** Implement `McpTransportManager` (`src/systems/mcp/McpTransportManager.ts`).
    *   `[ ]` Inject dependencies: `ObservationManager`, `CredentialsRepository`, `ToolRegistry`, `StateManager`.
    *   `[ ]` Maintain internal state for configured servers and active transports (`Map<string, { config: McpServerConfig, transport: Transport, status: string, schemas?: ToolSchema[] }>`).
    *   `[ ]` Implement `addServer()`:
        *   Check environment compatibility (e.g., reject `stdio` in browser).
        *   Instantiate appropriate `Transport` based on `config.type`.
        *   Call `transport.start()`.
        *   Handle potential API key retrieval/prompting (using `CredentialsRepository`, potentially needs UI interaction hook).
        *   *Asynchronously* fetch tool schemas from the server (e.g., by sending a `listTools` request via the transport after connection).
        *   Register fetched tools (`McpToolDefinition`) in `ToolRegistry`.
        *   Update internal status.
        *   Record observations for connection attempts/success/failure.
    *   `[ ]` Implement `removeServer()`:
        *   Call `transport.stop()`/`close()`.
        *   Remove server from internal state.
        *   (Optional) Unregister tools from `ToolRegistry`.
    *   `[ ]` Implement `getServerStatus()`.
    *   `[ ]` Implement `executeMcpTool()`:
        *   Find the correct server/transport.
        *   Check connection status.
        *   Retrieve API key via `CredentialsRepository` if needed.
        *   Construct MCP request message.
        *   Use `transport.send()` and await response via `transport.onMessage()` (needs request/response correlation, e.g., using message IDs).
        *   Format MCP response/error into `ToolResult`.
        *   Record `TOOL_EXECUTION` observation via `ObservationManager`.
        *   Handle transport errors, timeouts.
    *   `[ ]` Implement `getMcpToolSchemas()`.
*   `[ ]` **4.2:** Write unit tests for `McpTransportManager` (mocking dependencies like Transports, Repositories, Managers).
*   `[ ]` **4.3:** Integrate `McpTransportManager` into `AgentFactory` dependency injection.

## Phase 5: ART Core System Integration (Est. Complexity: Medium)

*   *Dependency: Phase 4 completed.*
*   `[ ]` **5.1:** Modify `ToolRegistry` (`src/systems/tool/ToolRegistry.ts`).
    *   `[ ]` Update internal storage to handle `IToolExecutor | McpToolDefinition`.
    *   `[ ]` Update `registerTool` (potentially split or adapt for `McpToolDefinition`).
    *   `[ ]` Update `getToolExecutor` (rename or adapt to `getTool` returning the union type).
    *   `[ ]` Update `getAvailableTools` to correctly extract `ToolSchema` from both types.
    *   `[ ]` Update associated unit tests.
*   `[ ]` **5.2:** Modify `ToolSystem` (`src/systems/tool/ToolSystem.ts`).
    *   `[ ]` Inject `McpTransportManager`.
    *   `[ ]` In `executeTools()` loop:
        *   Retrieve tool definition from `ToolRegistry`.
        *   Use type guard to check if it's `IToolExecutor` or `McpToolDefinition`.
        *   If `IToolExecutor`, proceed with existing native execution logic.
        *   If `McpToolDefinition`, call `mcpTransportManager.executeMcpTool()`.
        *   Ensure `ToolResult` from both paths is handled consistently.
    *   `[ ]` Update associated unit tests (mocking `McpTransportManager`).
*   `[ ]` **5.3:** Modify `StateManager` (`src/systems/context/managers/StateManager.ts`).
    *   `[ ]` Add methods for managing `McpServerConfig` storage (get/set/list), potentially delegating to `StateRepository`.
    *   `[ ]` Ensure `isToolEnabled` works correctly for MCP tool names registered in `ToolRegistry`.
    *   `[ ]` Update associated unit tests.
*   `[ ]` **5.4:** Expose MCP functionality via `ArtInstance` (`src/core/agent-factory.ts`).
    *   `[ ]` Add an `mcp` property to `ArtInstance` interface, exposing methods like `addServer`, `removeServer`, `getServerStatus` (delegating to `McpTransportManager`).

## Phase 6: UI Integration & Developer Experience (Est. Complexity: Medium)

*   *Dependency: Phase 4, Phase 5 completed.*
*   `[ ]` **6.1:** (Optional) Implement `McpStatusSocket` (`src/systems/ui/sockets/McpStatusSocket.ts`).
    *   `[ ]` Define status update data structure (e.g., `{ serverName: string, status: string, error?: string }`).
    *   `[ ]` Integrate `notify` calls within `McpTransportManager` for connection events.
*   `[ ]` **6.2:** Update `UISystem` (`src/systems/ui/UISystem.ts`) to include the new socket if implemented.
*   `[ ]` **6.3:** Update `AgentFactory` to instantiate and provide the new socket.
*   `[ ]` **6.4:** Write basic JS examples demonstrating:
    *   `art.mcp.addServer()` usage for a WASM server.
    *   Handling potential API key prompts (conceptual).
    *   Subscribing to `ObservationSocket` for `TOOL_EXECUTION` of MCP tools.
    *   (Optional) Subscribing to `McpStatusSocket`.

## Phase 7: Testing & Documentation (Est. Complexity: High)

*   *Dependency: All previous phases.*
*   `[ ]` **7.1:** Develop Example WASM MCP Server.
    *   `[ ]` Create a simple WASM-compatible MCP server (e.g., a basic calculator or echo server) for testing `BrowserMcpTransport`.
    *   `[ ]` Package it with a Web Worker script.
*   `[ ]` **7.2:** Write Integration Tests.
    *   `[ ]` Test `McpTransportManager` interacting with mocked `BrowserMcpTransport`.
    *   `[ ]` Test `ToolSystem` correctly delegating to `McpTransportManager`.
    *   `[ ]` Test full flow: `AgentCore` -> `ToolSystem` -> `McpTransportManager` -> Mock Transport -> `ToolResult` -> `ObservationManager`.
*   `[ ]` **7.3:** Write End-to-End (E2E) Tests.
    *   `[ ]` Adapt `e2e-test-app` or create a new one to load the example WASM MCP server.
    *   `[ ]` Write E2E tests that trigger agent execution requiring the WASM MCP tool.
    *   `[ ]` Verify correct `ToolResult` and `TOOL_EXECUTION` observations.
    *   `[ ]` Test API key handling flow (mocking user input/storage).
*   `[ ]` **7.4:** Documentation.
    *   `[ ]` Update `Docs/Tools/README.md` and `Future_Directions.md`.
    *   `[ ]` Create `Docs/Tools/Using_MCP_Tools.md` explaining configuration, API key handling, usage, and limitations (WASM vs stdio).
    *   `[ ]` Update architecture diagrams.
    *   `[ ]` Add TSDoc comments for all new/modified interfaces and classes.
    *   `[ ]` Update core framework README and Getting Started guides.
*   `[ ]` **7.5:** Refinement & Release Prep.
    *   `[ ]` Code review, refactoring, performance checks.
    *   `[ ]` Final build, packaging, versioning.

## Phase 8: ART-Managed Registry (Optional Enhancement)

*   *Dependency: Core MCP functionality implemented.*
*   `[ ]` **8.1:** Define format for the external registry JSON file.
*   `[ ]` **8.2:** Host the registry file (e.g., GitHub Pages, CDN).
*   `[ ]` **8.3:** Add functionality to ART (e.g., `art.mcp.fetchRegistry()`) to retrieve and parse the registry.
*   `[ ]` **8.4:** Update documentation and examples.

---

This plan provides a granular breakdown for implementing MCP support, prioritizing the WASM-in-browser use case.