# Example: Agent with Tools

This example builds upon the basic chatbot by demonstrating how to integrate and use tools with the `PESAgent` in the ART Framework. We'll use the built-in `CalculatorTool`.

## 1. Project Setup

Ensure you have [installed ART Framework](installation.md).
If you followed the [Basic Chatbot](basic-chatbot.md) example, you can modify that file or create a new one, e.g., `src/agent-with-tools.ts`.

## 2. Code

```typescript
// src/agent-with-tools.ts
import {
    createArtInstance,
    ArtInstanceConfig,
    AgentProps,
    LogLevel,
    OpenAIAdapter, // Using OpenAI for this example as it has good function calling
    CalculatorTool // Import the built-in tool
} from 'art-framework';
import dotenv from 'dotenv'; // For loading .env file

dotenv.config(); // Load environment variables from .env file

async function runAgentWithTools() {
    console.log("Setting up Agent with Tools...");

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        console.error("ERROR: OPENAI_API_KEY environment variable is not set. This example requires it.");
        return;
    }

    // --- Configuration ---
    const artConfig: ArtInstanceConfig = {
        storage: {
            type: 'memory'
        },
        providers: {
            availableProviders: [
                {
                    name: 'openai-for-tools',
                    adapter: OpenAIAdapter,
                    isLocal: false,
                }
            ],
        },
        // *** Register tools here ***
        tools: [
            new CalculatorTool(), // Instantiate and add the CalculatorTool
            // Add other custom or built-in tools here: new MyCustomTool(),
        ],
        logger: {
            level: LogLevel.DEBUG // Use DEBUG to see more internal ART logs, including tool calls
        },
        // Default PESAgent will be used
    };

    const art = await createArtInstance(artConfig);
    console.log("ART Instance with Tools initialized.");

    // --- Interaction ---
    const threadId = "tools-chat-thread-001";
    const userId = "tool-user";

    // Helper function
    async function ask(query: string) {
        console.log(`\nYOU: ${query}`);
        const agentProps: AgentProps = {
            query,
            threadId,
            userId,
            options: {
                providerConfig: {
                    providerName: 'openai-for-tools',
                    // Use a model known for good function/tool calling
                    modelId: 'gpt-3.5-turbo', // or 'gpt-4o-mini', 'gpt-4o'
                    adapterOptions: { apiKey: OPENAI_API_KEY }
                },
                // stream: true, // Enable for token-by-token, requires UI handling
            }
        };

        try {
            const finalResponse = await art.process(agentProps);
            console.log(`AGENT: ${finalResponse.response.content}`);
            console.log(`  (Metadata: Status=${finalResponse.metadata.status}, LLM Calls=${finalResponse.metadata.llmCalls}, Tool Calls=${finalResponse.metadata.toolCalls}, Duration=${finalResponse.metadata.totalDurationMs}ms)`);
            if (finalResponse.metadata.error) {
                console.error(`  Agent Error: ${finalResponse.metadata.error}`);
            }

            // For detailed inspection, look at observations:
            // const observations = await art.observationManager.getObservations(threadId);
            // observations
            //    .filter(obs => obs.type === 'TOOL_CALL' || obs.type === 'TOOL_EXECUTION')
            //    .forEach(obs => console.log("Relevant Observation:", obs.type, obs.content));

        } catch (error) {
            console.error("Error during agent processing with tools:", error);
        }
    }

    // Queries that should trigger the calculator tool
    await ask("What is 125 divided by 5, then multiplied by 3?");
    await ask("If I have a square room that is 7 meters on one side, what is its area in square meters?");
    // Query that uses the 'ans' variable of calculator tool
    await ask("Calculate 100 + 50.");
    await ask("Now, what is the previous answer (ans) divided by 3?");
    await ask("What is your name?"); // Should not use a tool

    console.log("\nAgent with tools session finished.");
}

runAgentWithTools().catch(console.error);
```

## 3. `.env` File

Create a `.env` file in the root of your project (and add it to `.gitignore`!):

```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

## 4. Running the Example

1.  Install `dotenv` if you haven't: `npm install dotenv`
2.  Run the script:
    ```bash
    npx ts-node src/agent-with-tools.ts
    ```

## Expected Output (Illustrative)

The exact LLM responses will vary. You should see logs indicating tool usage. With `LogLevel.DEBUG`, you'll see detailed ART logs, including the "Tool Calls" section in the planning output and "TOOL_EXECUTION" observations.

```
Setting up Agent with Tools...
[ART] ToolRegistry: Registered tool "calculator".
... (other initialization logs) ...
ART Instance with Tools initialized.

YOU: What is 125 divided by 5, then multiplied by 3?
[ART] PESAgent processing query for thread tools-chat-thread-001: "What is 125 divided by 5, then multiplied by 3?"
...
[ART] OutputParser: Parsed Tool Calls: [{"callId":"...", "toolName":"calculator","arguments":{"expression":"125 / 5 * 3"}}]
[ART] ToolSystem executing 1 tool calls for thread tools-chat-thread-001
[ART] CalculatorTool executing with expression: "125 / 5 * 3" ...
[ART] Tool "calculator" execution successful
[ART] ObservationManager: Recording observation: TOOL_EXECUTION ... "output":{"result":75} ...
...
AGENT: 125 divided by 5 is 25, and 25 multiplied by 3 is 75.
  (Metadata: Status=success, LLM Calls=2, Tool Calls=1, Duration=...ms)

YOU: If I have a square room that is 7 meters on one side, what is its area in square meters?
...
AGENT: The area of a square room that is 7 meters on one side is 49 square meters.
  (Metadata: Status=success, LLM Calls=2, Tool Calls=1, Duration=...ms)

YOU: Calculate 100 + 50.
...
AGENT: 100 + 50 equals 150.
  (Metadata: Status=success, LLM Calls=2, Tool Calls=1, Duration=...ms)

YOU: Now, what is the previous answer (ans) divided by 3?
...
AGENT: The previous answer (150) divided by 3 is 50.
  (Metadata: Status=success, LLM Calls=2, Tool Calls=1, Duration=...ms)

YOU: What is your name?
...
AGENT: I am a large language model trained by OpenAI.
  (Metadata: Status=success, LLM Calls=2, Tool Calls=0, Duration=...ms)

Agent with tools session finished.
```

## Key Concepts Illustrated

*   **Tool Registration:** Adding `new CalculatorTool()` to `ArtInstanceConfig.tools` makes it available.
*   **LLM Prompting for Tools:** The `PESAgent` (by default) includes descriptions of available tools (from their `ToolSchema`) in the planning prompt it sends to the LLM.
*   **Tool Call Detection:** The LLM, when appropriate, includes a request to call a tool (e.g., "calculator") with specific arguments in its planning output.
*   **`OutputParser`:** Extracts these tool call requests (`ParsedToolCall` objects).
*   **`ToolSystem`:**
    *   Receives `ParsedToolCall`s.
    *   Verifies if the tool is enabled for the thread (using `StateManager` - by default, all registered tools are enabled unless `ThreadConfig.enabledTools` restricts them).
    *   Retrieves the `IToolExecutor` from `ToolRegistry`.
    *   Validates the arguments from the LLM against the tool's `inputSchema`.
    *   Calls the tool's `execute` method.
*   **`ToolResult`:** The outcome of the tool execution is passed back to the `PESAgent`.
*   **Synthesis with Tool Results:** The `PESAgent` includes the `ToolResult`(s) in the context for the synthesis LLM call, allowing the LLM to use the tool's output to formulate the final answer.
*   **`ans` Variable:** The `CalculatorTool` demonstrates internal state per thread by remembering the last result as `ans`.

This example provides a foundation for building agents that can leverage custom or built-in tools to perform a wide variety of tasks.