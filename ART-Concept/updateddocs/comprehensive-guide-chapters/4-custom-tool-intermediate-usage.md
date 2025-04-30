## 4. Scenario 2: Adding a Custom Tool (Intermediate Usage)

Now, let's extend our chatbot by adding a custom tool that provides current information like date, time, and approximate location/locale.

**Goal:** Create a `CurrentInfoTool` and integrate it into the ART configuration.
**Simplified Explanation for Developers:**

Imagine ART is like a highly capable smart assistant you've hired for your application. This assistant comes with some built-in abilities (like a calculator), but its real power is that you can easily teach it *new* skills that you create yourself.

1.  **Creating Your Custom Skill (Your Tool):** You, as the developer, define the new skill you want the assistant to have. This involves writing the code for that skill (your custom tool) and describing what it does and what information it needs to work. ART provides a standard way to define these skills (an "interface" called `IToolExecutor`). You just need to make sure your skill follows this standard format so the ART assistant can understand it.
2.  **Giving the Skill to the Assistant:** When you set up the ART assistant for your application (using the `createArtInstance` function from the ART package), you provide it with a configuration. This configuration is like giving the assistant its instructions and resources. Crucially, this configuration includes a list of *all* the skills you want the assistant to have. You add your newly created custom skill to this list, along with any of ART's built-in skills you want to use.
3.  **The Assistant Learns Your Skill:** When `createArtInstance` runs, the ART framework reads your configuration. It sees the list of skills you provided and adds them to its internal "skill library" (the `ToolRegistry`).

So, to integrate your custom tool without modifying the ART framework's source code:

*   You create your custom tool's code in a file within your application's project structure (like a `tools` folder).
*   Inside that file, you define a class for your tool and make sure it follows the rules defined by ART's `IToolExecutor` interface.
*   In the part of your application where you set up ART (where you call `createArtInstance`), you import the custom tool class you just created.
*   When you call `createArtInstance`, you pass a configuration object. Within this object, there's a `tools` array. You create a new instance of your custom tool class (`new YourCustomTool()`) and include it in this array.

By doing this, you're effectively handing your custom skill to the ART assistant during its setup. ART then knows about your tool and how to use it when needed, all without you having to touch the core ART framework code itself.

**4.1. Necessary Imports & Explanations**

In addition to the imports from Scenario 1, you'll need these specifically for creating a tool:

```typescript
// --- ART Tool Creation Imports ---
import {
  // The interface that every tool must implement
  IToolExecutor,
  // The type defining the tool's description, name, and input/output schemas
  ToolSchema,
  // The type defining the structure of the result returned by a tool's execute method
  ToolResult,
  // The type providing context (like threadId, traceId) to the tool's execute method
  ExecutionContext
} from 'art-framework';
```

**Explanation of Tool Imports:**

*   **`IToolExecutor`**
    The blueprint or set of rules your custom skill needs to follow so ART knows how to use it.
    *   **Developer Notes:** The core interface for creating custom tools. Your tool class must implement this. Key requirements:
        *   Implement a readonly `schema` property of type `ToolSchema`.
        *   Implement an `async execute(input: any, context: ExecutionContext): Promise<ToolResult>` method. This method receives validated `input` (based on `schema.inputSchema`) and the `context` object. It should perform the tool's action and return a `Promise` resolving to a `ToolResult`.

*   **`ToolSchema`**
    The tool's "instruction manual" for the AI – its name, what it does, and what information it needs to run.
    *   **Developer Notes:** Interface defining the tool's metadata, used by both the LLM (via prompts) and the `ToolSystem`. Properties:
        *   `name: string`: The unique function name the LLM will use to call the tool (e.g., "get_current_weather"). Use snake_case.
        *   `description: string`: Detailed explanation for the LLM about the tool's purpose, capabilities, and when it should be used. Crucial for effective tool selection by the LLM.
        *   `inputSchema: object`: A standard JSON Schema object describing the expected structure, types (string, number, boolean, object, array), required fields, and descriptions for the `input` argument of the `execute` method. Used by `ToolSystem` to validate arguments before execution.

*   **`ToolResult`**
    The format for the tool's answer – whether it worked, and either the result or an error message.
    *   **Developer Notes:** Interface defining the object returned by `IToolExecutor.execute`. Properties:
        *   `status: 'success' | 'error'`: Must indicate the outcome.
        *   `output?: any`: Required if `status` is 'success'. Contains the result data. Aim for JSON-serializable data (strings, numbers, booleans, arrays, plain objects) so the LLM can easily understand and incorporate it into its response.
        *   `error?: string`: Required if `status` is 'error'. Provides a descriptive error message for logging and potentially for the LLM to understand the failure.

*   **`ExecutionContext`**
    Extra information passed to your tool when it runs, like which chat it's running for, useful for tracking or context-specific logic.
    *   **Developer Notes:** Interface for the context object passed as the second argument to `IToolExecutor.execute`. Provides runtime context. Properties:
        *   `threadId: string`: The ID of the conversation thread this execution belongs to.
        *   `traceId?: string`: The ID tracing the entire `ArtInstance.process` call, useful for correlating logs across multiple steps and tool calls within a single user request.
        *   May contain other properties passed down from the `AgentProps` or added by the `IAgentCore` implementation.

**4.2. Implementing the `CurrentInfoTool`**

```typescript
// src/tools/CurrentInfoTool.ts (or define within the component file for simplicity)

import { IToolExecutor, ToolSchema, ToolResult, ExecutionContext } from 'art-framework';

export class CurrentInfoTool implements IToolExecutor {
  readonly schema: ToolSchema = {
    name: "get_current_info",
    description: "Provides the current date, time, approximate user location (requires permission), and browser language/locale.",
    inputSchema: { // No specific input needed for this tool
      type: "object",
      properties: {},
    }
  };

  async execute(input: any, context: ExecutionContext): Promise<ToolResult> {
    console.log(`Executing CurrentInfoTool, Trace ID: ${context.traceId}`);
    try {
      const now = new Date();
      const dateTimeInfo = {
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        timezoneOffset: now.getTimezoneOffset(), // In minutes from UTC
        isoString: now.toISOString(),
      };

      let locationInfo: any = { status: 'permission_denied_or_unavailable' };
      try {
        // Use browser Geolocation API - Requires HTTPS and user permission
        if ('geolocation' in navigator) {
          locationInfo = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  status: 'success',
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy, // In meters
                });
              },
              (error) => {
                // Handle errors (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)
                resolve({ status: 'error', code: error.code, message: error.message });
              },
              { timeout: 5000 } // Set a timeout
            );
          });
        }
      } catch (geoError) {
         console.warn("Geolocation API error:", geoError);
         // Error already captured in the promise resolution
      }


      const localeInfo = {
        language: navigator.language, // e.g., "en-US"
        languages: navigator.languages, // Array of preferred languages
      };

      // Note: Getting local currency reliably client-side is complex.
      // We'll just include the locale as a hint.

      return {
        status: "success",
        output: {
          dateTime: dateTimeInfo,
          location: locationInfo,
          locale: localeInfo,
        }
      };
    } catch (error) {
      console.error("CurrentInfoTool Error:", error);
      return { status: "error", error: error instanceof Error ? error.message : "Unknown error fetching current info" };
    }
  }
}
```

**Explanation:**

1.  **Implement `IToolExecutor`:** The class declares it follows the tool contract.
2.  **Define `schema`:** Provides the name (`get_current_info`), description, and specifies no required input.
3.  **Implement `execute`:**
    *   Gets the current date/time using the `Date` object.
    *   Attempts to get the location using the browser's `navigator.geolocation` API. This is asynchronous and requires user permission (and usually HTTPS). It handles success and error cases gracefully.
    *   Gets browser language/locale using `navigator.language(s)`.
    *   Bundles all collected information into the `output` field of a successful `ToolResult`.
    *   Includes error handling for unexpected issues.

**4.3. Integrating the Tool into the Chatbot**

Modify the ART configuration within the `ArtChatbot` component's `useEffect` hook:

```typescript jsx
// Inside the useEffect hook in ArtChatbot.tsx

import { CurrentInfoTool } from './tools/CurrentInfoTool'; // Adjust path if needed

// ... inside initializeArt function ...
          const config = {
            storage: { /* ... */ },
            reasoning: { /* ... */ },
            agentCore: PESAgent,
            tools: [
                new CalculatorTool(),
                new CurrentInfoTool() // Add an instance of the new tool
            ]
          };

          const instance = await createArtInstance(config);
// ... rest of the initialization ...
```

**How it Works Now:**

*   **Node 1 (Developer Interface):** You've defined the `CurrentInfoTool` and told ART about it by adding `new CurrentInfoTool()` to the `tools` array in the configuration.
*   **Node 2 (Core Orchestration):** When the user asks something like "What time is it?" or "Where am I?", the `PESAgent` gathers the necessary `PromptContext` (including the user query, history, and available tools like `get_current_info`). It then uses the `PromptManager` with its planning blueprint and this context to create a standardized `ArtStandardPrompt`. This prompt is sent to the LLM via the `ReasoningEngine` (which handles streaming). The `OutputParser` then parses the LLM's response (from the stream) to identify the user's intent and any planned tool calls. If the LLM plans to use `get_current_info`, the `ToolSystem` finds your `CurrentInfoTool` in the `ToolRegistry` and calls its `execute` method. The results (date, time, location status, locale) are passed back to the `PESAgent`. The agent then gathers a new `PromptContext` (including the original query, plan, and tool results) and uses the `PromptManager` with its synthesis blueprint to create another `ArtStandardPrompt`. This is sent to the LLM via the `ReasoningEngine` (again, handling streaming), and the `OutputParser` extracts the final response from the stream.
*   **Node 3 (External Connections):** The `CurrentInfoTool` interacts with browser APIs (`Date`, `navigator.geolocation`, `navigator.language`). If geolocation permission is granted, it interacts with the device's location services. The `ProviderAdapter` used by the `ReasoningEngine` handles communication with the external LLM API, including processing streaming responses.