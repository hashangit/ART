import {
  createArtInstance,
  PESAgent,
  CalculatorTool,
  AgentProps,
  AgentFinalResponse,
  ThreadConfig, // Keep one ThreadConfig import
  ArtInstance, // Import ArtInstance type
  generateUUID, // Import a UUID generator
  StreamEvent, // <-- Import StreamEvent
  Observation // <-- Import Observation type
  // LLMMetadata, // Removed unused import
  // ExecutionMetadata // Removed unused import
} from 'art-framework';
import dotenv from 'dotenv';
// import * as readline from 'node:readline/promises'; // Removed readline
// import { stdin as input, stdout as output } from 'node:process'; // Removed process
import yargs from 'yargs'; // Correct yargs import path
import { hideBin } from 'yargs/helpers'; // Correct yargs import path

// Load environment variables from .env file
dotenv.config();

// --- Global ART Instance (Removed - Scoped within startApp now) ---
// let art: ArtInstance;

// --- ART Initialization Function (Modified) ---
async function initializeART(provider: 'openai' | 'gemini'): Promise<ArtInstance> {
  console.log(`ART Sample App - Initializing ART Instance for provider: ${provider}...`);

  let apiKey: string | undefined;
  let reasoningConfig: any;

  if (provider === 'gemini') {
    apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY not found in environment variables.');
      process.exit(1);
    }
    reasoningConfig = { provider: 'gemini', apiKey: apiKey };
  } else if (provider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Error: OPENAI_API_KEY not found in environment variables.');
      process.exit(1);
    }
    reasoningConfig = { provider: 'openai', apiKey: apiKey };
  } else {
     console.error(`Unsupported provider: ${provider}`);
     process.exit(1);
  }


  try {
    const instance = await createArtInstance({
      agentCore: PESAgent,
      storage: {
        type: 'memory' // Using InMemoryStorageAdapter
      },
      reasoning: reasoningConfig,
      tools: [new CalculatorTool()],
    });
    console.log(`ART Instance Initialized Successfully for ${provider}.`);
    return instance;
  } catch (error) {
    console.error(`\n--- Failed to initialize ART Instance for ${provider} ---`);
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

// --- Function to Display Final Response (Enhanced) ---
function displayFinalResponse(finalResponse: AgentFinalResponse, duration: number, streaming: boolean) {
    console.log('\n--- Final Agent Response ---');
    // If not streaming, print the final content. If streaming, it was printed incrementally.
    if (!streaming) {
        console.log(finalResponse.response.content);
    } else {
        console.log("(Content streamed above)");
    }
    console.log('---------------------------');
    console.log(`Total Processing Time: ${duration}ms`);
    console.log(`Final Status: ${finalResponse.metadata.status}`);
    // Display aggregated LLM metadata
    if (finalResponse.metadata.llmMetadata) {
        console.log('Aggregated LLM Metadata:');
        console.log(`- Input Tokens: ${finalResponse.metadata.llmMetadata.inputTokens ?? 'N/A'}`);
        console.log(`- Output Tokens: ${finalResponse.metadata.llmMetadata.outputTokens ?? 'N/A'}`);
        console.log(`- Thinking Tokens: ${finalResponse.metadata.llmMetadata.thinkingTokens ?? 'N/A'}`);
        console.log(`- Time to First Token: ${finalResponse.metadata.llmMetadata.timeToFirstTokenMs ?? 'N/A'}ms`);
        console.log(`- Total Generation Time: ${finalResponse.metadata.llmMetadata.totalGenerationTimeMs ?? 'N/A'}ms`);
        console.log(`- Stop Reason: ${finalResponse.metadata.llmMetadata.stopReason ?? 'N/A'}`);
    }
    if (finalResponse.metadata.error) {
      console.error(`Error during processing: ${finalResponse.metadata.error}`);
    }
     console.log('---------------------------');
}

// --- Enhanced Stream Event Handler ---
function handleStreamEvent(event: StreamEvent, threadId: string) {
    // Ensure event is for the correct thread (optional, good practice if handling multiple threads)
    if (event.threadId !== threadId) return;

    switch (event.type) {
        case 'TOKEN': { // Wrap case block
            // Print token directly, indicating type
            const typeLabel = event.tokenType ? `[${event.tokenType}]` : '[TOKEN]';
            process.stdout.write(`${typeLabel} ${event.data}`); // Show type before token
            break;
        }
        case 'METADATA':
            // Log metadata clearly
            console.log(`\n\n--- [STREAM METADATA | ${threadId} | ${event.traceId}] ---`);
            console.log(`Input Tokens: ${event.data.inputTokens ?? 'N/A'}`);
            console.log(`Output Tokens: ${event.data.outputTokens ?? 'N/A'}`);
            console.log(`Thinking Tokens: ${event.data.thinkingTokens ?? 'N/A'}`);
            console.log(`Time to First Token: ${event.data.timeToFirstTokenMs ?? 'N/A'}ms`);
            console.log(`Total Generation Time: ${event.data.totalGenerationTimeMs ?? 'N/A'}ms`);
            console.log(`Stop Reason: ${event.data.stopReason ?? 'N/A'}`);
            console.log(`Raw Usage: ${JSON.stringify(event.data.providerRawUsage) ?? 'N/A'}`);
            console.log('-------------------------------------------\n');
            break;
        case 'ERROR':
            // Log error clearly
            console.error(`\n\n--- [STREAM ERROR | ${threadId} | ${event.traceId}] ---`);
            console.error(event.data?.message || JSON.stringify(event.data));
            if (event.data?.stack) console.error(event.data.stack);
            console.error('-------------------------------------------\n');
            break;
        case 'END':
            // Indicate stream end clearly
            process.stdout.write(`\n--- [STREAM END | ${threadId} | ${event.traceId}] ---\n`);
            break;
    }
}


// --- Removed old processSingleQuery and runInteractiveMode functions ---

// --- Main Execution Logic (Using yargs) ---
async function startApp() {

  const argv = await yargs(hideBin(process.argv))
    .option('provider', {
      alias: 'p',
      type: 'string',
      description: 'LLM provider to use',
      choices: ['openai', 'gemini'],
      default: 'gemini',
    })
    .option('stream', {
      alias: 's',
      type: 'boolean',
      description: 'Enable streaming response',
      default: false,
    })
    .option('query', {
      alias: 'q',
      type: 'string',
      description: 'The query to process',
      demandOption: true, // Make query mandatory
    })
    .option('thread', {
        alias: 't',
        type: 'string',
        description: 'Optional thread ID to continue a conversation',
    })
    .help()
    .alias('help', 'h')
    .parseAsync(); // Use parseAsync

  // Type assertion for argv
  const args = argv as {
      provider: 'openai' | 'gemini';
      stream: boolean;
      query: string;
      thread?: string;
      [key: string]: unknown; // Allow other properties from yargs
  };


  const { provider, stream, query } = args;
  const threadId = args.thread || `cli-thread-${generateUUID()}`; // Use provided or generate new

  console.log(`Using Provider: ${provider}`);
  console.log(`Streaming Enabled: ${stream}`);
  console.log(`Thread ID: ${threadId}`);
  console.log(`Query: "${query}"`);

  // Initialize ART with selected provider
  const art = await initializeART(provider);

  // --- Default Thread Configuration (Dynamic Provider) ---
  const threadConfig: ThreadConfig = {
    reasoning: {
      provider: provider, // Use selected provider
      model: provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-flash-latest', // Example model selection
    },
    enabledTools: [CalculatorTool.toolName],
    historyLimit: 20,
    systemPrompt: "You are a helpful assistant. Use the calculator tool for any math calculations.",
  };

  // Set config for this thread
  try {
    await art.stateManager.setThreadConfig(threadId, threadConfig);
    console.log(`Configuration set for thread: ${threadId}`);
  } catch (configError) {
     console.error(`Error setting thread config: ${configError}`);
     process.exit(1);
  }

  const agentProps: AgentProps = {
    query: query,
    threadId: threadId,
  };

  // Subscribe to Observations
  const observationSocket = art.uiSystem.getObservationSocket();
  const unsubObservation = observationSocket.subscribe(
    (observation: Observation) => logObservation(observation, threadId), // Use imported Observation type
    undefined, // No type filter
    { threadId: threadId }
  );

  // Subscribe to LLM Stream Events if streaming enabled
  let unsubLlmStream: (() => void) | null = null;
  if (stream) {
      const llmStreamSocket = art.uiSystem.getLLMStreamSocket();
      unsubLlmStream = llmStreamSocket.subscribe(
          (event: StreamEvent) => handleStreamEvent(event, threadId), // Added type
          undefined, // No type filter
          { threadId: threadId }
      );
      console.log('Subscribed to LLM stream events.');
  }

  console.log('Processing query...');
  const startTime = Date.now();
  try {
    const finalResponse: AgentFinalResponse = await art.process(agentProps);
    const duration = Date.now() - startTime;

    // Unsubscribe
    unsubObservation();
    if (unsubLlmStream) unsubLlmStream();

    displayFinalResponse(finalResponse, duration, stream);

  } catch (error) {
    // Unsubscribe even on error
    unsubObservation();
    if (unsubLlmStream) unsubLlmStream();

    console.error('\n--- An unexpected error occurred during processing ---');
    console.error(error);
    process.exit(1);
  }
}

// Run the application
startApp().catch(err => {
  console.error("Application failed to start or run:", err);
  process.exit(1);
});