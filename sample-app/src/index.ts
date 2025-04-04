import {
  createArtInstance,
  PESAgent,
  // Removed InMemoryStorageAdapter - Handled by factory config
  // Removed GeminiAdapter - Handled by factory config
  CalculatorTool, // Import the Calculator tool
  AgentProps,
  AgentFinalResponse,
  ThreadConfig // Import ThreadConfig type
} from 'art-framework'; // Assuming 'art-framework' is the linked package name
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Main function to run the CLI app
async function main() {
  console.log('ART Sample CLI App - Initializing...');

  // --- 1. Configure ART Instance ---
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('Error: GEMINI_API_KEY not found in environment variables.');
    console.error('Please create a .env file in the sample-app directory with your key:');
    console.error('GEMINI_API_KEY=YOUR_API_KEY_HERE');
    process.exit(1);
  }

  try {
    const art = await createArtInstance({
      agentCore: PESAgent, // Optional: Specify agent core (defaults to PESAgent)
      storage: {
        type: 'memory' // Specify storage type
      },
      reasoning: {
        provider: 'gemini', // Specify reasoning provider
        apiKey: geminiApiKey, // Pass the API key
        // model: 'gemini-pro' // Optionally specify a model
      },
      tools: [new CalculatorTool()], // Provide tool instances
    });
    console.log('ART Instance Initialized.');

    // --- 2. Get Query from Command Line Arguments ---
    const args = process.argv.slice(2); // Remove 'node' and script path
    if (args.length === 0) {
      console.error('Error: Please provide a query as a command line argument.');
      console.log('Example: npm start -- "What is 15 * 24?"');
      process.exit(1);
    }
    const query = args.join(' ');
    console.log(`Processing query: "${query}"`);

    // --- 3. Set Default Thread Configuration ---
    const threadId = 'cli-test-thread-1'; // Static thread ID for this test
    const defaultThreadConfig: ThreadConfig = {
        // Define reasoning config matching the factory setup
        reasoning: {
            provider: 'gemini', // Match the provider used in factory config
            model: 'gemini-2.0-flash-lite', // Use a reasonable default model name
            // LLM parameters like temperature are usually passed in CallOptions during art.process, not here.
        },
        // Enable the CalculatorTool for this thread
        enabledTools: [CalculatorTool.toolName], // Use static toolName property from the imported class
        historyLimit: 10, // Example history limit
        systemPrompt: "You are a helpful assistant. Use the calculator tool for any math calculations.", // Example prompt
    };

    // Use StateManager to set the configuration for the thread
    // Assuming StateRepository (used by StateManager) has setThreadConfig
    // Note: For InMemoryStorage, this needs to be done *before* processing
    // as the state doesn't persist across runs.
    try {
        // Access stateManager from the initialized art instance
        await art.stateManager.setThreadConfig(threadId, defaultThreadConfig);
        console.log(`Default configuration set for thread: ${threadId}`);
    } catch (configError) {
         console.error(`Error setting default thread config: ${configError}`);
         process.exit(1);
    }


    // --- 4. Process Query using ART ---
    const agentProps: AgentProps = {
      query: query,
      threadId: threadId,
      // Optional: Add userId, sessionId, traceId if needed
    };

    // --- 3a. Subscribe to Observations (Optional but good for testing) ---
    // --- 4a. Subscribe to Observations ---
    const observationSocket = art.uiSystem.getObservationSocket();
    const unsubscribe = observationSocket.subscribe(
      (observation) => {
        console.log(`\n[OBSERVATION - ${observation.type}]`);
        // Log specific details based on type
        if (observation.type === 'PLAN' || observation.type === 'INTENT' || observation.type === 'THOUGHTS') {
           console.log(observation.content);
        } else if (observation.type === 'TOOL_EXECUTION') {
           console.log(`Tool: ${observation.metadata?.toolName}, Status: ${observation.content.status}`);
           if(observation.content.output) console.log(`Output: ${JSON.stringify(observation.content.output)}`);
           if(observation.content.error) console.error(`Error: ${observation.content.error}`);
        } else if (observation.type === 'ERROR') {
            console.error(`Agent Error: ${observation.content.message || JSON.stringify(observation.content)}`);
        } else {
            console.log(JSON.stringify(observation.content, null, 2));
        }
      },
      undefined, // Pass undefined to get all observation types
      { threadId: threadId } // Filter for our specific thread
    );

    console.log('Subscribed to observations. Processing query with configuration...');
    const startTime = Date.now();
    const finalResponse: AgentFinalResponse = await art.process(agentProps);
    const duration = Date.now() - startTime;

    // Unsubscribe after processing is complete
    unsubscribe();

    // --- 5. Display Final Result ---
    console.log('\n--- Final Agent Response ---');
    console.log(finalResponse.response.content);
    console.log('---------------------------');
    console.log(`Total Processing Time: ${duration}ms`);
    console.log(`Final Status: ${finalResponse.metadata.status}`);
    if (finalResponse.metadata.error) {
      console.error(`Error during processing: ${finalResponse.metadata.error}`);
    }

  } catch (error) {
    console.error('\n--- An unexpected error occurred ---');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main();