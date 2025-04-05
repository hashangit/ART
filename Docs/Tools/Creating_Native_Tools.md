# Creating Native ART Tools (`IToolExecutor`)

This guide explains how to create a "native" tool for the ART framework by implementing the `IToolExecutor` interface directly in TypeScript. This is the primary method for adding tools that are tightly integrated with the framework's core logic.

For information on planned future methods like using MCP or LangChain tools, see [Future Directions](./Future_Directions.md).

## 1. Implement the `IToolExecutor` Interface

Create a new TypeScript file in the `src/tools/` directory (e.g., `src/tools/MyExampleTool.ts`). Define a class that implements `IToolExecutor` from `../core/interfaces`.

```typescript
// src/tools/MyExampleTool.ts
import {
    IToolExecutor,
    ToolSchema,
    ExecutionContext,
    ToolResult,
    JsonSchema // Import JsonSchema type for schema definition
} from '../core/interfaces'; // Adjust path if needed
import { Logger } from '../utils/logger'; // Adjust path if needed

export class MyExampleTool implements IToolExecutor {
    // Implementation details follow...
}
```

## 2. Define the Static `toolName`

Add a unique static identifier for your tool. This name is used by the `ToolRegistry` and the LLM to refer to the tool.

```typescript
export class MyExampleTool implements IToolExecutor {
    public static readonly toolName = "my_example_tool";

    // ... rest of the class
}
```

## 3. Define the `schema` Property

Implement the `readonly schema: ToolSchema` property. This is crucial as it tells the framework and the LLM what your tool does, what input it expects, and what output it produces.

```typescript
export class MyExampleTool implements IToolExecutor {
    public static readonly toolName = "my_example_tool";

    readonly schema: ToolSchema = {
        // Must match the static toolName
        name: MyExampleTool.toolName,

        // Clear description for the LLM and developers
        description: "An example tool that processes a string input and returns its length.",

        // Define input arguments using JSON Schema
        inputSchema: {
            type: 'object',
            properties: {
                inputText: {
                    type: 'string',
                    description: 'The string input to be processed.'
                },
                prefix: {
                    type: 'string',
                    description: 'An optional prefix to add to the output message.',
                    default: 'Result:' // Example default value
                }
            },
            // Specify required input properties
            required: ['inputText']
        } as JsonSchema, // Cast to JsonSchema for type safety

        // Optional: Define the structure of the 'output' field in a successful ToolResult
        outputSchema: {
            type: 'object',
            properties: {
                message: { type: 'string', description: 'The processed output message.' },
                length: { type: 'number', description: 'The length of the input string.' }
            },
            required: ['message', 'length']
        } as JsonSchema, // Cast to JsonSchema

        // Optional but highly recommended: Provide examples
        examples: [
            {
                input: { inputText: "Hello ART" },
                output: { message: "Result: Input 'Hello ART' has length 9.", length: 9 },
                description: "Basic usage without prefix."
            },
            {
                input: { inputText: "Test", prefix: "Processed:" },
                output: { message: "Processed: Input 'Test' has length 4.", length: 4 },
                description: "Usage with a custom prefix."
            },
            {
                input: { /* Missing inputText */ },
                // Note: Error examples aren't formally part of ToolSchema,
                // but good practice to document expected failures.
                // The framework handles input validation errors before execute() is called.
                description: "Example of invalid input (missing required 'inputText')."
            }
        ]
    };

    // ... execute method follows
}
```

**Schema Best Practices:**

*   **`description`:** Be very clear and specific. The LLM relies heavily on this to decide when to use your tool. Mention capabilities and limitations.
*   **`inputSchema`:** Define types accurately. Use `description` for each property to guide the LLM. Mark essential properties in `required`.
*   **`outputSchema`:** Helps with documentation and potentially future validation/typing, although sometimes omitted for complex return types (like in `CalculatorTool`).
*   **`examples`:** Provide diverse examples covering common use cases and edge cases.

## 4. Implement the `execute` Method

This asynchronous method contains the core logic of your tool. It receives the validated input and execution context, performs the action, and returns the result.

```typescript
export class MyExampleTool implements IToolExecutor {
    // ... toolName and schema ...

    async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
        // Extract callId from context for logging and result
        // Use traceId if available, otherwise generate a fallback
        const callId = context.traceId || `${MyExampleTool.toolName}-${Date.now()}`; // Basic fallback

        Logger.info(`Executing ${MyExampleTool.toolName}`, { callId, input, threadId: context.threadId });

        try {
            // --- Input Validation (Optional but Recommended) ---
            // Although ToolSystem validates schema, you might add specific checks
            // or handle type casting defensively.
            const inputText = input.inputText as string;
            const prefix = (input.prefix || this.schema.inputSchema.properties.prefix.default) as string; // Use default if needed

            if (typeof inputText !== 'string') {
                 throw new Error("Input 'inputText' must be a string.");
            }

            // --- Tool Logic ---
            const length = inputText.length;
            const message = `${prefix} Input '${inputText}' has length ${length}.`;
            // --- End Tool Logic ---

            // --- Success Result ---
            const outputData = { message, length };
            Logger.info(`${MyExampleTool.toolName} successful`, { callId, output: outputData });
            return {
                callId: callId,
                toolName: this.schema.name,
                status: 'success',
                output: outputData, // Matches outputSchema
            };

        } catch (error: any) {
            // --- Error Handling ---
            Logger.error(`${MyExampleTool.toolName} failed: ${error.message}`, { callId, error, threadId: context.threadId });
            return {
                callId: callId,
                toolName: this.schema.name,
                status: 'error',
                error: `Execution failed: ${error.message}`, // Provide a clear error message
            };
        }
    }
}
```

**`execute` Method Best Practices:**

*   **Use `ExecutionContext`:** Primarily use `context.traceId` for the `callId` in logs and the returned `ToolResult`. `threadId` and `userId` are available if needed for context-specific logic (though rare for isolated tools).
*   **Logging:** Use the `Logger` extensively for debugging (`Logger.debug`), informational messages (`Logger.info`), and errors (`Logger.error`). Always include the `callId`.
*   **Input Handling:** Even though `ToolSystem` validates against the schema, defensively check types or specific constraints within `execute` if necessary.
*   **Error Handling:** Use `try...catch` to capture errors. Return a `ToolResult` with `status: 'error'` and a meaningful `error` message. Avoid letting raw exceptions escape.
*   **Return `ToolResult`:** Always return a valid `ToolResult` object, ensuring `callId` and `toolName` are set correctly, along with `status` and `output` or `error`.

## 5. Export the Tool

Ensure your tool class is exported from the main framework entry point (`src/index.ts`) so it can be imported by applications using ART.

```typescript
// src/index.ts
// ... other exports

// --- Tools ---
export { CalculatorTool } from './tools/CalculatorTool';
export { MyExampleTool } from './tools/MyExampleTool'; // <-- Add your tool export

// ... rest of the file
```

By following these steps, you create a native tool that integrates seamlessly with the ART framework's Tool System. Remember to also write unit tests for your tool's logic (see [Security and Best Practices](./Security_and_Best_Practices.md)). The next step is to understand how this tool is registered and used within the framework lifecycle, covered in [Tool Lifecycle and Integration](./Tool_Lifecycle_and_Integration.md).