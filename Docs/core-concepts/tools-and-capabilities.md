# Tools and Capabilities in ART

A key feature of advanced AI agents is their ability to interact with the external world, fetch information, or perform actions beyond the inherent knowledge of the Large Language Model (LLM). The ART Framework provides a robust **Tool System** to define, manage, and execute these external capabilities, referred to as "tools."

## Core Components of the Tool System

1.  **`IToolExecutor` Interface (`src/core/interfaces.ts`):**
    *   This is the fundamental interface that every custom tool must implement.
    *   **`schema: ToolSchema` (readonly):** Each tool must expose a `ToolSchema` that describes its functionality to both the LLM (for deciding when and how to use the tool) and the `ToolSystem` (for input validation).
    *   **`async execute(input: any, context: ExecutionContext): Promise<ToolResult>`:** The method that contains the actual logic of the tool.
        *   `input`: The arguments provided by the LLM for the tool call, which should have been validated against `schema.inputSchema` by the `ToolSystem`.
        *   `context`: An `ExecutionContext` object providing `threadId` and `traceId`.
        *   Returns a `ToolResult` indicating success or failure, along with the output or error information.

2.  **`ToolSchema` Interface (`src/types/index.ts`):**
    *   Defines the metadata for a tool:
        *   `name: string`: A unique name for the tool (e.g., "get_current_weather", "calculator"). This name is used by the LLM to request the tool.
        *   `description: string`: A clear, natural language description of what the tool does, its capabilities, and when it should be used. This is crucial for the LLM's decision-making process.
        *   `inputSchema: JsonSchema`: A JSON Schema object that defines the expected input arguments for the tool, including their types, descriptions, and whether they are required. This is used by the `ToolSystem` to validate arguments provided by the LLM and by the LLM to understand how to structure the arguments.
        *   `outputSchema?: JsonSchema` (Optional): A JSON Schema defining the expected structure of the data returned in the `output` field of a successful `ToolResult`. Can be used for validation or by the LLM to understand what to expect back.
        *   `examples?: Array<{ input: any; output?: any; description?: string }>` (Optional): Examples of how the tool is used, which can be very helpful for LLMs, especially in few-shot prompting scenarios.

3.  **`ToolRegistry` (`src/systems/tool/ToolRegistry.ts`):**
    *   **Role:** A central place to register and retrieve `IToolExecutor` instances.
    *   **Key Methods:**
        *   `registerTool(executor: IToolExecutor)`: Adds a tool executor to the registry.
        *   `getToolExecutor(toolName: string): Promise<IToolExecutor | undefined>`: Retrieves a tool executor by its name.
        *   `getAvailableTools(filter?: { enabledForThreadId?: string }): Promise<ToolSchema[]>`: Returns the schemas of available tools.
            *   **Filtering with `StateManager`:** If a `StateManager` instance is provided to the `ToolRegistry`'s constructor, and `filter.enabledForThreadId` is used, this method will consult the `ThreadConfig.enabledTools` for that thread and only return schemas of tools permitted for that specific conversation. If no `StateManager` is available or no specific filtering is requested, it returns all registered tools.
    *   Tools can be registered when setting up the `ArtInstance` via the `tools` array in `ArtInstanceConfig`.

4.  **`ToolSystem` (`src/systems/tool/ToolSystem.ts`):**
    *   **Role:** Orchestrates the execution of tool calls that the agent's planning phase has decided to make.
    *   **Key Method: `async executeTools(toolCalls: ParsedToolCall[], threadId: string, traceId?: string): Promise<ToolResult[]>`:**
        1.  Receives an array of `ParsedToolCall` objects (these are extracted by the `OutputParser` from the LLM's planning response). Each `ParsedToolCall` includes a `callId`, `toolName`, and `arguments`.
        2.  For each `ParsedToolCall`:
            *   **Verification:** Checks if the tool is enabled for the current `threadId` using the `StateManager`. If not, it returns an error `ToolResult`.
            *   **Retrieval:** Fetches the corresponding `IToolExecutor` from the `ToolRegistry`. If not found, returns an error `ToolResult`.
            *   **Input Validation:** Validates the `arguments` from the `ParsedToolCall` against the tool's `inputSchema` using `validateJsonSchema` (from `src/utils/validation.ts`). If validation fails, returns an error `ToolResult`.
            *   **Execution:** Calls the `executor.execute(validatedArguments, executionContext)` method.
            *   **Observation:** Records a `TOOL_EXECUTION` `Observation` via the `ObservationManager`, containing the `ToolResult` (whether success or error).
        3.  Returns an array of `ToolResult` objects, one for each attempted tool call.

5.  **`ParsedToolCall` (`src/types/index.ts`):**
    *   The structure representing the LLM's request to use a tool, as parsed by the `OutputParser`.
    *   `callId: string`: A unique ID for this specific call request (often generated by the parser or a unique part of the LLM output).
    *   `toolName: string`: The name of the tool to invoke.
    *   `arguments: any`: The arguments the LLM wants to pass to the tool.

## How Agents Use Tools (Example: `PESAgent`)

1.  **Planning Phase:**
    *   The `PESAgent` constructs a planning prompt (`ArtStandardPrompt`). This prompt includes descriptions of available tools (obtained from `ToolRegistry.getAvailableTools()`, filtered for the current thread).
    *   The LLM processes this prompt and, if it decides a tool is needed, includes a "Tool Calls" section in its response, typically as a JSON array describing which tool(s) to call and with what arguments.
        *   Example LLM planning output:
            ```
            Intent: Calculate the square root of 16.
            Plan: Use the calculator tool.
            Tool Calls: [
              {"callId": "calc_sqrt_16", "toolName": "calculator", "arguments": {"expression": "sqrt(16)"}}
            ]
            ```
    *   The `OutputParser.parsePlanningOutput()` method extracts this information into `ParsedToolCall` objects.

2.  **Execution Phase:**
    *   The `PESAgent` passes the array of `ParsedToolCall`s to `ToolSystem.executeTools()`.
    *   The `ToolSystem` handles the execution of each tool as described above, returning an array of `ToolResult`s.

3.  **Synthesis Phase:**
    *   The `PESAgent` constructs a synthesis prompt. This prompt now includes the original query, the plan, and the `ToolResult`s (both successes and errors) from the execution phase.
    *   The LLM uses this information to generate a final, user-facing response. If a tool failed, the LLM can explain the failure or try to answer based on partial information.

## Defining Custom Tools

To create a custom tool for your ART agent:

1.  **Create a class** that implements the `IToolExecutor` interface.
2.  **Define the `schema` property:**
    *   `name`: Must be unique.
    *   `description`: Clear and informative for the LLM.
    *   `inputSchema`: A valid JSON Schema object for the tool's inputs.
    *   `outputSchema` (optional but recommended).
    *   `examples` (optional but recommended).
3.  **Implement the `async execute(input: any, context: ExecutionContext): Promise<ToolResult>` method:**
    *   This method contains your tool's core logic.
    *   `input` will be the validated arguments.
    *   Return a `ToolResult` with `status: 'success'` and the output, or `status: 'error'` and an error message.

**Example: A Simple Weather Tool (Conceptual)**

```typescript
// src/tools/weather-tool.ts
import { IToolExecutor, ToolSchema, ExecutionContext, ToolResult, JsonSchema, Logger } from 'art-framework';

export class WeatherTool implements IToolExecutor {
    readonly schema: ToolSchema = {
        name: "get_weather_forecast",
        description: "Gets the current weather forecast for a specified location.",
        inputSchema: {
            type: "object",
            properties: {
                location: {
                    type: "string",
                    description: "The city and state/country, e.g., 'San Francisco, CA' or 'London, UK'."
                },
                days: {
                    type: "number",
                    description: "Number of days for the forecast (e.g., 1 for current, 3 for 3-day).",
                    default: 1
                }
            },
            required: ["location"]
        } as JsonSchema, // Cast to JsonSchema for type safety if properties aren't fully exhaustive
        outputSchema: {
            type: "object",
            properties: {
                forecast: { type: "string", description: "A summary of the weather forecast." },
                temperature: { type: "string", description: "The current or average temperature." }
            },
            required: ["forecast", "temperature"]
        } as JsonSchema, // Cast to JsonSchema
        examples: [
            {
                input: { location: "Paris, France" },
                output: { forecast: "Sunny with a high of 22°C", temperature: "22°C" },
                description: "Get current weather for Paris."
            },
            {
                input: { location: "Tokyo, Japan", days: 3 },
                output: { forecast: "Mixed sunshine and clouds over the next 3 days. Average temp 18°C.", temperature: "18°C" },
                description: "Get a 3-day forecast for Tokyo."
            }
        ]
    }; // End of schema

    async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
        const { location, days = 1 } = input; // Use default for days if not provided
        const callId = context.traceId || `weather-call-${Date.now()}`; // Ensure a callId

        Logger.info(`WeatherTool: Fetching ${days}-day forecast for ${location}`, { callId, threadId: context.threadId });

        // In a real tool, you would call a weather API here.
        // For this example, we'll return mock data.
        if (typeof location !== 'string' || location.trim() === "") {
            Logger.warn(`WeatherTool: Invalid location provided.`, { location, callId });
            return {
                callId,
                toolName: this.schema.name,
                status: 'error',
                error: `Invalid location provided: '${location}'. Location must be a non-empty string.`
            };
        }

        if (location.toLowerCase().includes("error_city")) {
            Logger.warn(`WeatherTool: Simulating error for location ${location}`, { callId });
            return {
                callId,
                toolName: this.schema.name,
                status: 'error',
                error: `Simulated error: Could not fetch weather for ${location}. API unavailable.`
            };
        }

        // Mock successful response
        const mockTemperature = `${Math.floor(Math.random() * 15) + 10}°C`; // Random temp between 10-24°C
        const mockForecast = `Mock forecast for ${location} (${days} day${days > 1 ? 's' : ''}): Sunny with a chance of AI.`;

        return {
            callId,
            toolName: this.schema.name,
            status: 'success',
            output: {
                forecast: mockForecast,
                temperature: mockTemperature
            }
        };
    }
}
```

**Registering the Custom Tool:**

You would then instantiate and register this tool when setting up your ART instance:

```typescript
// In your ArtInstanceConfig (e.g., src/config/art-config.ts)
import { WeatherTool } from '../tools/weather-tool'; // Adjust path as needed
import { ArtInstanceConfig, CalculatorTool } from 'art-framework';

const myArtConfig: ArtInstanceConfig = {
  // ... other storage and provider configurations
  tools: [
    new CalculatorTool(), // Built-in tool
    new WeatherTool()      // Your custom tool
  ],
  // ... other configurations
};
```

This comprehensive tool system allows ART agents to extend their capabilities significantly, making them more versatile and powerful.