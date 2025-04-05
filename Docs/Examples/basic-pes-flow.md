# Example: Basic Plan-Execute-Synthesize (PES) Flow

This example demonstrates a simple end-to-end execution using the default `PESAgent` in the ART Framework. It processes a basic query that doesn't require complex tool usage, highlighting the core PES stages.

## Prerequisites

*   ART Framework installed (`npm install art-framework` or `yarn add art-framework`).
*   An LLM Provider API key (e.g., OpenAI). Set it as an environment variable (`OPENAI_API_KEY`) or replace the placeholder in the code. **Never hardcode API keys in production code.**

## Code Example

```typescript
import {
  createArtInstance,
  PESAgent,
  InMemoryStorageAdapter, // Using in-memory for simplicity in this example
  OpenAIAdapter,
  LogLevel // Optional for logging
} from 'art-framework';

// --- Configuration ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY_HERE"; 
const USER_QUERY = "Explain the concept of photosynthesis in simple terms.";
const THREAD_ID = "basic-pes-flow-example-thread";

// --- Main Function ---
async function runBasicPesFlow() {
  console.log("Initializing ART Instance...");

  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
      console.error("Error: OpenAI API key not set. Please set the OPENAI_API_KEY environment variable or replace the placeholder.");
      return;
  }

  try {
    // 1. Initialize ART with necessary components
    const art = await createArtInstance({
      agentCore: PESAgent,
      storageAdapter: new InMemoryStorageAdapter(), // Keep it simple for this example
      reasoningAdapter: new OpenAIAdapter({ 
          apiKey: OPENAI_API_KEY,
          // Using a capable but potentially faster model for explanation
          defaultModel: 'gpt-4o-mini' 
      }), 
      tools: [], // No tools needed for this query
      logger: { level: LogLevel.INFO } // Show basic logging
    });

    console.log("ART Instance Initialized.");
    console.log(`\nProcessing Query: "${USER_QUERY}"`);
    console.log(`Thread ID: ${THREAD_ID}`);
    console.log("---");

    // Optional: Subscribe to observations to see the flow
    const observationSocket = art.uiSystem.getObservationSocket();
    const unsubscribeObs = observationSocket.subscribe(
      (obs) => {
        console.log(`[OBSERVATION - ${obs.type}] ${obs.title}`);
        if (obs.type === 'THOUGHTS') {
            console.log(`  Thought: ${obs.content.substring(0, 100)}...`); // Log snippet
        } else if (obs.type === 'TOOL_EXECUTION') {
            console.log(`  Tool: ${obs.metadata?.toolName}, Status: ${obs.content.status}`);
        } else if (obs.content) {
            // Log content snippet for other types if it exists
            const contentStr = JSON.stringify(obs.content);
             console.log(`  Content: ${contentStr.substring(0, 100)}${contentStr.length > 100 ? '...' : ''}`);
        }
      },
      null, // Get all observation types
      { threadId: THREAD_ID }
    );

    // Optional: Subscribe to conversation messages
     const conversationSocket = art.uiSystem.getConversationSocket();
     const unsubscribeConv = conversationSocket.subscribe(
       (msg) => {
         console.log(`[MESSAGE - ${msg.role}] ${msg.content.substring(0, 150)}...`);
       },
       null, // Get USER and AI messages
       { threadId: THREAD_ID }
     );

    // 2. Process the query
    const startTime = Date.now();
    const finalResponse = await art.process({
      query: USER_QUERY,
      threadId: THREAD_ID,
    });
    const duration = Date.now() - startTime;

    // 3. Display the final result
    console.log("\n---");
    console.log("Processing Complete.");
    console.log(`Status: ${finalResponse.metadata.status}`);
    console.log(`Duration: ${duration}ms`);
    console.log("\nFinal AI Response:");
    console.log(finalResponse.response.content);
    console.log("---");

    // Cleanup subscriptions
    unsubscribeObs();
    unsubscribeConv();

  } catch (error) {
    console.error("\n--- ERROR ---");
    console.error("An error occurred during processing:", error);
    console.error("---");
  }
}

// --- Run the example ---
runBasicPesFlow();
```

## Expected Flow & Observations

When you run this code, you should observe logs indicating the different stages of the PES flow via the `ObservationSocket` subscription:

1.  **Initialization:** ART instance is created.
2.  **Processing Starts:** The `art.process` call begins.
3.  **Planning Context:** (Internal, may not have specific observation) History (empty initially) and tool schemas (none) are gathered.
4.  **Planning Call:**
    *   `THOUGHTS` observations might appear as the LLM plans.
    *   `INTENT` observation showing the LLM's understanding of the query.
    *   `PLAN` observation outlining the steps (likely just generating the explanation directly, as no tools are needed). Since no tools are required, the `toolCalls` array in the plan will be empty.
5.  **Tool Execution:** This phase will likely be skipped or very brief as the `toolCalls` array is empty. No `TOOL_EXECUTION` observations will be generated.
6.  **Synthesis Call:**
    *   `THOUGHTS` observations might appear as the LLM formulates the final answer.
7.  **Finalization:**
    *   `MESSAGE - USER` log from the `ConversationSocket`.
    *   `MESSAGE - AI` log from the `ConversationSocket`.
8.  **Result:** The final explanation of photosynthesis is printed to the console.

This example showcases the core orchestration of the `PESAgent` even for simple queries, highlighting the structured approach and the observability provided by the framework. For tool usage, see the [Tool Usage Example](./tool-usage.md).