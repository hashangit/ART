# Deep Dive: `ToolRegistry`

The `ToolRegistry` is a component of ART's Tool System responsible for managing the collection of available tools (`IToolExecutor` instances) that an agent can potentially use. It allows for the registration of tools and provides a way to retrieve them by name or get a list of their schemas.

*   **Source:** `src/systems/tool/ToolRegistry.ts`
*   **Implements:** `ToolRegistry` interface from `src/core/interfaces.ts`
*   **Dependencies (Optional):** `StateManager`.

## Constructor

```typescript
constructor(stateManager?: StateManager)
```

*   `stateManager?: StateManager` (Optional): An instance implementing `StateManager`.
    *   If a `StateManager` is provided, the `ToolRegistry` can use it in its `getAvailableTools` method to filter the returned tool schemas based on which tools are enabled for a specific thread (via `ThreadConfig.enabledTools`).
    *   If no `StateManager` is provided, `getAvailableTools` will always return all registered tools when a filter by `enabledForThreadId` is attempted, logging a warning.

## Core Responsibilities & Methods

1.  **Registering Tools:**
    *   **`async registerTool(executor: IToolExecutor): Promise<void>`**
        *   **Purpose:** To add a tool (an instance of `IToolExecutor`) to the registry, making it available for use.
        *   **Process:**
            1.  Validates that the provided `executor` is valid and has a `schema` with a `name`. If not, it throws an error.
            2.  Uses the `executor.schema.name` as the key to store the `executor` instance in an internal `Map`.
            3.  If a tool with the same name already exists in the registry, it will be **overwritten**, and a warning message is logged.
            4.  Logs a debug message upon successful registration.

2.  **Retrieving Tool Executors:**
    *   **`async getToolExecutor(toolName: string): Promise<IToolExecutor | undefined>`**
        *   **Purpose:** To fetch a specific tool executor instance by its registered name.
        *   **Process:**
            1.  Looks up the `toolName` in its internal `Map` of executors.
            2.  If found, returns the `IToolExecutor` instance.
            3.  If not found, logs a debug message and returns `undefined`.

3.  **Getting Available Tool Schemas:**
    *   **`async getAvailableTools(filter?: { enabledForThreadId?: string }): Promise<ToolSchema[]>`**
        *   **Purpose:** To retrieve the `ToolSchema` objects for available tools, potentially filtered by what's enabled for a specific thread.
        *   **Process:**
            1.  Retrieves all registered tool executors and maps them to their `ToolSchema`s.
            2.  **Filtering (if `filter.enabledForThreadId` and `StateManager` are present):**
                *   If `filter.enabledForThreadId` is provided AND a `StateManager` instance was supplied to the `ToolRegistry`'s constructor:
                    *   It calls `this.stateManager.loadThreadContext(threadId)` to get the `ThreadConfig`.
                    *   It then filters the list of all tool schemas, keeping only those whose names are included in the `threadContext.config.enabledTools` array.
                    *   If `enabledTools` is not found in the config or is not an array, or if `loadThreadContext` fails, it logs a warning/error and defaults to returning all registered tool schemas as a fallback.
            3.  **No Filtering:**
                *   If `filter.enabledForThreadId` is provided but no `StateManager` was configured, it logs a warning and returns all registered tool schemas.
                *   If no `filter` (or no `enabledForThreadId` in the filter) is provided, it returns all registered tool schemas.
            4.  Logs debug messages indicating the filtering status and the number of schemas being returned.

4.  **Clearing Tools:**
    *   **`async clearAllTools(): Promise<void>`**
        *   **Purpose:** To remove all registered tool executors from the registry.
        *   **Process:** Clears the internal `Map` of executors.
        *   Useful primarily for testing or specific application reset scenarios.

## Usage

*   **Initialization:** An instance of `ToolRegistryImpl` is created by the `AgentFactory` during ART setup. Any tools provided in `ArtInstanceConfig.tools` are registered at this time.
*   **By `ToolSystem`:** The `ToolSystem` uses `toolRegistry.getToolExecutor(toolName)` to fetch the executor for a tool that the agent's plan has requested.
*   **By Agent Logic (e.g., `PESAgent`):** The agent logic calls `toolRegistry.getAvailableTools({ enabledForThreadId: currentThreadId })` to get the list of tools that are currently permitted and relevant. The schemas of these tools (especially their names and descriptions) are then included in the planning prompt to inform the LLM about the capabilities it can request.

The `ToolRegistry` provides a simple yet effective mechanism for managing tools within the ART Framework, with an optional integration with `StateManager` for thread-specific tool enablement.