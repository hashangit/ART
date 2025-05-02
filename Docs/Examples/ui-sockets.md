# Example: UI Socket Integration

This example demonstrates how to use the ART Framework's UI System sockets (`ObservationSocket` and `ConversationSocket`) to receive real-time updates in a frontend application. This allows you to build reactive user interfaces that display conversation history, agent thoughts, and tool usage as they happen.

## Prerequisites

*   ART Framework installed.
*   An initialized `ArtClient` instance (refer to the [Basic Usage Tutorial](../Guides/BasicUsage.md) for initialization).
*   A conceptual understanding of frontend development (the example uses console logging to represent UI updates).

## Code Example

```typescript
import {
  createArtInstance,
  PESAgent,
  InMemoryStorageAdapter,
  OpenAIAdapter,
  CalculatorTool,
  ObservationType,
  MessageRole,
  LogLevel,
  ArtClient, // Type for the initialized instance
  Observation,
  ConversationMessage
} from 'art-framework';

// --- Configuration ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY_HERE";
const USER_QUERY = "What is 5 + 7 * 3?"; 
const THREAD_ID = "ui-socket-example-thread";

// --- Mock UI Update Functions ---
// In a real app, these would update React state, Vue data, DOM elements, etc.
function displayChatMessage(message: ConversationMessage): void {
  console.log(`[UI CHAT UPDATE - ${message.role}] ${message.content}`);
}

function displayAgentActivity(observation: Observation): void {
  let activityText = `[UI ACTIVITY - ${observation.type}] ${observation.title}`;
  if (observation.type === ObservationType.THOUGHTS) {
    activityText += `: ${observation.content.substring(0, 80)}...`;
  } else if (observation.type === ObservationType.TOOL_EXECUTION) {
    activityText += ` - Tool: ${observation.metadata?.toolName}, Status: ${observation.content.status}`;
  }
  console.log(activityText);
}

// --- Main Function ---
async function runUISocketExample() {
  console.log("Initializing ART Instance...");
   if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
      console.error("Error: OpenAI API key not set.");
      return;
  }

  let art: ArtClient | null = null; // Use the ArtClient type
  let unsubscribeConv: (() => void) | null = null;
  let unsubscribeObs: (() => void) | null = null;

  try {
    // 1. Initialize ART
    art = await createArtInstance({
      agentCore: PESAgent,
      storageAdapter: new InMemoryStorageAdapter(),
      reasoningAdapter: new OpenAIAdapter({ apiKey: OPENAI_API_KEY, defaultModel: 'gpt-4o' }),
      tools: [new CalculatorTool()],
      logger: { level: LogLevel.WARN } // Reduce logging noise for this example
    });

    console.log("ART Instance Initialized.");

    // 2. Get Sockets from the UI System
    const conversationSocket = art.uiSystem.getConversationSocket();
    const observationSocket = art.uiSystem.getObservationSocket();

    // 3. Subscribe to Conversation Messages (AI only for this example)
    console.log(`\nSubscribing to AI messages for thread [${THREAD_ID}]...`);
    unsubscribeConv = conversationSocket.subscribe(
      (message) => {
        displayChatMessage(message); // Update chat UI
      },
      MessageRole.AI, // Filter: Only AI messages
      { threadId: THREAD_ID } // Filter: Only this thread
    );

    // 4. Subscribe to Specific Observations (Thoughts and Tool Usage)
    console.log(`Subscribing to THOUGHTS & TOOL_EXECUTION observations for thread [${THREAD_ID}]...`);
    unsubscribeObs = observationSocket.subscribe(
      (observation) => {
        displayAgentActivity(observation); // Update activity monitor UI
      },
      [ObservationType.THOUGHTS, ObservationType.TOOL_EXECUTION], // Filter: Specific types
      { threadId: THREAD_ID } // Filter: Only this thread
    );

    console.log("\n--- Starting Agent Processing ---");
    console.log(`Query: "${USER_QUERY}"`);

    // 5. Process a query to trigger events
    const finalResponse = await art.process({
      query: USER_QUERY,
      threadId: THREAD_ID,
    });

    console.log("--- Agent Processing Complete ---");
    console.log(`Final Status: ${finalResponse.metadata.status}`);
    // Note: The final AI message content was already logged by the conversationSocket subscription

  } catch (error) {
    console.error("\n--- ERROR ---");
    console.error("An error occurred:", error);
    console.error("---");
  } finally {
    // 6. Unsubscribe to prevent memory leaks
    if (unsubscribeConv) {
      console.log("\nUnsubscribing from Conversation Socket.");
      unsubscribeConv();
    }
    if (unsubscribeObs) {
      console.log("Unsubscribing from Observation Socket.");
      unsubscribeObs();
    }
  }
}

// --- Run the example ---
runUISocketExample();
```

## Explanation

1.  **Initialization:** We set up the `ArtClient` instance as usual, including a tool (`CalculatorTool`) that the agent might use.
2.  **Get Sockets:** We retrieve the `ConversationSocket` and `ObservationSocket` from the initialized `art.uiSystem`.
3.  **Subscribe to Conversation:** We call `conversationSocket.subscribe`.
    *   The first argument is our callback function (`displayChatMessage`) which simulates updating the chat UI.
    *   The second argument is the filter (`MessageRole.AI`), meaning we only want messages where `role` is 'AI'.
    *   The third argument provides options, specifically filtering for our `THREAD_ID`.
4.  **Subscribe to Observations:** We call `observationSocket.subscribe`.
    *   The first argument is our callback (`displayAgentActivity`) simulating updates to an agent activity feed.
    *   The second argument filters for an array of types: `ObservationType.THOUGHTS` and `ObservationType.TOOL_EXECUTION`. We only get observations matching these types.
    *   The third argument filters for our `THREAD_ID`.
5.  **Process Query:** We run `art.process`. As the agent works through the PES stages, the `ObservationManager` and `ConversationManager` will call `notify` on their respective sockets internally.
6.  **Receive Updates:** Our subscribed callback functions (`displayChatMessage`, `displayAgentActivity`) are invoked automatically by the sockets whenever a matching event occurs for the specified `threadId`. The console logs simulate these real-time UI updates.
7.  **Unsubscribe:** In the `finally` block, we call the `unsubscribe` functions returned by the `subscribe` calls. This is crucial in real applications (e.g., in a React `useEffect` cleanup function or Vue `onUnmounted` hook) to stop listening and prevent memory leaks when the UI component is no longer active.

This example demonstrates the power of the UI System for building dynamic and informative interfaces that react to the agent's internal workings without needing direct access to the framework's core logic.