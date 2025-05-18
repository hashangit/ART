## 7. Scenario 5: Adding a Custom Agent Pattern (Advanced Usage)

*(This section was previously Section 5, now renumbered)*

Let's implement the ReAct (Reason -> Act -> Observe) agent pattern and allow the user to switch between PES and ReAct in the chatbot UI.

**Goal:** Create a `ReActAgent` class, integrate it, and add UI controls for switching.

**7.1. Necessary Imports & Explanations**

*(Content remains the same as previous Section 5.1, just renumbered)*

In addition to imports from previous scenarios, you need these for creating a custom agent core:

```typescript
// --- ART Agent Core Creation Imports ---
import {
  // The interface that a custom agent core must implement
  IAgentCore,
  // (Already imported) Input properties for the process method
  // AgentProps,
  // (Already imported) Output type for the process method
  // AgentFinalResponse,

  // --- Interfaces for Dependencies Injected into the Agent Core ---
  // These define the components your custom agent will use internally
  StateManager,
  ConversationManager,
  ToolRegistry,
  PromptManager, // You'll likely need custom prompt logic for ReAct
  ReasoningEngine,
  OutputParser, // You'll likely need custom parsing logic for ReAct
  ObservationManager,
  ToolSystem,
  UISystem, // Include UISystem for streaming
  // (Already imported) Needed types like ToolSchema, ParsedToolCall, ToolResult etc.
} from 'art-framework';
```

**Explanation of Agent Core Imports:**

*   **`IAgentCore`**
    The main blueprint for creating a new "thinking style" or reasoning process for the agent. If you want the agent to think differently than the default "Plan -> Use Tools -> Answer" style, you implement this.
    *   **Developer Notes:** The core interface for custom agent logic. Your class must implement `IAgentCore`. Key requirements:
        *   Implement `async process(props: AgentProps): Promise<AgentFinalResponse>`: This method *is* your agent's brain. It receives the `AgentProps` (query, threadId, etc.) and must orchestrate all steps (loading data, calling LLMs, calling tools, saving data, handling streaming responses) according to your custom logic (e.g., a ReAct loop, or something else entirely) and return the final `AgentFinalResponse` object (containing the `response: ConversationMessage` and `metadata: ExecutionMetadata`).
        *   Define a `constructor` that accepts a single argument: an object containing instances of the necessary ART subsystems (dependencies) defined by the interfaces below (e.g., `constructor(private deps: { stateManager: StateManager, reasoningEngine: ReasoningEngine, uiSystem: UISystem, ... })`). The `AgentFactory` will automatically provide (inject) these dependencies when it instantiates your custom agent core based on the `config.agentCore` setting.

*   **Dependency Interfaces (`StateManager`, `ConversationManager`, `ToolRegistry`, `PromptManager`, `ReasoningEngine`, `OutputParser`, `ObservationManager`, `ToolSystem`, `UISystem`)**
    These are the built-in helpers and managers that ART gives to your custom agent brain so it doesn't have to reinvent everything (like how to talk to the LLM, use tools, remember history, log events, or broadcast UI updates). Your custom `process` method will use these helpers.
    *   **Developer Notes:** These interfaces define the contracts for the core ART subsystems injected into your `IAgentCore` constructor. You'll use their methods within your `process` implementation:
        *   `StateManager`: Manages `ThreadConfig` and `AgentState`. Its behavior for `AgentState` persistence depends on the `stateSavingStrategy` ('explicit' or 'implicit') set during `ArtInstance` creation.
            *   `.loadThreadContext(threadId)`: Loads `ThreadContext`. In 'implicit' mode, `StateManager` caches this context and a snapshot of `AgentState` for later comparison by `saveStateIfModified`.
            *   `.setAgentState(threadId, state)`: Explicitly saves `AgentState`. In 'implicit' mode, this also updates the internal cache and snapshot. This is the **recommended method for saving `AgentState` in both modes**, especially for initial state or critical updates.
            *   `.saveStateIfModified(threadId)`:
                *   In **'explicit' mode (default)**: This is a **no-op** for `AgentState` persistence. It logs a warning.
                *   In **'implicit' mode**: Compares the current (potentially mutated) `AgentState` in the cached `ThreadContext` with the initial snapshot. If different, it saves the state to the repository and updates the snapshot.
            *   `.isToolEnabled(threadId, toolName)`: Checks tool permissions.
            *   `.setThreadConfig(threadId, config)`: Sets/updates `ThreadConfig`. Typically called by the application for new threads.
        *   `ConversationManager`: Use `.getMessages(threadId, options)` to retrieve history. Use `.addMessages(threadId, messages)` to save new user/assistant messages.
        *   `ToolRegistry`: Use `.getAvailableTools({ enabledForThreadId })` to get `ToolSchema[]` for prompting the LLM. Use `.getToolExecutor(toolName)` if needed (though `ToolSystem` is usually preferred).
        *   `PromptManager`: Provides reusable text fragments and validation. Use `.getFragment(name, context)` to retrieve instruction blocks. Use `.validatePrompt(promptObject)` to ensure the `ArtStandardPrompt` object constructed by your agent logic is valid before sending it to the `ReasoningEngine`.
        *   `ReasoningEngine`: Use `.call(prompt, callOptions)` to interact with the LLM, passing the *validated* `ArtStandardPrompt` object. The `callOptions` object (type `CallOptions`) must include the `RuntimeProviderConfig` (specifying provider name, model, API key, etc.) along with other parameters like `stream`, `threadId`, `traceId`. The `ReasoningEngine` uses this config to get the correct adapter instance from the `ProviderManager`. The method returns a `Promise<AsyncIterable<StreamEvent>>`, which your agent must consume.
        *   `OutputParser`: Use `.parsePlanningOutput(...)`, `.parseSynthesisOutput(...)` (for PES-like flows) or potentially define/use custom methods to extract structured data (like thoughts, actions, final answers) from the LLM's raw response content (assembled from the stream).
        *   `ObservationManager`: Use `.record(observationData)` frequently within your `process` logic to log key steps (start/end, LLM calls, tool calls, custom steps like 'thought' or 'action', and new `LLM_STREAM_...` events) for debugging and UI feedback via sockets.
        *   `ToolSystem`: Use `.executeTools(parsedToolCalls, threadId, traceId)` to run one or more tools identified by your agent's logic. It handles retrieving the executor, validating input against the schema, calling `execute`, and returning `ToolResult[]`.
        *   `UISystem`: Use `.getLLMStreamSocket()` to access the socket for broadcasting real-time `StreamEvent`s to the UI.

**7.2. Implementing the `ReActAgent` (Skeleton)**

*(Content remains the same as previous Section 5.2, just renumbered)*

This requires defining the ReAct loop logic within the `process` method.

```typescript
// src/agents/ReActAgent.ts (or define within the component file)

import {
  IAgentCore, AgentProps, AgentFinalResponse, StateManager, ConversationManager, ToolRegistry,
  PromptManager, ReasoningEngine, OutputParser, ObservationManager, ToolSystem,
  ObservationType, ConversationMessage, MessageRole, ToolSchema, ParsedToolCall, ToolResult
} from 'art-framework';

// Define a structure for the parsed ReAct step output
interface ReActStepOutput {
  thought: string;
  action?: string; // Tool name
  actionInput?: any; // Arguments for the tool
  finalAnswer?: string; // Final answer if found
  rawLLMOutput: string;
}

export class ReActAgent implements IAgentCore {
  // Store injected dependencies
  constructor(private deps: {
    stateManager: StateManager;
    conversationManager: ConversationManager;
    toolRegistry: ToolRegistry;
    promptManager: PromptManager; // Consider if custom ReAct prompts are needed
    reasoningEngine: ReasoningEngine;
    outputParser: OutputParser; // Consider if custom ReAct parsing is needed
    observationManager: ObservationManager;
    toolSystem: ToolSystem;
  }) {}

  // --- Custom Parsing Logic (Example) ---
  // In a real implementation, this might be more robust or part of a custom OutputParser
  private parseReActOutput(llmOutput: string): ReActStepOutput {
    const thoughtMatch = llmOutput.match(/Thought:([\s\S]*?)(Action:|Final Answer:|$)/);
    const actionMatch = llmOutput.match(/Action: (\w+)/);
    const inputMatch = llmOutput.match(/Action Input: ({[\s\S]*?}|[\s\S]*?)(Thought:|Observation:|$)/); // Try JSON first, then raw string
    const finalAnswerMatch = llmOutput.match(/Final Answer: ([\s\S]*)/);

    let actionInput: any = null;
    if (inputMatch) {
        try {
            // Try parsing as JSON first
            actionInput = JSON.parse(inputMatch[1].trim());
        } catch (e) {
            // Fallback to raw string if JSON parsing fails
            actionInput = inputMatch[1].trim();
        }
    }


    return {
      thought: thoughtMatch ? thoughtMatch[1].trim() : "Could not parse thought.",
      action: actionMatch ? actionMatch[1].trim() : undefined,
      actionInput: actionInput,
      finalAnswer: finalAnswerMatch ? finalAnswerMatch[1].trim() : undefined,
      rawLLMOutput: llmOutput
    };
  }

  // --- Custom Prompt Construction Logic (Example) ---
  // Ideally, this logic would construct an ArtStandardPrompt *object* directly,
  // potentially using promptManager.getFragment() for instruction blocks.
  // This example simplifies by creating a single string, but demonstrates the
  // agent's responsibility for assembling the prompt content.
  private createReActPromptString( // Renamed for clarity
    query: string,
    history: ConversationMessage[],
    tools: ToolSchema[],
    previousSteps: { thought: string; action?: string; actionInput?: any; observation: string }[]
  ): string {
    let prompt = `You are a helpful assistant that thinks step-by-step using the ReAct framework.\n`;
    prompt += `Available Tools: ${JSON.stringify(tools.map(t => ({ name: t.name, description: t.description, args: t.inputSchema })))}.\n`;
    prompt += `Conversation History:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}\n`;
    prompt += `User Query: ${query}\n\n`;
    prompt += `ReAct Scratchpad:\n`;
    previousSteps.forEach((step, index) => {
      prompt += `Thought ${index + 1}: ${step.thought}\n`;
      if (step.action) {
        prompt += `Action ${index + 1}: ${step.action}\nAction Input ${index + 1}: ${JSON.stringify(step.actionInput)}\nObservation ${index + 1}: ${step.observation}\n`;
      }
    });
    // In a full ArtStandardPrompt object approach, the final thought/action/input structure
    // would be added as the last message(s) in the array.
    prompt += `Thought: [Your current reasoning step]\nAction: [tool_name or Final Answer:]\nAction Input: [Arguments as JSON object if using a tool, otherwise the final answer content]\n`;
    return prompt;
  }


  async process(props: AgentProps): Promise<AgentFinalResponse> { // Returns { response: ConversationMessage, metadata: ExecutionMetadata }
    const { query, threadId, traceId = `react-trace-${Date.now()}` } = props;
    await this.deps.observationManager.record({ type: ObservationType.PROCESS_START, threadId, traceId, content: { agentType: 'ReAct', query } });

    // 1. Load context, history, tools
    const context = await this.deps.stateManager.loadThreadContext(threadId);
    const initialHistory = await this.deps.conversationManager.getMessages(threadId);
    const tools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: threadId });

    const reactSteps: { thought: string; action?: string; actionInput?: any; observation: string }[] = [];
    let step = 0;
    const maxSteps = 7; // Limit loops
    let aggregatedMetadata: any = {}; // To aggregate metadata across LLM calls

    while (step < maxSteps) {
      step++;
      await this.deps.observationManager.record({ type: 'REACT_STEP' as ObservationType, threadId, traceId, content: { step } });

      // 2. Create ReAct Prompt String (Simplified Example)
      const currentPromptString = this.createReActPromptString(query, initialHistory, tools, reactSteps); // Use renamed function

      // --- Validation Step (Conceptual) ---
      // If 'currentPromptString' were an ArtStandardPrompt object constructed by the agent:
      // const validatedPromptObject = this.deps.promptManager.validatePrompt(promptObject);
      // You would then pass 'validatedPromptObject' to reasoningEngine.call below.
      // Since this example uses a simple string, we skip validation for brevity.
      // ------------------------------------

      // 3. Call LLM and process stream
      await this.deps.observationManager.record({ type: ObservationType.LLM_REQUEST, threadId, traceId, content: { phase: `react_step_${step}` } });
      // Determine RuntimeProviderConfig (from overrides or thread defaults)
+      let runtimeConfig: RuntimeProviderConfig | undefined = props.configOverrides?.runtimeProviderConfig;
+      if (!runtimeConfig) {
+          // Placeholder: Load default config for the thread if not overridden
+          // runtimeConfig = await this.deps.stateManager.getThreadConfigValue(threadId, 'runtimeProviderConfig');
+          // If still no config, throw an error or use a hardcoded fallback (not recommended for production)
+          if (!runtimeConfig) {
+              throw new Error("RuntimeProviderConfig not found in overrides or thread config.");
+              // Example fallback (use with caution):
+              // runtimeConfig = { providerName: 'openai', modelId: 'gpt-4o', adapterOptions: { apiKey: 'YOUR_FALLBACK_KEY' } };
+          }
+      }
+
+      // Construct CallOptions
+      const callOptions: CallOptions = {
+          providerConfig: runtimeConfig,
+          threadId: threadId,
+          traceId: traceId,
+          stream: true, // Request streaming
+          callContext: 'AGENT_THOUGHT' // Provide context for the call
+      };
+
+      // Pass the prompt string (or validated object in a full implementation)
+      const stream = await this.deps.reasoningEngine.call(currentPromptString, callOptions); // Use updated variable

      let llmResponseBuffer = '';
      for await (const event of stream) {
        switch (event.type) {
          case 'TOKEN':
            // Push token to UI socket (assuming UI system is available and connected)
            // this.deps.uiSystem.getLLMStreamSocket().notify(event);
            llmResponseBuffer += event.data; // Buffer for parsing later
            break;
          case 'METADATA':
            // Push metadata to UI socket
            // this.deps.uiSystem.getLLMStreamSocket().notify(event);
            // Record as observation
            await this.deps.observationManager.record({ type: ObservationType.LLM_STREAM_METADATA, content: event.data, threadId: event.threadId, traceId: event.traceId, sessionId: event.sessionId });
            // Aggregate metadata (simple merge, needs more robust logic for real aggregation)
            aggregatedMetadata = { ...aggregatedMetadata, ...event.data };
            break;
          case 'ERROR':
            // Push error to UI socket
            // this.deps.uiSystem.getLLMStreamSocket().notify(event);
            // Record as observation
            await this.deps.observationManager.record({ type: ObservationType.LLM_STREAM_ERROR, content: event.data, threadId: event.threadId, traceId: event.traceId, sessionId: event.sessionId });
            console.error(`ReAct Agent LLM Stream Error:`, event.data);
            // Decide how to handle error (e.g., break loop, return error response)
            throw new Error(`LLM Stream Error during ReAct step ${step}: ${event.data.message || event.data}`);
          case 'END':
            // Push end signal to UI socket
            // this.deps.uiSystem.getLLMStreamSocket().notify(event);
            // Record as observation
            await this.deps.observationManager.record({ type: ObservationType.LLM_STREAM_END, threadId: event.threadId, traceId: event.traceId, sessionId: event.sessionId });
            break;
        }
      }
      await this.deps.observationManager.record({ type: ObservationType.LLM_RESPONSE, threadId, traceId, content: { phase: `react_step_${step}`, response: llmResponseBuffer, metadata: aggregatedMetadata } });


      // 4. Parse ReAct Output using custom logic (using the buffered response)
      const parsedOutput = this.parseReActOutput(llmResponseBuffer);
      await this.deps.observationManager.record({ type: 'thought' as ObservationType, threadId, traceId, content: parsedOutput.thought });

      // 5. Check for Final Answer
      if (parsedOutput.finalAnswer) {
        await this.deps.observationManager.record({ type: ObservationType.PROCESS_END, threadId, traceId, content: { status: 'success', finalAnswer: parsedOutput.finalAnswer } });
        // TODO: Save history (user query + final answer)
        // await this.deps.conversationManager.addMessages(threadId, [
        //   { role: MessageRole.USER, content: query, responseId: `react-user-${Date.now()}` },
        //   { role: MessageRole.ASSISTANT, content: parsedOutput.finalAnswer, responseId: `react-final-${Date.now()}` }
        // ]);

        // --- AgentState Persistence ---
        // The ReActAgent, as written, doesn't deeply manage a complex AgentState beyond what's in ThreadConfig.
        // If it did (e.g., persisting 'reactSteps' itself as part of AgentState.data):
        //
        // If 'explicit' stateSavingStrategy:
        //   const agentStateToSave: AgentState = { data: { reactHistory: reactSteps }, version: (context.state?.version || 0) + 1 };
        //   await this.deps.stateManager.setAgentState(threadId, agentStateToSave);
        //   context.state = agentStateToSave; // Keep in-memory context up-to-date
        //
        // If 'implicit' stateSavingStrategy:
        //   // Ensure context.state.data is updated if it's being managed.
        //   // For example, if reactSteps were part of AgentState:
        //   // if (!context.state) context.state = { data: {}, version: 0 }; // Initialize if null
        //   // context.state.data.reactHistory = reactSteps;
        //   // context.state.version = (context.state.version || 0) + 1;
        //   // Then, saveStateIfModified would compare and save if changes were made to context.state.
        //
        // For this simplified example, we'll just call saveStateIfModified.
        // Its behavior depends on the configured strategy:
        // - 'explicit': No-op for AgentState.
        // - 'implicit': Would save if context.state was loaded, cached, and then mutated.
        await this.deps.stateManager.saveStateIfModified(threadId);

        return { response: { role: MessageRole.ASSISTANT, content: parsedOutput.finalAnswer, responseId: `react-final-${Date.now()}` }, metadata: { traceId, llmMetadata: aggregatedMetadata } };
      }

      // 6. Execute Action (if any)
      let observationResult = "No action taken in this step.";
      if (parsedOutput.action && parsedOutput.actionInput !== undefined) {
         await this.deps.observationManager.record({ type: ObservationType.TOOL_START, threadId, traceId, metadata: { toolName: parsedOutput.action } });
         const toolCall: ParsedToolCall = { toolName: parsedOutput.action, args: parsedOutput.actionInput };
         const toolResults = await this.deps.toolSystem.executeTools([toolCall], threadId, traceId);
         const result = toolResults[0];
         observationResult = JSON.stringify(result.status === 'success' ? result.output : { error: result.error });
         await this.deps.observationManager.record({ type: ObservationType.TOOL_END, threadId, traceId, metadata: { toolName: parsedOutput.action, resultStatus: result.status } });
      } else {
         // Handle cases where LLM didn't output a valid action
         observationResult = "LLM did not specify a valid action or input.";
      }

      // 7. Store step for next iteration
      reactSteps.push({
        thought: parsedOutput.thought,
        action: parsedOutput.action,
        actionInput: parsedOutput.actionInput,
        observation: observationResult
      });
       await this.deps.observationManager.record({ type: 'observation' as ObservationType, threadId, traceId, content: observationResult });


    } // End while loop

    // Reached max steps
    const finalResponseText = "Reached maximum thinking steps without a final answer.";
    await this.deps.observationManager.record({ type: ObservationType.PROCESS_END, threadId, traceId, content: { status: 'max_steps_reached' } });
    // TODO: Save history
    // await this.deps.conversationManager.addMessages(...)

    // --- AgentState Persistence (Max Steps Reached) ---
    // Similar logic as above for final answer.
    // If 'explicit' strategy and managing AgentState:
    //   const finalAgentState: AgentState = { data: { reactHistory: reactSteps, status: 'max_steps' }, version: (context.state?.version || 0) + 1 };
    //   await this.deps.stateManager.setAgentState(threadId, finalAgentState);
    //   context.state = finalAgentState;
    //
    // If 'implicit' strategy and managing AgentState:
    //   // if (!context.state) context.state = { data: {}, version: 0 };
    //   // context.state.data.reactHistory = reactSteps;
    //   // context.state.data.status = 'max_steps';
    //   // context.state.version = (context.state.version || 0) + 1;
    //
    // Call saveStateIfModified, its behavior depends on the configured strategy.
    await this.deps.stateManager.saveStateIfModified(threadId);

    return { response: { role: MessageRole.ASSISTANT, content: finalResponseText, responseId: `react-maxstep-${Date.now()}` }, metadata: { traceId, llmMetadata: aggregatedMetadata } };
  }
}
```

**Explanation:**

*(Content remains the same as previous Section 5.2, just renumbered)*

1.  **Implement `IAgentCore`:** The class implements the required `process` method.
2.  **Constructor Dependencies:** It declares constructor parameters for all the ART systems it needs to interact with (StateManager, ReasoningEngine, ToolSystem, etc.). The `AgentFactory` will provide these.
3.  **`process` Method:** Contains the core ReAct loop:
    *   Loads context/history/tools.
    *   **Loop:**
        *   Creates a prompt including previous thoughts, actions, and observations (requires custom `createReActPrompt` logic).
        *   Calls the LLM (`ReasoningEngine`).
        *   Parses the LLM response for "Thought:", "Action:", "Action Input:", or "Final Answer:" (requires custom `parseReActOutput` logic).
        *   If "Final Answer:", records it and returns.
        *   If "Action:", executes the specified tool using `ToolSystem`.
        *   Records the tool's output as the "Observation".
        *   Repeats the loop with the new observation.
    *   Handles reaching max steps.
    *   **State and History Persistence:**
        *   **`AgentState` (Custom Agent Data):**
            *   The example `ReActAgent` doesn't deeply manage its own `AgentState` (e.g., it doesn't try to save the `reactSteps` array into `context.state.data` for persistence across calls).
            *   If it *did* need to persist such custom state:
                *   With **`'explicit'` strategy (default):** The agent *must* construct an `AgentState` object (e.g., `{ data: { myCustomReActData: ... }, version: ... }`) and explicitly call `await this.deps.stateManager.setAgentState(threadId, newState);`. The `saveStateIfModified()` calls in the example would be no-ops for `AgentState`.
                *   With **`'implicit'` strategy:** The agent would directly modify `context.state.data` (after ensuring `context.state` itself is not null). For instance, `context.state.data.reactHistory = reactSteps; context.state.version++;`. Then, the `await this.deps.stateManager.saveStateIfModified(threadId);` calls at the end of the ReAct paths would trigger the `StateManager` to compare the mutated `context.state` with its initial snapshot and save if different.
        *   **Conversation History:** User queries and final assistant responses should be saved using `this.deps.conversationManager.addMessages(...)`. The example has TODO comments for this.
    *   Returns the final response.
4.  **Custom Logic:** Note the placeholders/examples for `createReActPrompt` and `parseReActOutput`. A robust implementation would likely involve more sophisticated prompt engineering and parsing, potentially within custom `PromptManager` and `OutputParser` classes if the framework allows injecting those (or handled internally within the agent).

**7.3. Integrating ReAct and Agent Switching into the Chatbot**

*(Content remains the same as previous Section 5.3, just renumbered)*

Modify the `ArtChatbot` component:

```typescript jsx
// src/components/ArtChatbot.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
// ... other imports ...
import { PESAgent } from 'art-framework'; // Default agent
import { ReActAgent } from '../agents/ReActAgent'; // Import custom agent (adjust path)
import { CurrentInfoTool } from '../tools/CurrentInfoTool'; // Import custom tool

// --- Add Agent Type State ---
type AgentType = 'pes' | 'react';

const ArtChatbot: React.FC = () => {
  // ... existing state (messages, input, isLoading, status) ...
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('pes'); // State for agent choice
  const artInstanceRef = useRef<ArtInstance | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const threadId = 'web-chatbot-thread-1';
  const [isInitializing, setIsInitializing] = useState(true); // Track initialization state

  // --- ART Initialization (Modified for Agent Switching) ---
  // We need to re-initialize if the agent type changes
  useEffect(() => {
    let isMounted = true;
    let unsubObservation: (() => void) | null = null;
    let unsubConversation: (() => void) | null = null;

    const initializeArt = async () => {
      // Clear previous instance if any (optional, depends on ART cleanup needs)
      artInstanceRef.current = null;
      if (!isMounted) return;
      setIsInitializing(true);
      setStatus(`Initializing ${selectedAgent.toUpperCase()} Agent...`);

      try {
        const AgentCoreClass = selectedAgent === 'react' ? ReActAgent : PESAgent;

        // Assuming ArtInstanceConfig is imported from 'art-framework'
        // and OpenAIAdapter, CalculatorTool, CurrentInfoTool are also imported.
        const config: ArtInstanceConfig = { // Use ArtInstanceConfig type
          storage: { type: 'indexedDB', dbName: `artWebChatHistory-${selectedAgent}` },
          providers: {
            availableProviders: [
              {
                name: 'openai',
                adapter: OpenAIAdapter,
              }
            ]
          },
          agentCore: AgentCoreClass,
          tools: [
              new CalculatorTool(),
              new CurrentInfoTool()
          ],
          // Add stateSavingStrategy to the config
          // This is typically set once at app startup, not usually switched dynamically with the agent.
          // For demonstration, we could tie it to a UI element or keep it fixed.
          // Default is 'explicit' if not specified.
          stateSavingStrategy: 'explicit', // Or 'implicit', or make this configurable
        };

        const instance = await createArtInstance(config);
        if (!isMounted) return;

        artInstanceRef.current = instance;
        setStatus('Loading history...');
        await loadMessages(); // Reload messages for the new instance/config

        // --- Re-subscribe to Observations ---
        setStatus('Connecting observers...');
        // (Subscription logic remains the same as in Scenario 1, just re-run)
        const observationSocket = instance.uiSystem.getObservationSocket();
        unsubObservation = observationSocket.subscribe(/* ... observer callback ... */);
        const conversationSocket = instance.uiSystem.getConversationSocket();
        unsubConversation = conversationSocket.subscribe(/* ... conversation callback ... */);


        if (isMounted) setStatus('Ready.');

      } catch (error) {
        console.error(`Failed to initialize ${selectedAgent.toUpperCase()} ART:`, error);
        if (isMounted) setStatus(`Initialization Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
         if (isMounted) setIsInitializing(false);
      }
    };

    initializeArt(); // Initialize on mount and when selectedAgent changes

    // Cleanup function
    return () => {
      isMounted = false;
      console.log("Cleaning up ART subscriptions...");
      if (unsubObservation) unsubObservation();
      if (unsubConversation) unsubConversation();
    };
  }, [selectedAgent, threadId]); // Re-run useEffect when selectedAgent changes!

  // --- Load Messages (Modified slightly for re-init) ---
  const loadMessages = useCallback(async () => {
    // Clear messages before loading new history if agent switched
    setMessages([]);
    if (!artInstanceRef.current) return;
    // ... (rest of loadMessages logic is the same) ...
  }, [threadId]); // Depends only on threadId now, called by useEffect

  // --- Handle Sending (No changes needed) ---
  const handleSend = useCallback(async () => {
    // ... (handleSend logic is the same) ...
  }, [input, isLoading, threadId]);

  // --- Render Component (Add Agent Switcher) ---
  return (
    <div className="chatbot-container">
      {/* Agent Switcher UI */}
      <div style={{ padding: '5px 10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
        <label>Agent Mode: </label>
        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value as AgentType)} disabled={isInitializing}>
          <option value="pes">Plan-Execute-Synthesize</option>
          <option value="react">ReAct</option>
        </select>
        {isInitializing && <span style={{ marginLeft: '10px', fontSize: '0.8em' }}>Initializing...</span>}
      </div>

      <div className="message-list" ref={messageListRef}>
        {/* ... message rendering ... */}
      </div>
      <div className="status-indicator">{status}</div>
      <div className="input-area">
        <input
          type="text"
          // ... input props ...
          disabled={isLoading || isInitializing || !artInstanceRef.current}
          placeholder={isInitializing ? 'Initializing...' : (artInstanceRef.current ? "Ask something..." : "Error")}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || isInitializing || !artInstanceRef.current || !input.trim()}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default ArtChatbot;
```

**Explanation of Changes:**

*(Content remains the same as previous Section 5.3, just renumbered)*

1.  **State for Agent Type:** Added `selectedAgent` state (`'pes'` or `'react'`).
2.  **Agent Switcher UI:** Added a `<select>` dropdown to allow the user to change the `selectedAgent` state.
3.  **Dynamic Initialization:** The main `useEffect` hook now has `selectedAgent` in its dependency array. This means whenever `selectedAgent` changes, the effect re-runs:
    *   It determines the correct `AgentCoreClass` (`PESAgent` or `ReActAgent`) based on the state.
    *   It calls `createArtInstance` with the chosen `agentCore`.
    *   It reloads messages (potentially from a different DB if configured, or clears the list for the new agent context).
    *   It re-subscribes to the sockets for the new instance.
4.  **Loading/Disabled States:** Added `isInitializing` state and updated `disabled` conditions on input/button to prevent interaction while ART is re-initializing after an agent switch.

**How it Works Now:**

*(Content remains the same as previous Section 5.3, just renumbered)*

*   **Node 1 (Developer Interface):** You've defined the `ReActAgent` and provided UI controls (`<select>`) to change the `selectedAgent` state. The `useEffect` hook dynamically sets the `agentCore` in the `config` based on this state before calling `createArtInstance`.
*   **Node 2 (Core Orchestration):** When the user selects an agent type, `createArtInstance` builds the internal engine using the *specified* `IAgentCore` implementation (`PESAgent` or `ReActAgent`). When `art.process()` is called, the framework routes the call to the currently active agent core's `process` method, executing either the PES or ReAct logic.
*   **Node 3 (External Connections):** The same configured adapters and tools are available to *both* agent patterns, but they will be invoked differently based on the logic within the active `IAgentCore` implementation.