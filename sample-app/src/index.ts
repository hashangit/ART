import {
  createArtInstance,
  PESAgent,
  CalculatorTool,
  AgentProps,
  AgentFinalResponse,
  ThreadConfig,
  ArtInstance, // Import ArtInstance type
  generateUUID // Import a UUID generator
} from 'art-framework';
import dotenv from 'dotenv';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// Load environment variables from .env file
dotenv.config();

// --- Global ART Instance ---
let art: ArtInstance;

// --- Default Thread Configuration (shared by both modes) ---
const defaultThreadConfig: ThreadConfig = {
  reasoning: {
    provider: 'gemini',
    model: 'gemini-2.0-flash-lite', // Use a consistent, recent model
  },
  enabledTools: [CalculatorTool.toolName],
  historyLimit: 20, // Allow for more history turns
  systemPrompt: "You are a helpful assistant. Use the calculator tool for any math calculations.",
};

// --- ART Initialization Function ---
async function initializeART(): Promise<ArtInstance> {
  console.log('ART Sample App - Initializing ART Instance...');
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('Error: GEMINI_API_KEY not found in environment variables.');
    console.error('Please create a .env file in the sample-app directory with your key:');
    console.error('GEMINI_API_KEY=YOUR_API_KEY_HERE');
    process.exit(1);
  }

  try {
    const instance = await createArtInstance({
      agentCore: PESAgent,
      storage: {
        type: 'memory' // Using InMemoryStorageAdapter
      },
      reasoning: {
        provider: 'gemini', // Using GeminiReasoningAdapter
        apiKey: geminiApiKey,
      },
      tools: [new CalculatorTool()],
    });
    console.log('ART Instance Initialized Successfully.');
    return instance;
  } catch (error) {
    console.error('\n--- Failed to initialize ART Instance ---');
    console.error(error);
    process.exit(1); // Exit if initialization fails
  }
}

// --- Function to Log Observations (used by both modes) ---
function logObservation(observation: any, threadId: string) {
    console.log(`\n[OBSERVATION - ${threadId} - ${observation.type}]`);
    // Log specific details based on type (same as original)
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
}

// --- Function to Display Final Response (used by both modes) ---
function displayFinalResponse(finalResponse: AgentFinalResponse, duration: number) {
    console.log('\n--- Final Agent Response ---');
    console.log(finalResponse.response.content);
    console.log('---------------------------');
    console.log(`Total Processing Time: ${duration}ms`);
    console.log(`Final Status: ${finalResponse.metadata.status}`);
    if (finalResponse.metadata.error) {
      console.error(`Error during processing: ${finalResponse.metadata.error}`);
       // Highlight potential persistence issue
       if (finalResponse.metadata.status === 'error') {
           console.error(">>> POTENTIAL PERSISTENCE ISSUE DETECTED: 'error' status on subsequent request. <<<");
       }
    }
     console.log('---------------------------');
}


// --- Mode 1: Process Single Query from Arguments ---
async function processSingleQuery(artInstance: ArtInstance, query: string) {
  console.log(`Processing single query: "${query}"`);
  const threadId = 'cli-single-query-thread'; // Static thread ID for single queries

  // Set config for this thread
  try {
    await artInstance.stateManager.setThreadConfig(threadId, defaultThreadConfig);
    console.log(`Default configuration set for thread: ${threadId}`);
  } catch (configError) {
     console.error(`Error setting default thread config: ${configError}`);
     process.exit(1);
  }

  const agentProps: AgentProps = {
    query: query,
    threadId: threadId,
  };

  // Subscribe to Observations
  const observationSocket = artInstance.uiSystem.getObservationSocket();
  const unsubscribe = observationSocket.subscribe(
    (observation) => logObservation(observation, threadId),
    undefined,
    { threadId: threadId }
  );

  console.log('Subscribed to observations. Processing query...');
  const startTime = Date.now();
  try {
    const finalResponse: AgentFinalResponse = await artInstance.process(agentProps);
    const duration = Date.now() - startTime;
    unsubscribe();
    displayFinalResponse(finalResponse, duration);
  } catch (error) {
    unsubscribe();
    console.error('\n--- An unexpected error occurred during single query processing ---');
    console.error(error);
    process.exit(1);
  }
}

// --- Mode 2: Run Interactive CLI Session ---
async function runInteractiveMode(artInstance: ArtInstance) {
  const rl = readline.createInterface({ input, output });
  const threadId = `interactive-${generateUUID()}`; // Unique thread for the session

  console.log(`\nStarting interactive session.`);
  console.log(`Using Thread ID: ${threadId}`);
  console.log(`Type 'exit' or 'quit' to end the session.`);

  // Set default config for the session thread
  try {
    await artInstance.stateManager.setThreadConfig(threadId, defaultThreadConfig);
    console.log(`Default configuration set for thread: ${threadId}`);
  } catch (configError) {
     console.error(`Error setting default thread config: ${configError}`);
     rl.close();
     process.exit(1);
  }

  // Subscribe to Observations for the session
  const observationSocket = artInstance.uiSystem.getObservationSocket();
  const unsubscribe = observationSocket.subscribe(
    (observation) => logObservation(observation, threadId),
    undefined,
    { threadId: threadId }
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = await rl.question('\nYou: ');

    if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
      break; // Exit the loop
    }

    if (!query.trim()) {
      continue; // Skip empty input
    }

    const agentProps: AgentProps = {
      query: query,
      threadId: threadId, // Use the same threadId for all turns
    };

    try {
      console.log('Assistant thinking...'); // Indicate processing
      const startTime = Date.now();
      const finalResponse: AgentFinalResponse = await artInstance.process(agentProps);
      const duration = Date.now() - startTime;
      // Display slightly differently for interactive mode
      console.log(`\nAssistant: ${finalResponse.response.content}`);
      console.log(`(Status: ${finalResponse.metadata.status}, Time: ${duration}ms)`);
       if (finalResponse.metadata.error) {
         console.error(`Assistant Error: ${finalResponse.metadata.error}`);
         if (finalResponse.metadata.status === 'error') {
             console.error(">>> POTENTIAL PERSISTENCE ISSUE DETECTED: 'error' status on subsequent request. <<<");
         }
       }

    } catch (error) {
      console.error('\n--- Unexpected error during interactive processing ---');
      console.error(error);
      // Continue loop unless it's a fatal error
    }
  }

  // Cleanup
  unsubscribe();
  rl.close();
  console.log('\nInteractive session ended. Conversation history (in memory) is lost.');
}

// --- Main Execution Logic ---
async function startApp() {
  art = await initializeART(); // Initialize ART globally

  const args = process.argv.slice(2); // Get command line arguments

  if (args.length > 0) {
    // Arguments provided: Run single query mode
    const query = args.join(' ');
    await processSingleQuery(art, query);
  } else {
    // No arguments: Run interactive mode
    await runInteractiveMode(art);
  }
}

// Run the application
startApp();