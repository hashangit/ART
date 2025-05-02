# Basic Usage Tutorial

This tutorial guides you through the fundamental steps of using the Agent Runtime (ART) Framework v0.2.4 to create and run a simple intelligent agent.

## Prerequisites

*   Ensure you have installed the ART Framework as described in the [Installation Guide](./Installation.md).
*   Basic understanding of TypeScript/JavaScript and asynchronous programming (`async`/`await`).

## 1. Importing Core Components

First, import the necessary components from the `art-framework` package:

```typescript
import {
  createArtInstance,
  PESAgent, // Default Plan-Execute-Synthesize Agent Core
  InMemoryStorageAdapter, // Simple in-memory storage
  IndexedDBStorageAdapter, // Browser-persistent storage
  OpenAIAdapter, // Example Reasoning Provider
  CalculatorTool, // Example Tool
  ObservationType, // Enum for observation filtering
  MessageRole // Enum for message filtering
} from 'art-framework';

// Utility for generating unique IDs (if needed)
import { generateUUID } from 'art-framework'; 
```

## 2. Initializing the ART Instance

The `createArtInstance` function is the main entry point for setting up the framework. You need to provide configurations for the core components, primarily the storage and reasoning adapters.

```typescript
async function initializeArt() {
  try {
    const artInstance = await createArtInstance({
      // --- Core Agent Logic ---
      agentCore: PESAgent, // Use the Plan-Execute-Synthesize agent

      // --- Reasoning Configuration ---
      // Choose an LLM provider adapter. Requires API key.
      reasoningAdapter: new OpenAIAdapter({ 
        apiKey: process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY", // Replace with your key or use environment variables
        // Optional: Specify default model and parameters
        // defaultModel: 'gpt-4o', 
        // defaultParams: { temperature: 0.7 }
      }),
      // You could also use other adapters like:
      // reasoningAdapter: new AnthropicAdapter({ apiKey: "YOUR_ANTHROPIC_KEY" }),
      // reasoningAdapter: new GeminiAdapter({ apiKey: "YOUR_GEMINI_KEY" }),

      // --- Storage Configuration ---
      // Choose a storage adapter. IndexedDB is recommended for browser persistence.
      storageAdapter: new IndexedDBStorageAdapter({ 
        dbName: 'art-agent-storage', // Name for the IndexedDB database
        version: 1 // Database version for schema migrations
      }),
      // Or use InMemoryStorageAdapter for testing/temporary storage:
      // storageAdapter: new InMemoryStorageAdapter(),

      // --- Tool Configuration ---
      // Register any tools the agent should be able to use.
      tools: [
        new CalculatorTool() // Add the calculator tool
        // Add other tools here, e.g., new WebSearchTool()
      ],

      // --- Optional: Logging Configuration ---
      // logger: { level: LogLevel.DEBUG } // Example: Set log level
    });

    console.log("ART Instance Initialized Successfully!");
    return artInstance;

  } catch (error) {
    console.error("Failed to initialize ART instance:", error);
    // Handle initialization error appropriately
    return null;
  }
}

// Example usage:
// const art = await initializeArt();
// if (!art) { /* Handle error */ } 
```

**Key Configuration Points:**

*   **`agentCore`**: Specifies the reasoning pattern (e.g., `PESAgent`).
*   **`reasoningAdapter`**: Connects to an LLM provider (e.g., `OpenAIAdapter`). Requires API keys. **Remember to handle API keys securely and avoid hardcoding them directly.** Use environment variables or a secure configuration method.
*   **`storageAdapter`**: Determines where agent data (history, state, observations) is stored. `IndexedDBStorageAdapter` persists data in the browser, while `InMemoryStorageAdapter` is temporary.
*   **`tools`**: An array of tool instances available to the agent.

## 3. Running a Simple Query

Once initialized, you can process user queries using the `artInstance.process()` method. You must provide a `query` and a unique `threadId`. The `threadId` groups related messages and maintains context for a specific conversation or task.

```typescript
async function runSimpleQuery(artInstance, userQuery) {
  if (!artInstance) {
    console.error("ART instance is not initialized.");
    return;
  }

  const threadId = 'my-first-conversation'; // Use a consistent ID for the same conversation

  console.log(`\nProcessing query for thread [${threadId}]: "${userQuery}"`);

  try {
    const startTime = performance.now();
    
    // Process the query
    const finalResponse = await artInstance.process({
      query: userQuery,
      threadId: threadId,
      // Optional parameters:
      // sessionId: 'user-session-xyz', // Link to a specific UI session
      // userId: 'user-123',           // Associate with a specific user
      // traceId: generateUUID(),      // For end-to-end tracing
      // options: { /* Runtime overrides for this specific call */ }
    });

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    console.log("\n--- Agent Response ---");
    console.log(`Role: ${finalResponse.response.role}`); // Should be 'AI'
    console.log(`Content: ${finalResponse.response.content}`);
    console.log(`Thread ID: ${finalResponse.metadata.threadId}`);
    console.log(`Status: ${finalResponse.metadata.status}`);
    console.log(`Duration: ${duration} ms`);
    console.log("--------------------\n");

  } catch (error) {
    console.error(`Error processing query for thread [${threadId}]:`, error);
    // Handle processing errors (e.g., LLM API errors, tool errors)
  }
}

// Example usage:
// const art = await initializeArt();
// if (art) {
//   await runSimpleQuery(art, "What is the capital of France?");
// }
```

The `process` method orchestrates the entire agent flow (Plan-Execute-Synthesize for `PESAgent`) and returns a structured `AgentFinalResponse` containing the AI's final message and execution metadata.

## 4. Using Tools

If you registered tools during initialization (like the `CalculatorTool`), the agent can use them if the LLM determines they are necessary to answer the query.

```typescript
// Example query that might trigger the CalculatorTool
// await runSimpleQuery(art, "What is 123 * 456?"); 
```

The `PESAgent` will:
1.  **Plan:** Recognize the need for calculation and generate a plan including a call to `CalculatorTool`.
2.  **Execute:** Call the `CalculatorTool` via the Tool System with the arguments `123 * 456`.
3.  **Synthesize:** Use the tool's result (`56088`) to formulate the final answer.

You don't need to explicitly tell the agent *how* to use the tool; you just provide the tools and the LLM figures out *when* and *how* based on the tool's schema (name, description, input parameters).

*For more details, see the [Tool System Guide](../Guides/Systems/ToolSystem.md).*

## 5. Subscribing to UI Sockets

The UI System allows your application frontend to react to agent events in real-time without tightly coupling to the framework's internals. You can subscribe to different data streams:

**a) Subscribing to Conversation Messages:**

```typescript
function setupConversationListener(artInstance, threadId, displayMessageCallback) {
  if (!artInstance) return () => {}; // Return dummy unsubscribe

  const conversationSocket = artInstance.uiSystem.getConversationSocket();

  console.log(`Listening for messages on thread [${threadId}]...`);

  // Subscribe to both USER and AI messages for this thread
  const unsubscribe = conversationSocket.subscribe(
    (message) => {
      console.log(`[Socket Message - ${message.role}]`, message.content);
      displayMessageCallback(message); // Your function to update the UI
    },
    null, // No role filter (get both USER and AI)
    // Alternatively, filter for only AI messages: MessageRole.AI
    { threadId: threadId } // Filter for the specific thread
  );

  // Return the unsubscribe function for cleanup
  return unsubscribe;
}

// Example usage:
// const displayChatMessage = (msg) => { /* Update your chat UI */ };
// const stopListening = setupConversationListener(art, 'my-first-conversation', displayChatMessage);
// ... later ...
// stopListening(); // Clean up the subscription
```

**b) Subscribing to Observations (e.g., Thoughts, Tool Usage):**

```typescript
function setupObservationListener(artInstance, threadId, displayObservationCallback) {
  if (!artInstance) return () => {}; 

  const observationSocket = artInstance.uiSystem.getObservationSocket();

  console.log(`Listening for observations on thread [${threadId}]...`);

  // Subscribe to specific observation types for this thread
  const unsubscribe = observationSocket.subscribe(
    (observation) => {
      console.log(`[Socket Observation - ${observation.type}]`, observation.title, observation.content);
      displayObservationCallback(observation); // Your function to update UI (e.g., show "Thinking..." or tool steps)
    },
    // Filter for specific types (optional):
    // [ObservationType.THOUGHTS, ObservationType.TOOL_EXECUTION], 
    null, // Subscribe to all types if filter is null
    { threadId: threadId } // Filter for the specific thread
  );

  return unsubscribe;
}

// Example usage:
// const displayAgentStep = (obs) => { /* Update UI with agent activity */ };
// const stopObsListening = setupObservationListener(art, 'my-first-conversation', displayAgentStep);
// ... later ...
// stopObsListening(); 
```

Using sockets allows you to build rich, interactive UIs that show the agent's progress, thoughts, and final responses as they happen.

*For more details, see the [UI System Guide](../Guides/Systems/UISystem.md).*

## Conclusion

This tutorial covered the basics of setting up the ART Framework, running queries, using tools, and integrating with a UI via sockets. You can now explore the system-specific guides for deeper dives into each component:

*   [Agent Core Guide](../Guides/Systems/AgentCore.md)
*   [Reasoning System Guide](../Guides/Systems/ReasoningSystem.md)
*   [Tool System Guide](../Guides/Systems/ToolSystem.md)
*   [Context System Guide](../Guides/Systems/ContextSystem.md)
*   [Observation System Guide](../Guides/Systems/ObservationSystem.md)
*   [UI System Guide](../Guides/Systems/UISystem.md)
*   [Storage System Guide](../Guides/Systems/StorageSystem.md)