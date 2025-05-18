# Creating Custom Tools

The ART Framework's tool system is designed to be extensible, allowing you to empower your AI agents with custom capabilities. By creating classes that implement the `IToolExecutor` interface, you can define tools that interact with external APIs, databases, internal application logic, or perform any other specialized task.

## Steps to Create a Custom Tool

1.  **Define the Tool's Purpose and Interface:**
    *   Clearly define what the tool will do.
    *   Determine the inputs it needs and the output it will produce.

2.  **Create a Tool Class Implementing `IToolExecutor`:**
    *   **Source:** Typically in your project's `src/tools/` directory.
    *   Import necessary types from `art-framework`:
        ```typescript
        import {
            IToolExecutor,
            ToolSchema,
            JsonSchema, // For defining input/output schemas
            ExecutionContext,
            ToolResult,
            Logger // Optional, for logging within your tool
        } from 'art-framework';
        ```

3.  **Implement the `schema` Property (Readonly `ToolSchema`):**
    This is crucial metadata that describes your tool to both the LLM and the ART framework.
    *   **`name: string`:** A unique, descriptive name for the tool (e.g., "get_stock_price", "send_email"). This name is used by the LLM to request the tool. Use snake_case for multi-word names if your LLM prefers it for function calling.
    *   **`description: string`:** A clear, natural language explanation of:
        *   What the tool does.
        *   When it should be used.
        *   Any important considerations or limitations.
        This description is vital for the LLM to make an informed decision about using your tool.
    *   **`inputSchema: JsonSchema`:** A [JSON Schema](https://json-schema.org/) object defining the expected input arguments for your tool.
        *   Specify `type: "object"`.
        *   Define `properties` for each argument, including its `type` (e.g., "string", "number", "boolean", "array", "object") and a `description` for the LLM.
        *   List required arguments in a `required: string[]` array.
        *   Example:
            ```typescript
            inputSchema: {
                type: "object",
                properties: {
                    city: { type: "string", description: "The city name, e.g., 'London'." },
                    countryCode: { type: "string", description: "The 2-letter ISO country code, e.g., 'GB'." }
                },
                required: ["city"]
            } as JsonSchema, // Cast if properties isn't exhaustive for JsonSchema type
            ```
    *   **`outputSchema?: JsonSchema` (Optional but Recommended):** A JSON Schema defining the structure of the data your tool returns in the `output` field of a successful `ToolResult`. This helps the LLM understand what kind of data to expect back.
    *   **`examples?: Array<{ input: any; output?: any; error?: string; description?: string }>` (Optional but Recommended):**
        *   Provide a few examples of how the tool is called (sample `input` arguments) and what its `output` (on success) or `error` (on failure) might look like.
        *   These examples can significantly help the LLM understand how to use the tool correctly, especially for few-shot prompting.

4.  **Implement the `async execute(input: any, context: ExecutionContext): Promise<ToolResult>` Method:**
    This is where your tool's core logic resides.
    *   **`input: any`:** This will be an object containing the arguments for your tool, as provided by the LLM and **already validated** by the `ToolSystem` against your `inputSchema`. You can safely access `input.argumentName`.
    *   **`context: ExecutionContext`:** Provides:
        *   `threadId: string`: The ID of the current conversation thread.
        *   `traceId?: string`: The trace ID for the current agent execution cycle.
        *   You can use these for logging, or if your tool needs to interact with thread-specific data.
    *   **Logic:** Implement the functionality of your tool. This might involve:
        *   Calling external APIs.
        *   Querying a database.
        *   Performing calculations or data transformations.
        *   Interacting with other parts of your application.
    *   **Return `ToolResult`:**
        *   **On Success:**
            ```typescript
            return {
                callId: context.traceId || 'some-unique-call-id', // Best to use provided traceId if available
                toolName: this.schema.name,
                status: 'success',
                output: { /* your tool's result data */ }
            };
            ```
            The `output` should ideally match your `outputSchema` if defined.
        *   **On Failure:**
            Catch any errors and return a `ToolResult` with `status: 'error'`.
            ```typescript
            return {
                callId: context.traceId || 'some-unique-call-id',
                toolName: this.schema.name,
                status: 'error',
                error: "Descriptive error message about what went wrong."
            };
            ```
            Use `Logger.error()` for more detailed internal logging if needed.

## Example: Simple User Profile Tool

```typescript
// src/tools/user-profile-tool.ts
import {
    IToolExecutor,
    ToolSchema,
    JsonSchema,
    ExecutionContext,
    ToolResult,
    Logger
} from 'art-framework';

interface UserProfile {
    userId: string;
    name: string;
    email?: string;
    preferences?: Record<string, any>;
}

// Mock database
const MOCK_USER_DB: Record<string, UserProfile> = {
    "user123": { userId: "user123", name: "Alice Wonderland", email: "alice@example.com", preferences: { theme: "dark" } },
    "user456": { userId: "user456", name: "Bob The Builder" }
};

export class UserProfileTool implements IToolExecutor {
    readonly schema: ToolSchema = {
        name: "get_user_profile",
        description: "Retrieves the profile information for a given user ID. Returns name, email, and preferences if available.",
        inputSchema: {
            type: "object",
            properties: {
                userId: {
                    type: "string",
                    description: "The unique identifier of the user."
                }
            },
            required: ["userId"]
        } as JsonSchema,
        outputSchema: {
            type: "object",
            properties: {
                userId: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
                preferences: { type: "object" }
            },
            required: ["userId", "name"]
        } as JsonSchema,
        examples: [
            {
                input: { userId: "user123" },
                output: { userId: "user123", name: "Alice Wonderland", email: "alice@example.com", preferences: { theme: "dark" } },
                description: "Get Alice's profile."
            },
            {
                input: { userId: "user789" },
                output: null, // Or an error status if appropriate for your design
                error: "User profile not found for ID: user789",
                description: "Attempt to get a non-existent user."
            }
        ]
    };

    async execute(input: { userId: string }, context: ExecutionContext): Promise<ToolResult> {
        const callId = context.traceId || `user-profile-${Date.now()}`;
        Logger.info(`UserProfileTool: Attempting to fetch profile for userId: ${input.userId}`, { callId, threadId: context.threadId });

        const profile = MOCK_USER_DB[input.userId];

        if (profile) {
            return {
                callId,
                toolName: this.schema.name,
                status: 'success',
                output: profile // The profile object itself
            };
        } else {
            const errorMessage = `User profile not found for ID: ${input.userId}`;
            Logger.warn(`UserProfileTool: ${errorMessage}`, { callId });
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

5.  **Register Your Tool:**
    Add an instance of your new tool to the `tools` array in your `ArtInstanceConfig` when calling `createArtInstance`.

    ```typescript
    // src/config/art-config.ts
    import { ArtInstanceConfig /* ... other imports */ } from 'art-framework';
    import { UserProfileTool } from '../tools/user-profile-tool'; // Adjust path

    export const myAppArtConfig: ArtInstanceConfig = {
        // ... storage and provider config ...
        tools: [
            new UserProfileTool(),
            // ... other tools ...
        ],
        // ...
    };
    ```

By following these steps, you can extend your ART agent's capabilities to interact with any system or perform any action you need. Remember that clear descriptions and well-defined input/output schemas are key to enabling the LLM to use your tools effectively.