# Example: Tool Usage with PES Agent

This example demonstrates how the `PESAgent` in the ART Framework utilizes a registered tool (specifically, the `CalculatorTool`) to answer a query that requires calculation. It builds upon the basic PES flow by showing the Tool Execution phase in action.

## Prerequisites

*   ART Framework installed (`npm install art-framework` or `yarn add art-framework`).
*   An LLM Provider API key (e.g., OpenAI) capable of function/tool calling. Set it as an environment variable (`OPENAI_API_KEY`) or replace the placeholder. **Never hardcode API keys in production code.**

## Code Example

```typescript
import {
  createArtInstance,
  PESAgent,
  InMemoryStorageAdapter,
  OpenAIAdapter,
  CalculatorTool, // Import the tool we want to use
  ObservationType,
  LogLevel 
} from 'art-framework';

// --- Configuration ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY_HERE";
// A query that requires calculation
const USER_QUERY = "What is the result of multiplying 123 by 456, and then adding 789?"; 
const THREAD_ID = "tool-usage-example-thread";

// --- Main Function ---
async function runToolUsageFlow() {
  console.log("Initializing ART Instance with CalculatorTool...");

  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
      console.error("Error: OpenAI API key not set. Please set the OPENAI_API_KEY environment variable or replace the placeholder.");
      return;
  }

  try {
    // 1. Initialize ART, including the CalculatorTool in the 'tools' array
    const art = await createArtInstance({
      agentCore: PESAgent,
      storageAdapter: new InMemoryStorageAdapter(), 
      reasoningAdapter: new OpenAIAdapter({ 
          apiKey: OPENAI_API_KEY,
          // A model known to be good at tool calling is recommended
          defaultModel: 'gpt-4o' 
      }), 
      tools: [
          new CalculatorTool() // Register the tool
      ], 
      logger: { level: LogLevel.INFO } 
    });

    console.log("ART Instance Initialized.");
    console.log(`\nProcessing Query: "${USER_QUERY}"`);
    console.log(`Thread ID: ${THREAD_ID}`);
    console.log("---");

    // Subscribe to observations to see the tool usage
    const observationSocket = art.uiSystem.getObservationSocket();
    const unsubscribeObs = observationSocket.subscribe(
      (obs) => {
        console.log(`[OBSERVATION - ${obs.type}] ${obs.title}`);
        if (obs.type === ObservationType.PLAN) {
             console.log(`  Plan Content: ${JSON.stringify(obs.content).substring(0,150)}...`);
             // Look for toolCalls within the plan content if available
             if (obs.content?.toolCalls?.length > 0) {
                 console.log(`  -> Planned Tool Call: ${obs.content.toolCalls[0].toolName}`);
             }
        } else if (obs.type === ObservationType.TOOL_EXECUTION) {
            console.log(`  Tool: ${obs.metadata?.toolName}`);
            console.log(`  Status: ${obs.content.status}`);
            if(obs.content.status === 'success') {
                console.log(`  Output: ${JSON.stringify(obs.content.output)}`);
            } else {
                 console.log(`  Error: ${obs.content.error}`);
            }
        } else if (obs.type === ObservationType.THOUGHTS) {
             console.log(`  Thought: ${obs.content.substring(0, 100)}...`);
        }
      },
      // Focus on relevant observation types for tool usage
      [ObservationType.PLAN, ObservationType.TOOL_EXECUTION, ObservationType.THOUGHTS], 
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
    console.log(finalResponse.response.content); // Should contain the calculated result
    console.log("---");

    // Cleanup subscription
    unsubscribeObs();

  } catch (error) {
    console.error("\n--- ERROR ---");
    console.error("An error occurred during processing:", error);
    console.error("---");
  }
}

// --- Run the example ---
runToolUsageFlow();
```

## Expected Flow & Observations

When running this example, you'll see the PES flow adapt to use the tool:

1.  **Initialization:** ART instance is created with `CalculatorTool` registered.
2.  **Processing Starts.**
3.  **Planning Context:** History (empty) and the schema for `CalculatorTool` are gathered.
4.  **Planning Call:**
    *   `THOUGHTS` observations may appear.
    *   `INTENT` observation is recorded.
    *   `PLAN` observation is recorded. Crucially, the `content` of this observation should now include a `toolCalls` array, likely containing an entry for `CalculatorTool` with an expression like `"123 * 456 + 789"` or potentially broken down into steps depending on the LLM.
5.  **Tool Execution:**
    *   A `TOOL_EXECUTION` observation is recorded for `CalculatorTool`.
    *   The `status` should be `'success'`.
    *   The `output` should contain the calculated result (e.g., `{ "result": 56877 }`).
6.  **Synthesis Call:**
    *   `THOUGHTS` observations may appear as the LLM incorporates the tool result. The prompt for this call includes the output from the `CalculatorTool`.
7.  **Finalization:** Messages are saved, UI is notified.
8.  **Result:** The final AI response, containing the correct calculated answer (56877), is printed.

This example highlights how the Tool System integrates seamlessly into the PES flow. The Agent Core delegates tool execution based on the LLM's plan, and the results are fed back into the reasoning process to generate the final answer.