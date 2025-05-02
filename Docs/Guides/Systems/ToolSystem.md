# Tool System Guide (v0.2.4)

## Overview

The Tool System (TS) is a fundamental component of the Agent Runtime (ART) Framework, enabling agents to interact with external capabilities, APIs, or perform specific computations beyond the core LLM reasoning. It provides a structured, secure, and observable way to define, register, discover, validate, and execute tools within the agent's workflow.

The core philosophy is **schema-driven development**: tools are defined with clear JSON schemas for their inputs, which allows the LLM to understand how to use them and enables the framework to validate calls before execution.

## Core Components

The Tool System relies on several key interfaces and classes:

1.  **`ToolSchema`**: An interface defining the metadata for a tool, including its `name`, `description`, and `inputSchema` (a JSON Schema object). This schema is crucial for both the LLM's planning phase and runtime validation.
2.  **`IToolExecutor`**: An interface that concrete tool implementations must adhere to. It requires a `schema` property (of type `ToolSchema`) and an `execute` method.
3.  **`ToolRegistry`**: A central registry where instances of `IToolExecutor` are registered. It allows the framework to look up available tools and their executors by name.
4.  **`ToolSystem`**: The main service class that orchestrates the execution of multiple tool calls requested by the Agent Core. It interacts with the `ToolRegistry`, `StateManager` (for permission checks), and `ObservationManager` (for logging).

## Key Concepts & Flow

### 1. Tool Definition (`ToolSchema` & `IToolExecutor`)

Tools are defined by implementing the `IToolExecutor` interface.

*   **Schema (`ToolSchema`)**:
    *   `name`: A unique identifier for the tool (e.g., `CalculatorTool`, `WebSearch`).
    *   `description`: A clear, concise description explaining what the tool does, intended for the LLM to understand its purpose.
    *   `inputSchema`: A standard JSON Schema object defining the expected input arguments, their types, and whether they are required. This is critical for validation.
    *   *(Optional)* `outputSchema`: Defines the expected structure of the successful output.
    *   *(Optional)* `examples`: Usage examples to help the LLM formulate correct calls.

*   **Executor (`IToolExecutor`)**:
    *   Contains the actual logic to perform the tool's action in its `execute` method.
    *   The `execute` method receives the validated input arguments and an `ExecutionContext` object (containing `threadId`, `traceId`, etc.).
    *   It must return a `Promise<ToolResult>`.

*For detailed instructions and examples, see [Creating Native Tools](../../Tools/Creating_Native_Tools.md).*

### 2. Tool Registration (`ToolRegistry`)

Before a tool can be used, an instance of its executor must be registered with the `ToolRegistry`. This is typically done during the initialization of the `ArtClient` via `createArtInstance`.

```typescript
import { createArtInstance, CalculatorTool, WebSearchTool } from 'art-framework';

const art = await createArtInstance({
  // ... other config
  tools: [
    new CalculatorTool(), 
    new WebSearchTool({ apiKey: 'YOUR_SEARCH_API_KEY' }) 
  ] 
});
```

The `createArtInstance` factory handles registering the provided tool instances with the internal `ToolRegistry`.

### 3. Tool Discovery & Planning

During the Planning phase of the PES pattern, the Agent Core:
1.  Retrieves the list of `enabledTools` for the current `threadId` from the `StateManager`.
2.  Uses the `ToolRegistry` to get the `ToolSchema` definitions for *only* those enabled tools.
3.  Includes these schemas in the planning prompt sent to the LLM.

The LLM uses the tool names, descriptions, and input schemas to decide *if*, *when*, and *how* to call tools to fulfill the user's query, generating `ParsedToolCall` objects in its plan.

### 4. Tool Execution (`ToolSystem.executeTools`)

When the Agent Core receives a plan containing tool calls, it passes the `ParsedToolCall[]` array to the `ToolSystem.executeTools` method. The `ToolSystem` then performs the following steps for *each* planned call:

1.  **Verification:** Checks if the requested `toolName` is actually enabled for the current `threadId` using `StateManager.isToolEnabled()`. If not, an error result is generated.
2.  **Lookup:** Retrieves the corresponding `IToolExecutor` instance from the `ToolRegistry`. If not found, an error result is generated.
3.  **Validation:** Validates the `arguments` provided in the `ParsedToolCall` against the `executor.schema.inputSchema`. If validation fails, an error result is generated.
4.  **Execution:** If verification and validation pass, it calls the `executor.execute(validatedArgs, executionContext)` method.
    *   It passes an `ExecutionContext` containing relevant IDs (`threadId`, `traceId`, `userId`, `sessionId`).
    *   It enforces security constraints like timeouts.
    *   It catches any runtime errors thrown by the tool's logic.
5.  **Result Formatting:** Captures the outcome (success or error) in a standardized `ToolResult` object, including the original `callId`, `toolName`, `status`, `output` or `error`, and execution metadata (like duration).
6.  **Observation:** Records the execution attempt and its outcome by calling `ObservationManager.record` with a `TOOL_EXECUTION` type observation containing the `ToolResult`. This makes the tool usage visible for debugging and UI updates.

The `ToolSystem.executeTools` method returns an array containing the `ToolResult` for every attempted tool call in the plan.

*For a deeper dive into how tools fit into the overall agent lifecycle, see [Tool Lifecycle and Integration](../../Tools/Tool_Lifecycle_and_Integration.md).*

### 5. Security & Best Practices

*   **Schema Validation:** Always define strict `inputSchema` for your tools to prevent unexpected inputs.
*   **Permissions:** Use the `enabledTools` configuration in `ThreadConfig` (managed by `StateManager`) to control which tools are accessible in different contexts.
*   **Timeouts:** Implement timeouts within your tool's `execute` method or rely on framework-level timeouts (if configured) to prevent long-running tools from blocking the agent.
*   **Input Sanitization:** Sanitize any inputs that might be used in potentially unsafe ways (e.g., in shell commands or database queries), although relying on structured inputs and avoiding direct execution of arbitrary code is preferred. The `CalculatorTool` example uses `mathjs` to safely evaluate expressions instead of `eval`.
*   **Resource Limiting:** Be mindful of resource consumption (CPU, memory, network) within tool execution, especially in browser environments.

*For more detailed security advice, refer to [Security and Best Practices](../../Tools/Security_and_Best_Practices.md).*

## Example: `CalculatorTool`

ART includes a simple `CalculatorTool` as a basic example:

```typescript
// Simplified representation
import { IToolExecutor, ToolSchema, ToolResult, ExecutionContext } from 'art-framework';
import * as math from 'mathjs'; // Using a safe math library

export class CalculatorTool implements IToolExecutor {
  schema: ToolSchema = {
    name: "CalculatorTool",
    description: "Calculates the result of a mathematical expression. Uses mathjs library.",
    inputSchema: {
      type: "object",
      properties: {
        expression: { 
          type: "string", 
          description: "The mathematical expression to evaluate (e.g., '2 + 2 * (5 / 3)')" 
        }
      },
      required: ["expression"]
    },
    // Optional examples
    examples: [
        { input: { expression: "sqrt(16) + 2^3" }, output: { result: 12 } },
        { input: { expression: "(10 + 5) / 3" }, output: { result: 5 } }
    ]
  };

  async execute(input: { expression: string }, context: ExecutionContext): Promise<ToolResult> {
    try {
      // Use a safe evaluation library like mathjs
      const result = math.evaluate(input.expression);
      
      // Basic check for complex numbers or unsupported types if needed
      if (typeof result === 'object' && result.isComplex) {
           return { status: 'success', output: { result: math.format(result) } }; // Format complex numbers
      }
      if (typeof result !== 'number' || !Number.isFinite(result)) {
          throw new Error("Evaluation resulted in a non-finite number or unsupported type.");
      }

      return { status: 'success', output: { result: result } };
    } catch (error) {
      return { status: 'error', error: `Calculation failed: ${error.message}` };
    }
  }
}
```

This tool defines its input (`expression`) via schema and uses the safe `math.evaluate` function to perform the calculation.

## Future Directions

*   Integration with the **Model Context Protocol (MCP)** for standardized tool discovery and execution across different systems.
*   **WebAssembly (WASM) Tool Environment** for running complex tools securely and efficiently in the browser.
*   Adapters for using tools from other ecosystems like **LangChain**.
*   Enhanced **sandboxing** and permission models.
*   Support for **parallel tool execution**.

*See [Future Directions](../../Tools/Future_Directions.md) for more details.*

## Related Guides

*   [Agent Core Guide](./AgentCore.md)
*   [Reasoning System Guide](./ReasoningSystem.md)
*   [Observation System Guide](./ObservationSystem.md)
*   [Context System Guide](./ContextSystem.md) (for `StateManager` role in enabling tools)