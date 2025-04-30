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
  // (Already imported) Needed types like ToolSchema, ParsedToolCall, ToolResult etc.
} from 'art-framework';
```

**Explanation of Agent Core Imports:**

*   **`IAgentCore`**
    The main blueprint for creating a new "thinking style" or reasoning process for the agent. If you want the agent to think differently than the default "Plan -> Use Tools -> Answer" style, you implement this.
    *   **Developer Notes:** The core interface for custom agent logic. Your class must implement `IAgentCore`. Key requirements:
        *   Implement `async process(props: AgentProps): Promise<AgentFinalResponse>`: This method *is* your agent's brain. It receives the `AgentProps` (query, threadId, etc.) and must orchestrate all steps (loading data, calling LLMs, calling tools, saving data) according to your custom logic (e.g., a ReAct loop, or something else entirely) and return the final response.
        *   Define a `constructor` that accepts a single argument: an object containing instances of the necessary ART subsystems (dependencies) defined by the interfaces below (e.g., `constructor(private deps: { stateManager: StateManager, reasoningEngine: ReasoningEngine, ... })`). The `AgentFactory` will automatically provide (inject) these dependencies when it instantiates your custom agent core based on the `config.agentCore` setting.

*   **Dependency Interfaces (`StateManager`, `ConversationManager`, `ToolRegistry`, `PromptManager`, `ReasoningEngine`, `OutputParser`, `ObservationManager`, `ToolSystem`)**
    These are the built-in helpers and managers that ART gives to your custom agent brain so it doesn't have to reinvent everything (like how to talk to the LLM, use tools, remember history, or log events). Your custom `process` method will use these helpers.
    *   **Developer Notes:** These interfaces define the contracts for the core ART subsystems injected into your `IAgentCore` constructor. You'll use their methods within your `process` implementation:
        *   `StateManager`: Use `.loadThreadContext(threadId)` to get `ThreadConfig` and `AgentState`. Use `.saveStateIfModified(threadId)` to persist state changes. Use `.isToolEnabled(threadId, toolName)` for checks.
        *   `ConversationManager`: Use `.getMessages(threadId, options)` to retrieve history. Use `.addMessages(threadId, messages)` to save new user/assistant messages.
        *   `ToolRegistry`: Use `.getAvailableTools({ enabledForThreadId })` to get `ToolSchema[]` for prompting the LLM. Use `.getToolExecutor(toolName)` if needed (though `ToolSystem` is usually preferred).
        *   `PromptManager`: Use `.createPlanningPrompt(...)`, `.createSynthesisPrompt(...)` (for PES-like flows) or potentially define/use custom methods if your agent needs different prompt structures (like ReAct).
        *   `ReasoningEngine`: Use `.call(prompt, options)` to send a formatted prompt to the configured LLM (via the underlying `ProviderAdapter`) and get the raw response string.
        *   `OutputParser`: Use `.parsePlanningOutput(...)`, `.parseSynthesisOutput(...)` (for PES-like flows) or potentially define/use custom methods to extract structured data (like thoughts, actions, final answers) from the LLM's raw response string.
        *   `ObservationManager`: Use `.record(observationData)` frequently within your `process` logic to log key steps (start/end, LLM calls, tool calls, custom steps like 'thought' or 'action') for debugging and UI feedback via sockets.
        *   `ToolSystem`: Use `.executeTools(parsedToolCalls, threadId, traceId)` to run one or more tools identified by your agent's logic. It handles retrieving the executor, validating input against the schema, calling `execute`, and returning `ToolResult[]`.

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

  // --- Custom Prompt Creation Logic (Example) ---
  // In a real implementation, this might be more sophisticated or part of a custom PromptManager
  private createReActPrompt(
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
    prompt += `Thought: [Your current reasoning step]\nAction: [tool_name or Final Answer:]\nAction Input: [Arguments as JSON object if using a tool, otherwise the final answer content]\n`;
    return prompt;
  }


  async process(props: AgentProps): Promise<AgentFinalResponse> {
    const { query, threadId, traceId = `react-trace-${Date.now()}` } = props;
    await this.deps.observationManager.record({ type: ObservationType.PROCESS_START, threadId, traceId, content: { agentType: 'ReAct', query } });

    // 1. Load context, history, tools
    const context = await this.deps.stateManager.loadThreadContext(threadId);
    const initialHistory = await this.deps.conversationManager.getMessages(threadId);
    const tools = await this.deps.toolRegistry.getAvailableTools({ enabledForThreadId: threadId });

    const reactSteps: { thought: string; action?: string; actionInput?: any; observation: string }[] = [];
    let step = 0;
    const maxSteps = 7; // Limit loops

    while (step < maxSteps) {
      step++;
      await this.deps.observationManager.record({ type: 'REACT_STEP' as ObservationType, threadId, traceId, content: { step } });

      // 2. Create ReAct Prompt using custom logic
      const currentPrompt = this.createReActPrompt(query, initialHistory, tools, reactSteps);

      // 3. Call LLM
      await this.deps.observationManager.record({ type: ObservationType.LLM_REQUEST, threadId, traceId, content: { phase: `react_step_${step}` } });
      const llmResponse = await this.deps.reasoningEngine.call(currentPrompt, { threadId, traceId });
      await this.deps.observationManager.record({ type: ObservationType.LLM_RESPONSE, threadId, traceId, content: { phase: `react_step_${step}`, response: llmResponse } });

      // 4. Parse ReAct Output using custom logic
      const parsedOutput = this.parseReActOutput(llmResponse);
      await this.deps.observationManager.record({ type: 'thought' as ObservationType, threadId, traceId, content: parsedOutput.thought });

      // 5. Check for Final Answer
      if (parsedOutput.finalAnswer) {
        await this.deps.observationManager.record({ type: ObservationType.PROCESS_END, threadId, traceId, content: { status: 'success', finalAnswer: parsedOutput.finalAnswer } });
        // TODO: Save history (user query + final answer)
        // await this.deps.conversationManager.addMessages(...)
        await this.deps.stateManager.saveStateIfModified(threadId);
        return { responseId: `react-final-${Date.now()}`, responseText: parsedOutput.finalAnswer, traceId };
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
    await this.deps.stateManager.saveStateIfModified(threadId);
    return { responseId: `react-maxstep-${Date.now()}`, responseText: finalResponseText, traceId };
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
    *   Saves history/state.
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

        const config = {
          storage: { type: 'indexedDB', dbName: `artWebChatHistory-${selectedAgent}` }, // Separate DB per agent? Or shared?
          reasoning: {
            provider: 'openai',
            apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY',
            model: 'gpt-4o' // Ensure model is suitable for the chosen agent pattern
          },
          agentCore: AgentCoreClass, // Dynamically set the agent core
          tools: [
              new CalculatorTool(),
              new CurrentInfoTool() // Include custom tool for both agents
          ]
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