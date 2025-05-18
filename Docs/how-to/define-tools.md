# How-To: Define and Use Tools

Tools are a powerful feature of the ART Framework, enabling your AI agents to interact with external systems, fetch data, perform actions, and extend their capabilities beyond the LLM's inherent knowledge. This guide shows you how to define a custom tool and make it available to your agent.

## 1. Understand `IToolExecutor` and `ToolSchema`

Before creating a tool, review these core concepts:

*   **`IToolExecutor` (`src/core/interfaces.ts`):** The interface your custom tool class must implement. It has two main parts:
    *   `schema: ToolSchema` (readonly): Describes your tool to the LLM and ART.
    *   `async execute(input: any, context: ExecutionContext): Promise<ToolResult>`: Contains your tool's logic.
*   **`ToolSchema` (`src/types/index.ts`):** Defines the tool's metadata:
    *   `name: string`: Unique name (e.g., "get_stock_price").
    *   `description: string`: Natural language description for the LLM.
    *   `inputSchema: JsonSchema`: JSON Schema for the tool's input arguments.
    *   `outputSchema?: JsonSchema` (Optional): JSON Schema for the tool's successful output.
    *   `examples?: Array<{...}>` (Optional): Usage examples.
*   **`ToolResult` (`src/types/index.ts`):** The standardized return type from `execute()`:
    *   `callId: string`, `toolName: string`, `status: 'success' | 'error'`, `output?: any`, `error?: string`.

(Refer to [Tools and Capabilities](tools-and-capabilities.md) for more details on these.)

## 2. Create Your Custom Tool Class

Let's create a simple tool that fetches a (mock) user's to-do list.

```typescript
// src/tools/todo-list-tool.ts
import {
    IToolExecutor,
    ToolSchema,
    JsonSchema,
    ExecutionContext,
    ToolResult,
    Logger
} from 'art-framework';

// Mock data store for to-do items
const userTodoLists: Record<string, string[]> = {
    "user123": ["Buy groceries", "Book flight to Mars", "Walk the dog"],
    "user456": ["Finish ART framework documentation", "Prepare presentation"]
};

export class TodoListTool implements IToolExecutor {
    readonly schema: ToolSchema = {
        name: "get_user_todos",
        description: "Retrieves the to-do list for a specified user ID. If no user ID is provided, it attempts to fetch tasks for a default or currently inferred user (though this example requires userId).",
        inputSchema: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The unique identifier of the user whose to-do list is being requested."
                },
                filterStatus: {
                    type: "string",
                    description: "Optional. Filter tasks by status (e.g., 'pending', 'completed'). Not implemented in this mock.",
                    enum: ["pending", "completed", "all"] // Example enum
                }
            },
            required: ["userId"]
        } as JsonSchema, // Cast if schema isn't fully exhaustive for JsonSchema type
        outputSchema: {
            type: "object",
            properties: {
                userId: { type: "string" },
                todos: {
                    type: "array",
                    items: { type: "string" }
                }
            },
            required: ["userId", "todos"]
        } as JsonSchema,
        examples: [
            {
                input: { userId: "user123" },
                output: { userId: "user123", todos: ["Buy groceries", "Book flight to Mars", "Walk the dog"] },
                description: "Get to-do list for user123."
            },
            {
                input: { userId: "unknownUser" },
                error: "To-do list not found for user ID: unknownUser",
                description: "Attempt to get to-dos for a non-existent user."
            }
        ]
    };

    async execute(input: { userId: string; filterStatus?: string }, context: ExecutionContext): Promise<ToolResult> {
        const callId = context.traceId || `todo-tool-${Date.now()}`;
        Logger.info(`TodoListTool: Attempting to fetch to-dos for userId: ${input.userId}`, { callId, input, threadId: context.threadId });

        if (!input.userId) {
            const errorMsg = "userId is a required argument for get_user_todos.";
            Logger.warn(`TodoListTool: ${errorMsg}`, { callId });
            return { callId, toolName: this.schema.name, status: 'error', error: errorMsg };
        }

        const todos = userTodoLists[input.userId];

        if (todos) {
            // In a real tool, you might apply input.filterStatus here
            Logger.info(`TodoListTool: Found ${todos.length} to-dos for userId: ${input.userId}`, { callId });
            return {
                callId,
                toolName: this.schema.name,
                status: 'success',
                output: {
                    userId: input.userId,
                    todos: [...todos] // Return a copy
                }
            };
        } else {
            const errorMessage = `To-do list not found for user ID: ${input.userId}`;
            Logger.warn(`TodoListTool: ${errorMessage}`, { callId });
            return {
                callId,
                toolName: this.schema.name,
                status: 'error',
                error: errorMessage
            };
        }
    }
}
```

**Key points in this example:**
*   **`schema`:** Defines the tool's name ("get_user_todos"), a description for the LLM, and an `inputSchema` requiring a `userId`. An `outputSchema` is also provided.
*   **`execute` method:**
    *   Takes `input` (which will match the `inputSchema` after validation by `ToolSystem`) and `context`.
    *   Includes logging using `Logger`.
    *   Accesses a mock data store. In a real tool, this would be an API call, database query, etc.
    *   Returns a `ToolResult` with `status: 'success'` and the to-do list, or `status: 'error'` if the user is not found.
    *   Uses `context.traceId` for the `callId` in the result if available.

## 3. Register Your Tool

To make your `TodoListTool` available to agents, you need to register an instance of it with the `ToolRegistry`. The easiest way to do this is by including it in the `tools` array of your `ArtInstanceConfig` when calling `createArtInstance`.

```typescript
// src/config/art-config.ts (or your main setup file)
import {
    ArtInstanceConfig,
    CalculatorTool, // Example of another tool
    // ... other necessary imports from art-framework
} from 'art-framework';
import { TodoListTool } from '../tools/todo-list-tool'; // Adjust path as needed

export const myAppArtConfig: ArtInstanceConfig = {
    storage: { type: 'memory' }, // Or your preferred storage
    providers: {
        availableProviders: [
            // ... your LLM provider configurations ...
            // Example:
            // {
            //     name: 'openai-chat',
            //     adapter: OpenAIAdapter,
            //     isLocal: false,
            // }
        ]
    },
    tools: [
        new CalculatorTool(),
        new TodoListTool() // Add an instance of your custom tool
    ],
    // ... other configurations (agentCore, stateSavingStrategy, logger)
};

// Then, when you create your ART instance:
// import { createArtInstance } from 'art-framework';
// const art = await createArtInstance(myAppArtConfig);
```
The `AgentFactory` (used by `createArtInstance`) will automatically register all tools provided in this array with the `ToolRegistry`.

## 4. Enable the Tool for a Thread (Optional but Recommended)

For better control, you can specify which tools are enabled for particular conversation threads using `ThreadConfig.enabledTools`.

```typescript
// When setting up a thread or processing a query for a specific thread:
// import { StateManager, ThreadConfig, RuntimeProviderConfig } from 'art-framework';

// Assume 'stateManager' is available (e.g., from artInstance.stateManager)
// Assume 'OPENAI_API_KEY' is available

// const threadId = "user123-chat-with-todos";
// const initialThreadConfig: ThreadConfig = {
//     providerConfig: { // Default provider for this thread
//         providerName: 'openai-chat', // Matches a name in ArtInstanceConfig.providers.availableProviders
//         modelId: 'gpt-3.5-turbo',
//         adapterOptions: { apiKey: OPENAI_API_KEY }
//     },
//     enabledTools: [
//         "get_user_todos", // Enable your custom tool by its schema.name
//         "calculator"      // Also enable the calculator
//     ],
//     historyLimit: 10,
//     // systemPrompt: "You are a helpful assistant that can manage to-do lists."
// };

// await stateManager.setThreadConfig(threadId, initialThreadConfig);
```
If `enabledTools` is configured for a thread, the `ToolRegistry.getAvailableTools({ enabledForThreadId: ... })` method (used by `PESAgent`) will only return these enabled tools to be included in the LLM's planning prompt. If `enabledTools` is not set or empty, the behavior might depend on the agent or registry configuration (often defaulting to all registered tools being available, or none if strict).

## 5. Prompting the LLM to Use Your Tool

The agent's planning prompt needs to inform the LLM about the `TodoListTool` so it knows it exists and how to use it. The `PESAgent` typically does this by:
1.  Calling `toolRegistry.getAvailableTools({ enabledForThreadId: currentThreadId })`.
2.  Including the `name`, `description`, and stringified `inputSchema` of each available tool in the planning prompt.

The LLM will then use this information. If it decides `get_user_todos` is relevant, its planning output might include:

```
Tool Calls: [
  {"callId": "todo_call_1", "toolName": "get_user_todos", "arguments": {"userId": "user123"}}
]
```

The `OutputParser` extracts this, `ToolSystem` executes it, and the `ToolResult` (the to-do list or an error) is fed back into the agent's synthesis phase.

## Summary

Creating and using custom tools in ART involves:
1.  Implementing `IToolExecutor` with a clear `ToolSchema`.
2.  Registering an instance of your tool in `ArtInstanceConfig.tools`.
3.  (Optionally) Enabling the tool for specific threads via `ThreadConfig.enabledTools`.
4.  Ensuring your agent's planning prompt provides the LLM with information about available tools.

This empowers your ART agents to perform a wide range of actions and access diverse information sources.