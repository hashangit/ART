# Tools Overview

Tools in the ART Framework represent external capabilities or actions that an AI agent can utilize to gather information, interact with other systems, or perform tasks beyond the inherent knowledge of the Large Language Model (LLM). The framework provides a structured way to define, register, and execute these tools.

## Key Concepts and Components

1.  **`IToolExecutor` Interface (`src/core/interfaces.ts`):**
    *   This is the **contract** that all tools must implement.
    *   **`schema: ToolSchema` (readonly):** Every tool must provide a `ToolSchema` that describes its:
        *   `name`: A unique identifier for the tool.
        *   `description`: A natural language explanation of what the tool does, for the LLM to understand its purpose.
        *   `inputSchema: JsonSchema`: A JSON Schema defining the expected input arguments.
        *   `outputSchema?: JsonSchema` (Optional): A JSON Schema for the tool's successful output.
        *   `examples?: Array<{...}>` (Optional): Examples of usage.
    *   **`async execute(input: any, context: ExecutionContext): Promise<ToolResult>`:** The method containing the tool's actual logic. It receives validated `input` and an `ExecutionContext` (with `threadId`, `traceId`) and returns a `ToolResult`.

2.  **`ToolSchema` Interface (`src/types/index.ts`):**
    *   Provides the metadata that describes a tool to both the LLM (for selection and argument generation) and the ART Framework (for validation and execution). See above and the [Tools and Capabilities core concept page](../../core-concepts/tools-and-capabilities.md) for more details.

3.  **`ToolResult` Interface (`src/types/index.ts`):**
    *   The standardized structure for the outcome of a tool execution:
        *   `callId: string`: Links back to the `ParsedToolCall` ID from the LLM's plan.
        *   `toolName: string`: The name of the executed tool.
        *   `status: 'success' | 'error'`: Indicates the outcome.
        *   `output?: any`: The data returned by the tool on success.
        *   `error?: string`: An error message if execution failed.
        *   `metadata?: Record<string, any>`: Optional additional execution metadata.

4.  **`ToolRegistry` (`src/systems/tool/ToolRegistry.ts`):**
    *   A central repository for all registered `IToolExecutor` instances.
    *   Allows tools to be added (registered) and retrieved by their unique `name`.
    *   Can provide a list of `ToolSchema`s for all available (and potentially thread-enabled) tools, which is crucial for prompting the LLM.

5.  **`ToolSystem` (`src/systems/tool/ToolSystem.ts`):**
    *   Orchestrates the actual execution of tools requested by the agent.
    *   It takes `ParsedToolCall` objects (from the `OutputParser`), verifies tool enablement (via `StateManager`), retrieves the executor from `ToolRegistry`, validates input arguments against the `ToolSchema`, calls the executor's `execute` method, and records `TOOL_EXECUTION` observations.

6.  **`ParsedToolCall` (`src/types/index.ts`):**
    *   Represents the LLM's request to use a tool, as interpreted by the `OutputParser` from the planning phase output. Contains `callId`, `toolName`, and `arguments`.

## Workflow of Tool Usage (Typical in `PESAgent`)

1.  **Tool Definition & Registration:**
    *   Developers create custom tool classes implementing `IToolExecutor`.
    *   Instances of these tools are provided in `ArtInstanceConfig.tools` when calling `createArtInstance`.
    *   The `AgentFactory` registers these tools with the `ToolRegistry`.
2.  **Planning Phase:**
    *   The agent (e.g., `PESAgent`) retrieves schemas of available (and enabled) tools from the `ToolRegistry`.
    *   These tool schemas (name, description, input schema) are included in the prompt sent to the LLM.
    *   The LLM, if it decides a tool is necessary, includes a request to call the tool (with specific arguments) in its planning output. This is often in a structured format like JSON.
    *   The `OutputParser` processes the LLM's planning output and extracts these requests as `ParsedToolCall` objects.
3.  **Execution Phase:**
    *   The agent passes the `ParsedToolCall` objects to the `ToolSystem.executeTools()`.
    *   The `ToolSystem` handles the execution of each tool as described above.
4.  **Synthesis Phase:**
    *   The `ToolResult`s (both successes and errors) are provided back to the agent.
    *   The agent includes these results in the context for the synthesis prompt, allowing the LLM to use the tool outputs to formulate its final response or explain any tool failures.

## Built-in Tools

ART `v0.2.7` includes:

*   **[`CalculatorTool`](calculator-tool.md):** A tool for evaluating mathematical expressions using a sandboxed `mathjs` environment.

## Creating Custom Tools

Refer to the [Creating Custom Tools](./creating-custom-tools.md) guide for detailed instructions on how to implement the `IToolExecutor` interface and define your tool's `ToolSchema`. This is a core extensibility point of the ART Framework.