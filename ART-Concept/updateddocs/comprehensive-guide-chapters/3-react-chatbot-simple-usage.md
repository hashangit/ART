## 3. Scenario 1: Building a Feature-Rich React Chatbot (Simple Usage)

Let's build a chatbot component for a React website using only ART's built-in features. We'll aim to showcase several core ART capabilities.

**Goal:** A chat interface where users can talk to an AI powered by OpenAI, with conversation history saved in the browser, and some real-time feedback using ART's observation system.

**3.1. Necessary Imports & Explanations**

```typescript
// src/components/ArtChatbot.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- ART Core Imports ---
import {
  // The main factory function to initialize ART
  createArtInstance,
  // Type definition for the initialized ART object
  ArtInstance,
  // Type for the properties needed to call the agent's process method
  AgentProps,
  // Type for the final response object from the agent
  AgentFinalResponse,
  // Type representing a single message in the conversation
  ConversationMessage,
  // Enum defining message roles (USER, ASSISTANT, SYSTEM, TOOL)
  MessageRole,
  // Type representing an internal event/observation within ART
  Observation,
  // Enum defining different types of observations (PROCESS_START, LLM_REQUEST, etc.)
  ObservationType,
  // The default Plan-Execute-Synthesize agent pattern implementation
  PESAgent,
  // Interfaces for core components (needed for type hints, less for direct use here)
  StorageAdapter, ProviderAdapter, ReasoningEngine, IToolExecutor, IAgentCore,
  StateManager, ConversationManager, ToolRegistry, ObservationManager, UISystem
} from 'art-framework'; // Assuming 'art-framework' is the installed package name

// --- ART Adapter Imports (Developer Choices) ---
import {
  // Storage adapter that uses the browser's IndexedDB for persistence
  IndexedDBStorageAdapter,
  // Storage adapter that uses temporary browser memory (data lost on refresh)
  // InMemoryStorageAdapter, // Alternative, uncomment if preferred
} from 'art-framework'; // Adapters are usually exported from the main package too

import {
  // Reasoning provider adapter for OpenAI models (GPT-3.5, GPT-4, etc.)
  OpenAIAdapter,
  // Reasoning provider adapter for Google Gemini models
  // GeminiAdapter, // Alternative, uncomment if preferred
  // Reasoning provider adapter for Anthropic Claude models
  // AnthropicAdapter,
} from 'art-framework';

// --- ART Built-in Tool Imports (Optional) ---
import {
  // A simple tool that can evaluate mathematical expressions
  CalculatorTool
} from 'art-framework';
```

**Explanation of Imports:**

*   **`createArtInstance`**
    This is the main function you use to start the ART framework. Think of it as the "ignition key" – you give it instructions (configuration), and it builds and starts the ART engine for you.
    *   **Developer Notes:** An asynchronous factory function (`async function createArtInstance(config: AgentFactoryConfig): Promise<ArtInstance>`). Takes `config` (object conforming to the `AgentFactoryConfig` interface: `{ storage: StorageConfig, reasoning: ReasoningConfig, tools?: IToolExecutor[], agentCore?: new (deps: any) => IAgentCore, logger?: { level?: LogLevel } }`). Uses `AgentFactory` internally to instantiate and inject dependencies for all core components (Managers, Systems, Repositories, Adapters). Returns a `Promise` resolving to the fully initialized `ArtInstance` object. Typically called once at application setup.

*   **`ArtInstance`**
    This describes the main control panel you get after starting ART. It's the object that lets you interact with the initialized framework, primarily by telling it to process user messages.
    *   **Developer Notes:** A TypeScript interface defining the public API returned by `createArtInstance`. Key properties:
        *   `process(props: AgentProps): Promise<AgentFinalResponse>`: The core method to run the agent's reasoning cycle.
        *   `conversationManager: ConversationManager`: Access methods like `getMessages`, `addMessages`.
        *   `stateManager: StateManager`: Access methods like `loadThreadContext`, `setThreadConfig`, `getAgentState`, `setAgentState`, `isToolEnabled`.
        *   `toolRegistry: ToolRegistry`: Access methods like `registerTool`, `getToolExecutor`, `getAvailableTools`.
        *   `observationManager: ObservationManager`: Access methods like `record`, `getObservations`.
        *   `uiSystem: UISystem`: Access methods like `getObservationSocket`, `getConversationSocket`, and `getLLMStreamSocket` (for streaming) to get subscription interfaces.

*   **`AgentProps`**
    Describes the information you need to give the agent each time you want it to respond (your message and which chat it belongs to).
    *   **Developer Notes:** Interface for the input object to `ArtInstance.process()`.
        *   Required: `query: string` (user input), `threadId: string` (conversation ID).
        *   Optional: `configOverrides?: Partial<ThreadConfig>` (temporarily override settings like model or enabled tools for this call), `executionContext?: Record<string, any>` (pass arbitrary data into the execution context, accessible by tools), `userId?: string` (associate the request with a user).

*   **`AgentFinalResponse`**
    Describes the information the agent gives back after processing your request (its reply and some tracking info).
    *   **Developer Notes:** Interface for the output object from `ArtInstance.process()`.
        *   Core Properties: `responseText: string`, `responseId: string`, `threadId: string`, `traceId: string`.
        *   Optional/Contextual: `llmResponse?: any` (raw output from the final LLM call), `toolResults?: ToolResult[]` (results if tools were used), `plan?: string`, `intent?: string`.
        *   `metadata: ExecutionMetadata`: Contains detailed metadata about the execution cycle, including aggregated LLM statistics (`llmMetadata`).

*   **`ConversationMessage`**
    How each chat bubble's information (who sent it, what it says, when) is organized.
    *   **Developer Notes:** Interface representing a message. Properties: `id: string`, `role: MessageRole`, `content: string`, `timestamp: number`, `threadId: string`, `metadata?: Record<string, any>`. Used by `ConversationManager` (via `StorageAdapter`) and often directly in UI rendering logic.

*   **`MessageRole`**
    Labels to know if a message is from the User, the AI Assistant, the System (e.g., errors, info), or a Tool (results).
    *   **Developer Notes:** TypeScript enum: `USER`, `ASSISTANT`, `SYSTEM`, `TOOL`. Crucial for structuring prompts for the LLM (differentiating user input from previous AI responses) and for UI display logic.

*   **`Observation`**
    A notification about something happening inside the agent's brain while it's working (like "Thinking..." or "Using calculator...").
    *   **Developer Notes:** Interface for internal events. Properties: `id: string`, `timestamp: number`, `threadId: string`, `traceId?: string`, `type: ObservationType`, `content: any`, `metadata?: Record<string, any>`. Emitted by `ObservationManager` and broadcast via `UISystem`'s `ObservationSocket`. Useful for real-time UI updates (status indicators) and debugging.

*   **`ObservationType`**
    Labels for the different types of internal notifications (like "Started thinking", "Asking the AI", "Finished using a tool").
    *   **Developer Notes:** TypeScript enum listing event types (e.g., `PROCESS_START`, `LLM_REQUEST`, `LLM_RESPONSE`, `TOOL_START`, `TOOL_END`, `PLANNING_OUTPUT`, `SYNTHESIS_OUTPUT`, `PROCESS_END`, `REACT_STEP`, `thought`, `action`, `observation`). Includes new types for discrete streaming events: `LLM_STREAM_START`, `LLM_STREAM_METADATA`, `LLM_STREAM_END`, `LLM_STREAM_ERROR`. Used to categorize `Observation` events and filter subscriptions on the `ObservationSocket`.

*   **`StreamEvent` (New for Streaming)**
    Represents a single piece of information arriving from the LLM's real-time stream (like a word, statistics, or an end signal).
    *   **Developer Notes:** Interface defining the structure of events yielded by the `ReasoningEngine.call` async iterable. Properties: `type` ('TOKEN', 'METADATA', 'ERROR', 'END'), `data` (content), `tokenType` (classification like 'LLM_THINKING', 'FINAL_SYNTHESIS_LLM_RESPONSE'), `threadId`, `traceId`, `sessionId`. Consumed by the Agent Core and pushed to the `LLMStreamSocket`.

*   **`LLMMetadata` (New for Streaming)**
    A structured way to hold detailed statistics about an LLM call (token counts, timing, etc.).
    *   **Developer Notes:** Interface defining the structure for LLM statistics. Properties: `inputTokens?`, `outputTokens?`, `thinkingTokens?`, `timeToFirstTokenMs?`, `totalGenerationTimeMs?`, `stopReason?`, `providerRawUsage?`, `traceId?`. Delivered via `StreamEvent` (type 'METADATA') and aggregated into `ExecutionMetadata.llmMetadata`.

*   **`PESAgent`**
    The specific "thinking style" the agent will use by default (Plan -> Use Tools -> Answer).
    *   **Developer Notes:** Concrete class implementing `IAgentCore`. Instantiated by `AgentFactory` if specified in `config.agentCore` or if `agentCore` is omitted. Receives dependencies (`StateManager`, `ReasoningEngine`, `ToolSystem`, etc.) in its constructor. Its `process` method orchestrates the Plan-Execute-Synthesize flow, interacting with the injected dependencies.

*   **`IndexedDBStorageAdapter` / `InMemoryStorageAdapter`**
    How the agent remembers the conversation. `IndexedDB` is like saving to a file (remembers after closing), `InMemory` is like writing on a whiteboard (erased when closed).
    *   **Developer Notes:** Concrete classes implementing `StorageAdapter` (`get`, `set`, `delete`, `query`). Selected via `config.storage.type`. `IndexedDBStorageAdapter` takes `{ dbName: string, version?: number, objectStores?: string[] }` in its constructor (usually via `config.storage`). `InMemoryStorageAdapter` takes no arguments. Used by internal Repositories. `IndexedDB` provides persistence across browser sessions; `InMemory` does not.

*   **`OpenAIAdapter` / `GeminiAdapter` / `AnthropicAdapter`**
    The specific translator the agent uses to talk to a particular AI brain (like OpenAI's GPT, Google's Gemini, or Anthropic's Claude).
    *   **Developer Notes:** Concrete classes implementing `ProviderAdapter` (extends `ReasoningEngine`). Selected via `config.reasoning.provider`. Constructor takes an options object (e.g., `{ apiKey: string, model?: string, baseURL?: string, defaultParams?: object }`) derived from `config.reasoning`. Implements the `call(prompt, options)` method, which now returns `Promise<AsyncIterable<StreamEvent>>` to support streaming. Adapters must check `options.stream` and `options.callContext` to handle streaming requests correctly, yielding `StreamEvent` objects. Used by the core `ReasoningEngine` component.

*   **`CalculatorTool`**
    A specific skill the agent can use, like a pocket calculator.
    *   **Developer Notes:** Concrete class implementing `IToolExecutor`. Provides `schema` (`name`, `description`, `inputSchema`) and `execute(input, context)`. Instances are passed in `config.tools`. Registered with `ToolRegistry` and executed by `ToolSystem` when planned by the `IAgentCore`.

**3.2. React Component Implementation**

```typescript jsx
// src/components/ArtChatbot.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createArtInstance, ArtInstance, AgentProps, AgentFinalResponse,
  ConversationMessage, MessageRole, Observation, ObservationType, PESAgent
} from 'art-framework';
import { IndexedDBStorageAdapter } from 'art-framework'; // Or InMemoryStorageAdapter
import { OpenAIAdapter } from 'art-framework'; // Or GeminiAdapter, etc.
import { CalculatorTool } from 'art-framework';

// Basic CSS (add this to a corresponding CSS file or use styled-components/tailwind)
/*
.chatbot-container { max-width: 600px; margin: auto; border: 1px solid #ccc; border-radius: 8px; display: flex; flex-direction: column; height: 70vh; }
.message-list { flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; }
.message { margin-bottom: 10px; padding: 8px 12px; border-radius: 15px; max-width: 80%; word-wrap: break-word; }
.message.USER { background-color: #dcf8c6; align-self: flex-end; border-bottom-right-radius: 0; }
.message.ASSISTANT { background-color: #f1f0f0; align-self: flex-start; border-bottom-left-radius: 0; }
.message.SYSTEM, .message.TOOL { background-color: #e0e0e0; font-style: italic; font-size: 0.9em; align-self: center; text-align: center; }
.input-area { display: flex; padding: 10px; border-top: 1px solid #ccc; }
.input-area input { flex-grow: 1; padding: 10px; border: 1px solid #ccc; border-radius: 20px; margin-right: 10px; }
.input-area button { padding: 10px 15px; border: none; background-color: #007bff; color: white; border-radius: 20px; cursor: pointer; }
.input-area button:disabled { background-color: #aaa; cursor: not-allowed; }
.status-indicator { padding: 5px 10px; font-size: 0.8em; color: #666; text-align: center; height: 20px; }
*/

const ArtChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('Initializing...'); // For observation feedback
  const artInstanceRef = useRef<ArtInstance | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null); // For auto-scrolling
  const threadId = 'web-chatbot-thread-1'; // Consistent ID for this chat instance

  // --- Auto-scrolling ---
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // --- ART Initialization ---
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    let unsubObservation: (() => void) | null = null;
    let unsubConversation: (() => void) | null = null;

    const initializeArt = async () => {
      if (!artInstanceRef.current) {
        try {
          setStatus('Initializing ART Engine...');
          const config = {
            storage: {
              type: 'indexedDB',
              dbName: 'artWebChatHistory'
            },
            reasoning: {
              provider: 'openai',
              apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY', // Use env var
              model: 'gpt-4o'
            },
            agentCore: PESAgent, // Explicitly using the default
            tools: [new CalculatorTool()] // Include the calculator
          };

          const instance = await createArtInstance(config);
          if (!isMounted) return; // Check if component unmounted during async init

          artInstanceRef.current = instance;
          setStatus('Loading history...');
          await loadMessages(); // Load history after successful init

          // --- Subscribe to Observations (UI Feedback) ---
          setStatus('Connecting observers...');
          const observationSocket = instance.uiSystem.getObservationSocket();
          unsubObservation = observationSocket.subscribe(
            (observation: Observation) => {
              if (observation.threadId === threadId) {
                // Simple status updates based on observations
                let newStatus = status;
                switch (observation.type) {
                  case ObservationType.LLM_REQUEST: newStatus = 'Asking AI...'; break;
                  case ObservationType.LLM_RESPONSE: newStatus = 'AI replied.'; break;
                  case ObservationType.TOOL_START: newStatus = `Using ${observation.metadata?.toolName}...`; break;
                  case ObservationType.TOOL_END: newStatus = 'Tool finished.'; break;
                  case ObservationType.PROCESS_START: newStatus = 'Processing request...'; break;
                  case ObservationType.PROCESS_END: newStatus = 'Ready.'; break;
                }
                if (isMounted) setStatus(newStatus);
              }
            },
            // Subscribe to multiple types
            [
              ObservationType.PROCESS_START, ObservationType.LLM_REQUEST, ObservationType.LLM_RESPONSE,
              ObservationType.TOOL_START, ObservationType.TOOL_END, ObservationType.PROCESS_END
            ],
            { threadId: threadId } // Filter for this specific chat thread
          );

          // --- Subscribe to Conversation (Optional: for real-time multi-user or streaming) ---
          // In this simple example, we add messages manually after process() resolves,
          // but this shows how you *could* listen for messages pushed via sockets.
          const conversationSocket = instance.uiSystem.getConversationSocket();
          unsubConversation = conversationSocket.subscribe(
            (message: ConversationMessage) => {
              // Example: If another source added a message to this thread, update UI
              if (message.threadId === threadId && !messages.some(m => m.id === message.id)) {
                 console.log("Received message via socket:", message);
                 // if (isMounted) setMessages(prev => [...prev, message]); // Be careful with duplicates if also adding manually
              }
            },
            undefined, // No role filter
            { threadId: threadId }
          );

          if (isMounted) setStatus('Ready.');

        } catch (error) {
          console.error("Failed to initialize ART:", error);
          if (isMounted) setStatus(`Initialization Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    initializeArt();

    // Cleanup function
    return () => {
      isMounted = false;
      console.log("Cleaning up ART subscriptions...");
      if (unsubObservation) unsubObservation();
      if (unsubConversation) unsubConversation();
      // Note: ART instance itself might not need explicit cleanup unless specified by the framework
    };
  }, [threadId]); // Rerun if threadId changes (it doesn't in this example)

  // --- Load Messages ---
  const loadMessages = useCallback(async () => {
    if (!artInstanceRef.current) return;
    try {
      setIsLoading(true);
      const history = await artInstanceRef.current.conversationManager.getMessages(threadId, { limit: 100 });
      setMessages(history.sort((a, b) => a.timestamp - b.timestamp)); // Sort oldest to newest
    } catch (error) {
      console.error("Failed to load messages:", error);
      setStatus('Error loading history.');
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  // --- Handle Sending ---
  const handleSend = useCallback(async () => {
    if (!input.trim() || !artInstanceRef.current || isLoading) return;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: MessageRole.USER,
      content: input,
      timestamp: Date.now(),
      threadId: threadId,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input; // Capture input before clearing
    setInput('');
    setIsLoading(true);
    setStatus('Sending to ART...');

    try {
      const props: AgentProps = {
        query: currentInput,
        threadId: threadId,
      };
      const response: AgentFinalResponse = await artInstanceRef.current.process(props);

      const aiMessage: ConversationMessage = {
        id: response.responseId || `ai-${Date.now()}`,
        role: MessageRole.ASSISTANT,
        content: response.responseText,
        timestamp: Date.now(), // Consider using a server timestamp if available/needed
        threadId: threadId,
        metadata: { traceId: response.traceId } // Store trace ID if needed
      };
      setMessages(prev => [...prev, aiMessage]);
      setStatus('Ready.');

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: ConversationMessage = {
        id: `error-${Date.now()}`,
        role: MessageRole.SYSTEM,
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
        threadId: threadId,
      };
      setMessages(prev => [...prev, errorMessage]);
      setStatus('Error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, threadId]);

  // --- Render Component ---
  return (
    <div className="chatbot-container">
      <div className="message-list" ref={messageListRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {/* Simple rendering, consider markdown parsing for content */}
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{msg.content}</pre>
          </div>
        ))}
      </div>
      <div className="status-indicator">{status}</div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
          disabled={isLoading || !artInstanceRef.current}
          placeholder={artInstanceRef.current ? "Ask something..." : "Initializing..."}
        />
        <button onClick={handleSend} disabled={isLoading || !artInstanceRef.current || !input.trim()}>
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default ArtChatbot;
```

**Explanation of Features Used:**

1.  **Initialization (`createArtInstance`):** Sets up ART with chosen adapters (`IndexedDBStorageAdapter`, `OpenAIAdapter`), the default `PESAgent`, and a built-in `CalculatorTool`.
2.  **Conversation Management (`conversationManager.getMessages`):** Loads previous messages from storage when the component mounts, providing history. Messages are saved implicitly by the `PESAgent` after `process` completes.
3.  **State Management (`StateManager`):** Used internally by ART to load thread configuration (like the OpenAI model specified) and potentially save agent state between turns (though this simple example doesn't explicitly manipulate `AgentState`).
4.  **Reasoning (`OpenAIAdapter`, `PESAgent`):** Handles the core logic of understanding the query, planning (potentially deciding to use the calculator), and synthesizing the response via calls to the OpenAI API.
5.  **Tools (`CalculatorTool`, `ToolSystem`):** The calculator is available. If the user asks "What is 5*5?", the `PESAgent` should plan to use it, the `ToolSystem` will execute it, and the result will inform the final answer.
6.  **Storage (`IndexedDBStorageAdapter`):** Ensures conversation history persists even if the user closes and reopens the browser tab.
7.  **Observations & UI Sockets (`uiSystem.getObservationSocket`):** Subscribes to internal ART events to provide simple real-time feedback to the user in the `status-indicator` div (e.g., "Asking AI...", "Using calculator...").

This component provides a solid foundation, demonstrating the core ART features working together in a practical application.
## Detailed Internal Workflow: `art.process()` with PESAgent

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
## Detailed Internal Workflow: `art.process()` with PESAgent

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