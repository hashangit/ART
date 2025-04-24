# Understanding the ART Framework

## 1. Introduction to ART

ART (Agent Reasoning & Tooling) is a browser-first JavaScript/TypeScript framework designed for developers building LLM-powered intelligent agents that run purely on the client-side. It eliminates the need for a mandatory server component for the core agent logic, enabling the creation of truly web-native AI applications.

**Core Goals:**

ART is built with the following principles in mind:

*   **Modular:** Composed of distinct, replaceable components (like storage, reasoning providers, tools).
*   **Flexible:** Allows developers to choose components, configure behavior, and extend functionality easily.
*   **Decoupled:** Components interact through well-defined interfaces, minimizing dependencies and promoting independent development and testing.
*   **Client-Side:** Designed to run entirely within the user's web browser, leveraging browser APIs like IndexedDB.

## 2. Conceptual Model: The 3 Nodes of ART

To understand how ART works and how developers interact with it, we can use a 3-node conceptual model:

```mermaid
graph LR
    A[Node 1: Developer Interface<br>(Config & Control)] --> B[Node 2: ART Core Orchestration<br>(Internal Engine)]
    B --> C[Node 3: External Dependencies<br>& Interactions]
    C --> B
```

*   **Node 1: Developer Interface (Configuration & Control)**
    *   **Role:** This is the primary interaction point for the developer. It's where you define *what* your agent should be made of and *how* it should behave at a high level.
    *   **Responsibilities:** Importing necessary ART components, configuring the agent instance (selecting adapters, tools, agent patterns), initializing the framework, and triggering the agent's processing cycle.
    *   **Key Elements:**
        *   `import { ... } from 'art-framework';`: Bringing ART components into your code.
        *   `AgentFactoryConfig`: The configuration object specifying storage, reasoning, tools, etc.
        *   `createArtInstance(config)`: The factory function that takes your config and builds the internal engine.
        *   `ArtInstance`: The resulting object representing the initialized framework.
        *   `art.process(props)`: The method you call to make the agent process a user query.

*   **Node 2: ART Core Orchestration (Internal Engine)**
    *   **Role:** This is the hidden machinery of ART, brought to life by `createArtInstance` based on your configuration. It handles the step-by-step execution of the agent's reasoning process.
    *   **Responsibilities:** Managing conversation history, loading/saving state and configuration, constructing prompts, parsing LLM outputs, orchestrating tool execution, recording internal events (observations), and implementing the chosen agent reasoning pattern (like Plan-Execute-Synthesize or ReAct).
    *   **Key Elements (Internal Components):**
        *   `IAgentCore` Implementation (e.g., `PESAgent`, `ReActAgent`): The specific reasoning pattern driver.
        *   Managers (`StateManager`, `ConversationManager`, `ObservationManager`): Handle specific data types and workflows.
        *   Systems (`ToolSystem`, `UISystem`): Orchestrate tool use and UI communication.
        *   Reasoning Components (`ReasoningEngine`, `PromptManager`, `OutputParser`): Handle LLM interaction logic.
        *   Repositories (`IConversationRepository`, etc.): Abstract data access using the storage adapter.
    *   **Developer Interaction:** Generally minimal after initialization, unless implementing an *Advanced* usage pattern (custom `IAgentCore`).

*   **Node 3: External Dependencies & Interactions (The Outside World)**
    *   **Role:** This node represents where the ART engine connects to resources outside its core orchestration logic. These are the pluggable pieces configured in Node 1.
    *   **Responsibilities:** Making actual API calls to LLMs, executing tool logic (which might involve calling other APIs or running specific code), and persisting/retrieving data from the chosen storage mechanism.
    *   **Key Elements (Interfaces & Implementations):**
        *   `ProviderAdapter` Implementations (e.g., `OpenAIAdapter`): Handle communication with specific LLM APIs.
        *   `IToolExecutor` Implementations (e.g., `CalculatorTool`, custom tools): Contain the actual logic for each tool.
        *   `StorageAdapter` Implementations (e.g., `IndexedDBStorageAdapter`): Handle interaction with the browser's storage.

## 3. Usage Complexity Levels

Developers can engage with ART at different levels of complexity, depending on their needs:

*   **Level 1: Simple Usage (Using Built-ins)**
    *   **Focus:** Configuration.
    *   **Activities:** Select from ART's pre-built adapters (storage, reasoning), use the default agent pattern (`PESAgent`), and potentially include built-in tools. Initialize via `createArtInstance` and use `art.process()`.
    *   **Goal:** Quickly set up a functional agent using standard components.

*   **Level 2: Intermediate Usage (Extending with Custom Tools/Adapters)**
    *   **Focus:** Extension & Integration.
    *   **Activities:** Includes Simple Usage activities, PLUS implementing custom `IToolExecutor` interfaces to add specific capabilities (e.g., interacting with your backend, using specific libraries) or custom `ProviderAdapter`/`StorageAdapter` interfaces for unsupported services/storage.
    *   **Goal:** Tailor the agent's capabilities and integrations while leveraging the core framework's orchestration.

*   **Level 3: Advanced Usage (Implementing Custom Agent Patterns)**
    *   **Focus:** Core Logic Customization.
    *   **Activities:** Includes Intermediate Usage activities, PLUS implementing a custom `IAgentCore` interface. This involves defining a completely new reasoning loop or modifying an existing one significantly. Requires a deep understanding of how all internal ART components interact.
    *   **Goal:** Gain maximum control over the agent's behavior and reasoning process.

## 4. ART in Action: The Website Chatbot Use Case

Let's illustrate these concepts using the example of building a simple AI chatbot component for a website.

*   **Simple Usage Scenario:**
    *   **Node 1: Developer Interface:**
        *   **What:** Configure ART to use IndexedDB for storage, an OpenAI model for reasoning, the default `PESAgent`, and no extra tools.
        *   **How (Example):**
            ```typescript
            import { createArtInstance, IndexedDBStorageAdapter, OpenAIAdapter } from 'art-framework';

            const config = {
              storage: { type: 'indexedDB', dbName: 'simpleChatDB' },
              reasoning: { provider: 'openai', apiKey: 'YOUR_API_KEY', model: 'gpt-4o' }
              // agentCore defaults to PESAgent
              // tools defaults to empty array
            };
            const art = await createArtInstance(config);

            // Later, on user input:
            // const response = await art.process({ query: userInput, threadId: 'chat1' });
            ```
    *   **Node 2: Core Orchestration:** When `art.process()` is called, the internal `PESAgent` executes its Plan-Execute-Synthesize cycle: loads context/history, gets enabled tools (none in this case), creates a planning prompt, calls the LLM via the `ReasoningEngine` (using `OpenAIAdapter`), parses the plan (likely no tools needed), creates a synthesis prompt, calls the LLM again, parses the final response, saves history, and returns the result.
    *   **Node 3: External Dependencies:** The `OpenAIAdapter` makes API calls to OpenAI. The `IndexedDBStorageAdapter` reads/writes conversation history and state to the browser's IndexedDB.

*   **Intermediate Usage Scenario (Adding a Weather Tool):**
    *   **Node 1: Developer Interface:**
        *   **What:** Define a `WeatherTool` class implementing `IToolExecutor`. Add an instance of this tool to the `tools` array in the configuration.
        *   **How (Example):**
            ```typescript
            import { createArtInstance, IndexedDBStorageAdapter, OpenAIAdapter, IToolExecutor, ToolSchema, ToolResult, ExecutionContext } from 'art-framework';

            // Define the custom tool
            class WeatherTool implements IToolExecutor {
              readonly schema: ToolSchema = {
                name: "get_weather",
                description: "Fetches the current weather for a specified location.",
                inputSchema: {
                  type: "object",
                  properties: { location: { type: "string", description: "City name (e.g., 'London')" } },
                  required: ["location"]
                }
              };

              async execute(input: { location: string }, context: ExecutionContext): Promise<ToolResult> {
                try {
                  // In a real scenario, fetch from a weather API
                  console.log(`TOOL: Fetching weather for ${input.location} (Trace: ${context.traceId})`);
                  // const response = await fetch(`https://api.weatherapi.com/...?q=${input.location}`);
                  // const data = await response.json();
                  // Simulate API call
                  await new Promise(resolve => setTimeout(resolve, 500));
                  const weatherData = { temp: Math.random() * 30, condition: "Sunny" }; // Dummy data
                  return { status: "success", output: weatherData };
                } catch (error) {
                  return { status: "error", error: error instanceof Error ? error.message : "Failed to fetch weather" };
                }
              }
            }

            // Configure ART, including the custom tool
            const config = {
              storage: { type: 'indexedDB', dbName: 'weatherChatDB' },
              reasoning: { provider: 'openai', apiKey: 'YOUR_API_KEY', model: 'gpt-4o' },
              tools: [new WeatherTool()] // Add the tool instance
            };
            const art = await createArtInstance(config);

            // Later, on user input like "What's the weather in Paris?":
            // const response = await art.process({ query: userInput, threadId: 'chat2' });
            ```
    *   **Node 2: Core Orchestration:** The flow is similar to the Simple scenario, but during the planning phase, the LLM might identify the need for the `get_weather` tool. The `OutputParser` extracts the tool call (`{ toolName: 'get_weather', args: { location: 'Paris' } }`). The `ToolSystem` retrieves the `WeatherTool` instance from the `ToolRegistry` and calls its `execute` method. The result is then included in the synthesis prompt.
    *   **Node 3: External Dependencies:** In addition to LLM and storage interactions, the `WeatherTool.execute` method now interacts with an external dependency (the weather API, simulated here).

*   **Advanced Usage Scenario (Implementing a ReAct Agent):**
    *   **Node 1: Developer Interface:**
        *   **What:** Define a `ReActAgent` class implementing `IAgentCore`. Pass this class constructor to the `agentCore` property in the configuration.
        *   **How (Example):**
            ```typescript
            import {
              createArtInstance, IndexedDBStorageAdapter, OpenAIAdapter, WeatherTool, // Assuming WeatherTool is defined
              IAgentCore, AgentProps, AgentFinalResponse, // Core interfaces
              StateManager, ConversationManager, ToolRegistry, PromptManager, // Dependencies
              ReasoningEngine, OutputParser, ObservationManager, ToolSystem
            } from 'art-framework';

            // Define the custom agent (Simplified Skeleton)
            class ReActAgent implements IAgentCore {
              // Dependencies injected by the factory
              constructor(private deps: {
                stateManager: StateManager;
                conversationManager: ConversationManager;
                toolRegistry: ToolRegistry;
                promptManager: PromptManager; // Might need custom prompt logic for ReAct
                reasoningEngine: ReasoningEngine;
                outputParser: OutputParser; // Might need custom parsing for Thought/Action
                observationManager: ObservationManager;
                toolSystem: ToolSystem;
              }) {}

              async process(props: AgentProps): Promise<AgentFinalResponse> {
                const { query, threadId, traceId } = props;
                console.log(`REACT AGENT: Processing query "${query}" for thread ${threadId}`);
                // --- Load Context/History (Similar to PES) ---
                const context = await this.deps.stateManager.loadThreadContext(threadId);
                const history = await this.deps.conversationManager.getMessages(threadId);
                const tools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: threadId });

                let finalResponseText = "Default ReAct Response (Not Implemented)";
                let step = 0;
                const maxSteps = 5; // Limit loops

                // --- ReAct Loop (Thought -> Action -> Observation -> Thought...) ---
                while (step < maxSteps) {
                   step++;
                   console.log(`REACT AGENT: Step ${step}`);
                   // 1. Create Thought/Action Prompt (Needs custom PromptManager logic)
                   // const prompt = await this.deps.promptManager.createReActPrompt(...);

                   // 2. Call LLM for Thought/Action
                   // const llmResponse = await this.deps.reasoningEngine.call(prompt, ...);

                   // 3. Parse Thought/Action (Needs custom OutputParser logic)
                   // const { thought, action, actionInput, isFinalAnswer } = await this.deps.outputParser.parseReActOutput(llmResponse);
                   const isFinalAnswer = step === 3; // Dummy logic
                   const action = step === 1 ? 'get_weather' : undefined; // Dummy logic
                   const actionInput = step === 1 ? { location: 'Tokyo' } : undefined; // Dummy logic

                   // Record thought observation
                   // await this.deps.observationManager.record({ type: 'thought', content: thought, ... });

                   if (isFinalAnswer) {
                       // finalResponseText = actionInput; // Extract final answer from LLM output
                       finalResponseText = `ReAct determined the final answer after ${step} steps.`; // Dummy
                       break; // Exit loop
                   }

                   if (action && actionInput) {
                       // 4. Execute Action (Tool)
                       // await this.deps.observationManager.record({ type: 'action', content: { action, actionInput }, ... });
                       // const toolResults = await this.deps.toolSystem.executeTools([{ toolName: action, args: actionInput }], threadId);
                       // const observationResult = toolResults[0]; // Get result

                       // 5. Record Observation
                       // await this.deps.observationManager.record({ type: 'observation', content: observationResult, ... });

                       // Add observation result to context/history for next loop iteration
                   } else {
                       // Handle cases where no action is needed or parsing failed
                       break;
                   }
                }
                // --- End ReAct Loop ---

                // --- Save History/State (Similar to PES) ---
                // await this.deps.conversationManager.addMessages(...);
                // await this.deps.stateManager.saveStateIfModified(...);

                // --- Return Final Response ---
                return {
                  responseId: `react-resp-${Date.now()}`,
                  responseText: finalResponseText,
                  traceId: traceId || 'react-trace-' + Date.now(),
                  // Add other relevant metadata
                };
              }
            }

            // Configure ART to use the custom ReAct agent
            const config = {
              storage: { type: 'indexedDB', dbName: 'reactChatDB' },
              reasoning: { provider: 'openai', apiKey: 'YOUR_API_KEY', model: 'gpt-4o' },
              agentCore: ReActAgent, // Use the custom agent
              tools: [new WeatherTool()] // Include tools it might use
            };
            const art = await createArtInstance(config);

            // Later, on user input:
            // const response = await art.process({ query: userInput, threadId: 'chat3' });
            ```
    *   **Node 2: Core Orchestration:** When `art.process()` is called, it now invokes *your* `ReActAgent.process()` method. Your custom logic drives the interaction loop (Thought -> Action -> Observation), calling upon the injected dependencies (`ReasoningEngine`, `ToolSystem`, `StateManager`, etc.) as needed within the loop. The internal flow is dictated by your implementation, not the default PES pattern.
    *   **Node 3: External Dependencies:** Interactions still occur via the configured adapters and tools, but *when* and *how* they are called is determined by your `ReActAgent`'s logic.

## 5. Detailed Internal Workflow: `art.process()` with PESAgent

When you call `art.process()` using the default Plan-Execute-Synthesize (PES) agent, a sequence of steps occurs internally to understand your request, potentially use tools, and generate a response. Here’s a breakdown, with both technical details and simpler explanations:

1.  **Call Received:** `PESAgent.process(props)` starts.
    *   *In simple terms:* The agent receives your query and gets ready to work.
2.  **Record Start:** Log `PROCESS_START` observation.
    *   *In simple terms:* The agent makes a note that it has started processing a new request. This helps track what's happening internally.
3.  **Load Context:** Fetch `ThreadConfig` and `AgentState` via `StateManager`.
    *   *In simple terms:* The agent retrieves any specific settings for this conversation (like which AI model to use) and any memory it has about the current state of the conversation.
4.  **Load History:** Fetch recent `ConversationMessage`s via `ConversationManager`.
    *   *In simple terms:* The agent looks up the recent messages exchanged in this specific chat thread to understand the context.
5.  **Get Available Tools:** Fetch enabled `ToolSchema`s via `ToolRegistry` (using `StateManager` to check permissions).
    *   *In simple terms:* The agent checks which tools (like a calculator or weather lookup) it's allowed to use in this conversation.
6.  **Create Planning Prompt:** Use `PromptManager` to combine query, history, system prompt (from `ThreadConfig`), and tool schemas into a prompt asking the LLM to plan and identify tool calls.
    *   *In simple terms:* The agent prepares instructions for the AI brain (the LLM). It includes your query, the chat history, its available tools, and asks the AI to figure out a plan to answer your query, including whether any tools are needed.
7.  **Execute Planning LLM Call:** Log `LLM_REQUEST`, call `ReasoningEngine.call()` (which uses the configured `ProviderAdapter`), log `LLM_RESPONSE`.
    *   *In simple terms:* The agent sends the planning instructions to the AI brain (e.g., OpenAI's GPT-4). It notes down that it sent the request and when it gets the response back.
8.  **Parse Planning Output:** Use `OutputParser` to extract intent, plan description, and `ParsedToolCall[]` from the LLM response.
    *   *In simple terms:* The agent reads the AI's response and tries to understand the plan it came up with, specifically looking for which tools (if any) the AI wants to use and what information to give them.
9.  **Record Plan:** Log `PLANNING_OUTPUT` observation.
    *   *In simple terms:* The agent notes down the plan it received from the AI.
10. **Execute Tools (if `ParsedToolCall[]` is not empty):**
    *   Call `ToolSystem.executeTools()`.
    *   `ToolSystem` iterates through calls: validates tool enablement (`StateManager`), gets executor (`ToolRegistry`), validates args, logs `TOOL_START`, calls `executor.execute()`, logs `TOOL_END` with result/error.
    *   Log `TOOL_EXECUTION_COMPLETE` observation.
    *   *In simple terms:* If the plan requires using tools, the agent now runs them one by one. For each tool, it checks if it's allowed, gets the tool ready, gives it the necessary information (e.g., the city for the weather tool), runs the tool, and records the result (or any errors).
11. **Create Synthesis Prompt:** Use `PromptManager` to combine original query, plan, tool results, history, and system prompt into a prompt asking the LLM for the final user response.
    *   *In simple terms:* The agent gathers everything – your original query, the AI's plan, the results from any tools used, and the chat history – and prepares new instructions for the AI brain. This time, it asks the AI to write the final answer you will see.
12. **Execute Synthesis LLM Call:** Log `LLM_REQUEST`, call `ReasoningEngine.call()`, log `LLM_RESPONSE`.
    *   *In simple terms:* The agent sends these final instructions to the AI brain.
13. **Parse Synthesis Output:** Use `OutputParser` to extract the final `responseText`.
    *   *In simple terms:* The agent reads the AI's response and extracts the actual chat message to send back to you.
14. **Record Synthesis:** Log `SYNTHESIS_OUTPUT` observation.
    *   *In simple terms:* The agent notes down the final answer it generated.
15. **Save History:** Persist user query and AI response via `ConversationManager`.
    *   *In simple terms:* The agent saves your query and its final response to the chat history so they can be remembered for later.
16. **Save State:** Persist any changes to `AgentState` via `StateManager`.
    *   *In simple terms:* If the agent learned something or changed its internal state during the process, it saves that information.
17. **Record End:** Log `PROCESS_END` observation.
    *   *In simple terms:* The agent notes down that it has finished processing your request.
18. **Return Result:** Return `AgentFinalResponse` object.
    *   *In simple terms:* The agent sends the final response back to the part of the application that called it (e.g., the chatbot UI).

## 6. Practical Examples

*   **Example 1: Simple Chatbot Setup**
    ```typescript
    import { createArtInstance, IndexedDBStorageAdapter, OpenAIAdapter, ArtInstance, AgentProps } from 'art-framework';

    async function setupSimpleChat(): Promise<ArtInstance> {
      const config = {
        storage: {
          type: 'indexedDB',
          dbName: 'mySimpleChatHistory'
        },
        reasoning: {
          provider: 'openai',
          apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'YOUR_API_KEY', // Handle securely!
          model: 'gpt-4o'
        }
        // Uses default PESAgent, no tools
      };

      try {
        console.log("Initializing Simple ART Chat...");
        const art = await createArtInstance(config);
        console.log("Simple ART Chat Initialized.");
        return art;
      } catch (error) {
        console.error("Failed to initialize Simple ART Chat:", error);
        throw error;
      }
    }

    // Usage:
    // const myArtInstance = await setupSimpleChat();
    // const props: AgentProps = { query: "Hello ART!", threadId: "user123-main" };
    // const response = await myArtInstance.process(props);
    // console.log("AI Response:", response.responseText);
    ```

*   **Example 2: Creating and Using a Custom Weather Tool**
    ```typescript
    import {
      createArtInstance, IndexedDBStorageAdapter, OpenAIAdapter, ArtInstance, AgentProps,
      IToolExecutor, ToolSchema, ToolResult, ExecutionContext // Tool interfaces
    } from 'art-framework';

    // --- Weather Tool Implementation ---
    class WeatherTool implements IToolExecutor {
      readonly schema: ToolSchema = {
        name: "get_current_weather",
        description: "Fetches the current weather for a given city.",
        inputSchema: {
          type: "object",
          properties: {
            location: { type: "string", description: "The city name, e.g., San Francisco" }
          },
          required: ["location"]
        }
      };

      async execute(input: { location: string }, context: ExecutionContext): Promise<ToolResult> {
        console.log(`Executing WeatherTool for: ${input.location}, Trace ID: ${context.traceId}`);
        // Replace with actual API call
        const apiKey = 'YOUR_WEATHER_API_KEY'; // Handle securely
        // const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(input.location)}`;
        try {
          // const response = await fetch(url);
          // if (!response.ok) throw new Error(`Weather API error: ${response.statusText}`);
          // const data = await response.json();
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 600));
          const dummyData = { temp_c: 25, condition: { text: "Partly cloudy" } }; // Dummy data

          return { status: "success", output: dummyData }; // Return relevant data
        } catch (error) {
          console.error("WeatherTool Error:", error);
          return { status: "error", error: error instanceof Error ? error.message : "Unknown weather tool error" };
        }
      }
    }
    // --- End Weather Tool ---

    async function setupWeatherChat(): Promise<ArtInstance> {
      const config = {
        storage: { type: 'indexedDB', dbName: 'myWeatherChatHistory' },
        reasoning: {
          provider: 'openai',
          apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'YOUR_API_KEY',
          model: 'gpt-4o' // Use a model good at tool use
        },
        tools: [new WeatherTool()] // Register the custom tool
      };

      try {
        console.log("Initializing ART Chat with Weather Tool...");
        const art = await createArtInstance(config);
        console.log("ART Chat with Weather Tool Initialized.");
        return art;
      } catch (error) {
        console.error("Failed to initialize ART Chat with Weather Tool:", error);
        throw error;
      }
    }

    // Usage:
    // const myWeatherArtInstance = await setupWeatherChat();
    // const props: AgentProps = { query: "What's the weather like in London?", threadId: "user123-weather" };
    // const response = await myWeatherArtInstance.process(props);
    // console.log("AI Response:", response.responseText); // LLM should incorporate weather tool output
    ```

*   **Example 3: Creating a Custom ReAct Agent Pattern (Skeleton)**
    ```typescript
    import {
      createArtInstance, IndexedDBStorageAdapter, OpenAIAdapter, WeatherTool, // Base components
      IAgentCore, AgentProps, AgentFinalResponse, // Core interfaces
      StateManager, ConversationManager, ToolRegistry, PromptManager, // Dependencies
      ReasoningEngine, OutputParser, ObservationManager, ToolSystem, ArtInstance
    } from 'art-framework';

    // --- ReAct Agent Implementation (Skeleton) ---
    class ReActAgent implements IAgentCore {
      constructor(private deps: { /* Injected dependencies */
        stateManager: StateManager; conversationManager: ConversationManager; toolRegistry: ToolRegistry;
        promptManager: PromptManager; reasoningEngine: ReasoningEngine; outputParser: OutputParser;
        observationManager: ObservationManager; toolSystem: ToolSystem;
      }) {
        // TODO: Potentially initialize custom ReAct prompt templates or parsers here
      }

      async process(props: AgentProps): Promise<AgentFinalResponse> {
        const { query, threadId, traceId } = props;
        await this.deps.observationManager.record({ type: 'PROCESS_START', threadId, traceId, content: { agentType: 'ReAct', query } });

        // 1. Load context, history, tools (similar to PES)
        const context = await this.deps.stateManager.loadThreadContext(threadId);
        let currentHistory = await this.deps.conversationManager.getMessages(threadId);
        const tools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: threadId });

        let thought = "";
        let action = "";
        let actionInput: any = null;
        let observation = "";
        let step = 0;
        const maxSteps = 5; // Prevent infinite loops

        while (step < maxSteps) {
          step++;
          await this.deps.observationManager.record({ type: 'REACT_STEP', threadId, traceId, content: { step } });

          // 2. Generate Thought & Action Prompt (Requires custom PromptManager logic)
          // const reactPrompt = await this.deps.promptManager.createReActPrompt(query, currentHistory, tools, thought, action, observation);
          const reactPrompt = `Previous Thought: ${thought}\nPrevious Action: ${action}\nObservation: ${observation}\nTools: ${JSON.stringify(tools)}\nHistory: ${JSON.stringify(currentHistory)}\nQuery: ${query}\nThink step-by-step. What is your thought and next action (Action: [tool_name], Action Input: {json}) or final answer (Final Answer: [answer])?`; // Simplified

          // 3. Call LLM
          await this.deps.observationManager.record({ type: 'LLM_REQUEST', threadId, traceId, content: { phase: `react_step_${step}` } });
          const llmResponse = await this.deps.reasoningEngine.call(reactPrompt, { threadId, traceId });
          await this.deps.observationManager.record({ type: 'LLM_RESPONSE', threadId, traceId, content: { phase: `react_step_${step}`, response: llmResponse } });

          // 4. Parse Thought, Action, Final Answer (Requires custom OutputParser logic)
          // const parsed = await this.deps.outputParser.parseReActOutput(llmResponse);
          // Dummy Parsing:
          const thoughtMatch = llmResponse.match(/Thought: (.*)/);
          const actionMatch = llmResponse.match(/Action: (\w+)/);
          const inputMatch = llmResponse.match(/Action Input: ({.*})/);
          const finalAnswerMatch = llmResponse.match(/Final Answer: (.*)/);

          thought = thoughtMatch ? thoughtMatch[1].trim() : "No thought found.";
          await this.deps.observationManager.record({ type: 'thought', threadId, traceId, content: thought });

          if (finalAnswerMatch) {
            const finalAnswer = finalAnswerMatch[1].trim();
            await this.deps.observationManager.record({ type: 'PROCESS_END', threadId, traceId, content: { status: 'success', finalAnswer } });
            // TODO: Save history with final answer
            return { responseId: `react-final-${Date.now()}`, responseText: finalAnswer, traceId };
          }

          action = actionMatch ? actionMatch[1].trim() : "";
          try {
            actionInput = inputMatch ? JSON.parse(inputMatch[1].trim()) : null;
          } catch (e) { actionInput = null; /* Handle JSON parse error */ }

          if (action && actionInput) {
            await this.deps.observationManager.record({ type: 'action', threadId, traceId, content: { action, actionInput } });
            // 5. Execute Action (Tool)
            const toolResults = await this.deps.toolSystem.executeTools([{ toolName: action, args: actionInput }], threadId, traceId);
            const result = toolResults[0];
            observation = JSON.stringify(result.status === 'success' ? result.output : { error: result.error });
            await this.deps.observationManager.record({ type: 'observation', threadId, traceId, content: observation });
            // TODO: Add tool result message to currentHistory for next loop
          } else {
            observation = "No valid action found or action completed."; // Or error message
            // Potentially break or try again depending on strategy
            break;
          }
        } // End while loop

        const finalResponseText = "Reached max steps without a final answer.";
        await this.deps.observationManager.record({ type: 'PROCESS_END', threadId, traceId, content: { status: 'max_steps_reached' } });
        // TODO: Save history
        return { responseId: `react-maxstep-${Date.now()}`, responseText: finalResponseText, traceId };
      }
    }
    // --- End ReAct Agent ---

    async function setupReActChat(): Promise<ArtInstance> {
      const config = {
        storage: { type: 'indexedDB', dbName: 'myReActChatHistory' },
        reasoning: {
          provider: 'openai',
          apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'YOUR_API_KEY',
          model: 'gpt-4o' // Model needs to be good at following ReAct format
        },
        agentCore: ReActAgent, // Use the custom agent
        tools: [new WeatherTool()] // Provide tools the agent might use
        // TODO: Might need custom PromptManager/OutputParser implementations passed via config if factory supports it
      };

      try {
        console.log("Initializing ART Chat with ReAct Agent...");
        const art = await createArtInstance(config);
        console.log("ART Chat with ReAct Agent Initialized.");
        return art;
      } catch (error) {
        console.error("Failed to initialize ART Chat with ReAct Agent:", error);
        throw error;
      }
    }

    // Usage:
    // const myReActArtInstance = await setupReActChat();
    // const props: AgentProps = { query: "What city has warmer weather today, London or Tokyo?", threadId: "user123-react" };
    // const response = await myReActArtInstance.process(props);
    // console.log("AI Response:", response.responseText);
    ```

## 7. Conclusion

The ART framework provides a powerful and flexible foundation for building sophisticated AI agents directly within the web browser. By understanding its core concepts, the 3-node model, and the different usage levels, developers can choose the right approach for their needs – from quickly assembling agents using built-in components to deeply customizing the core reasoning logic. Its emphasis on modularity and client-side execution makes it a compelling choice for creating modern, web-native AI experiences.