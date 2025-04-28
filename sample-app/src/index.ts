import {
  createArtInstance,
  CalculatorTool,
  AgentProps,
  AgentFinalResponse,
  ThreadConfig,
  ArtInstance,
  generateUUID,
  StreamEvent,
  Observation,
  ToolSchema, // Import ToolSchema
  ObservationType // Import ObservationType enum
} from 'art-framework';
import dotenv from 'dotenv';
import path from 'path';
import inquirer from 'inquirer'; // <-- Import inquirer
import * as readline from 'node:readline/promises'; // <-- Import readline/promises
import { stdin as input, stdout as output } from 'node:process'; // <-- Import process streams

// --- Configuration ---
const AVAILABLE_PROVIDERS = ['gemini', 'openai'] as const;
type ProviderChoice = (typeof AVAILABLE_PROVIDERS)[number];
const AVAILABLE_TOOLS: ToolSchema[] = [new CalculatorTool().schema]; // Corrected: Use .schema property

// --- Load Environment Variables ---
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });
console.log(`[Sample App] Attempting to load .env from: ${envPath}`);

// --- ART Initialization Function (Mostly Unchanged) ---
async function initializeART(provider: ProviderChoice): Promise<ArtInstance> {
  console.log(`\nART Sample App - Initializing ART Instance for provider: ${provider}...`);

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
      storage: { type: 'memory' },
      reasoning: reasoningConfig,
      tools: [new CalculatorTool()], // Instantiate tools needed by the instance
    });
    console.log(`ART Instance Initialized Successfully for ${provider}.`);
    return instance;
  } catch (error) {
    console.error(`\n--- Failed to initialize ART Instance for ${provider} ---`);
    console.error(error);
    process.exit(1);
  }
}

// --- Interactive Setup Function ---
async function setupSession(): Promise<{
  provider: ProviderChoice;
  stream: boolean;
  enabledToolNames: string[];
}> {
  console.log('Welcome to the Interactive ART CLI!');
  console.log('Let\'s configure your session.');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select the LLM provider:',
      choices: AVAILABLE_PROVIDERS,
      default: 'gemini',
    },
    {
      type: 'confirm',
      name: 'stream',
      message: 'Enable streaming response?',
      default: false,
    },
    {
      type: 'checkbox',
      name: 'enabledToolNames',
      message: 'Select tools to enable for this session:',
      choices: AVAILABLE_TOOLS.map(tool => ({
        name: `${tool.name} - ${tool.description}`,
        value: tool.name,
      })),
      default: [], // Default to no tools selected
    },
  ]);

  return answers as {
    provider: ProviderChoice;
    stream: boolean;
    enabledToolNames: string[];
  };
}

// --- State Variables for Capturing Observations (scoped for runSession) ---
let currentIntent: any | null = null;
let currentPlan: any | null = null;

// --- Function to Log Observations (Filter by Thread and Capture Intent/Plan) ---
function logObservation(observation: Observation, expectedThreadId: string) {
  if (observation.threadId !== expectedThreadId) return; // Filter by thread first

  // Capture relevant observations if they match the current traceId
  if (currentTraceId && observation.traceId === currentTraceId) {
      if (observation.type === ObservationType.INTENT) { // Use Enum
          currentIntent = observation.content; // Update the variable in the outer scope
      } else if (observation.type === ObservationType.PLAN) { // Use Enum
          currentPlan = observation.content; // Update the variable in the outer scope
      }
  }

  // --- Logging Logic ---
  console.log(`\n[OBSERVATION - ${observation.type} - Trace: ${observation.traceId?.substring(0, 8) ?? 'N/A'}]`);
  // Handle specific types for better logging
  switch (observation.type) {
      case ObservationType.INTENT:
      case ObservationType.PLAN:
      case ObservationType.THOUGHTS:
      case ObservationType.SYNTHESIS:
          // Stringify if it's an object for consistent logging, otherwise print directly
          console.log(typeof observation.content === 'string' ? observation.content : JSON.stringify(observation.content, null, 2));
          break;
      case ObservationType.TOOL_CALL: // Use Enum
          console.log(`Tool Call: ${observation.content.toolName}`);
          console.log(`Input: ${JSON.stringify(observation.content.toolInput)}`);
          break;
      case ObservationType.TOOL_EXECUTION: // Use Enum
          console.log(`Tool Execution Result for ${observation.metadata?.toolName}:`);
          if (observation.content?.output) console.log(`Output: ${JSON.stringify(observation.content.output)}`);
          if (observation.content?.error) console.error(`Error: ${observation.content.error}`);
          break;
      case ObservationType.ERROR: // Use Enum
          console.error(`Agent Error: ${observation.content.message || JSON.stringify(observation.content)}`);
          break;
      case ObservationType.LLM_STREAM_START: // Use Enum
      case ObservationType.LLM_STREAM_END: // Use Enum
          console.log(`Phase: ${observation.content.phase}`);
          break;
      case ObservationType.LLM_STREAM_METADATA: // Use Enum
          console.log(`Phase: ${observation.metadata?.phase}, Stop Reason: ${observation.content.stopReason}, Tokens: ${observation.content.outputTokens}`);
          break;
      case ObservationType.FINAL_RESPONSE: // Use Enum
          console.log(`Final Message ID: ${observation.content.message.messageId}`);
          break;
      default:
          // Fallback for any other types
          console.log(JSON.stringify(observation.content, null, 2));
  }
}

// --- Enhanced Stream Event Handler (Filter by Trace) ---
// Keep track of the current trace ID being processed
let currentTraceId: string | null = null;
// Removed unused expectedThreadId parameter
function handleStreamEvent(event: StreamEvent) {
  // Filter stream events for the specific traceId being processed
  if (!currentTraceId || event.traceId !== currentTraceId) return;

  switch (event.type) {
    case 'TOKEN': {
      const typeLabel = event.tokenType ? `[${event.tokenType}]` : ''; // Make label less verbose
      process.stdout.write(`${typeLabel}${event.data}`); // Show type before token
      break;
    }
    case 'METADATA':
      console.log(`\n\n--- [STREAM METADATA | Trace: ${event.traceId.substring(0, 8)}] ---`);
      console.log(`Stop Reason: ${event.data.stopReason ?? 'N/A'}`);
      console.log(`Input Tokens: ${event.data.inputTokens ?? 'N/A'}`);
      console.log(`Output Tokens: ${event.data.outputTokens ?? 'N/A'}`);
      if (event.data.thinkingTokens) {
        console.log(`Thinking Tokens: ${event.data.thinkingTokens}`);
      }
      console.log(`TTFT: ${event.data.timeToFirstTokenMs ?? 'N/A'}ms`);
      console.log(`TGT: ${event.data.totalGenerationTimeMs ?? 'N/A'}ms`);
      console.log('-------------------------------------------\n');
      break;
    case 'ERROR':
      console.error(`\n\n--- [STREAM ERROR | Trace: ${event.traceId.substring(0, 8)}] ---`);
      console.error(event.data?.message || JSON.stringify(event.data));
      if (event.data?.stack) console.error(event.data.stack);
      console.error('-------------------------------------------\n');
      break;
    case 'END':
      process.stdout.write(`\n--- [STREAM END | Trace: ${event.traceId.substring(0, 8)}] ---\n`);
      break;
  }
}

// --- Function to Display Final Response (with Summary) ---
function displayFinalResponse(
    finalResponse: AgentFinalResponse,
    duration: number,
    streaming: boolean,
    originalQuery: string, // Added parameter
    intentContent: any | null, // Added parameter
    planContent: any | null    // Added parameter
) {
  // --- Summary Section ---
  console.log('\n--- Execution Summary ---');
  console.log(`Query: ${originalQuery}`);
  // Pretty print if object, otherwise print directly
  console.log(`Intent: ${intentContent ? (typeof intentContent === 'string' ? intentContent : JSON.stringify(intentContent, null, 2)) : 'N/A'}`);
  console.log(`Plan: ${planContent ? (typeof planContent === 'string' ? planContent : JSON.stringify(planContent, null, 2)) : 'N/A'}`);
  console.log('---');
  console.log(`Final Response:`);
  if (!streaming) {
    console.log(finalResponse.response.content); // Print final content only if not streamed
  } else {
    console.log("(Content streamed above)");
  }
  console.log('---------------------------');

  // --- Metadata Section ---
  console.log('--- Execution Metadata ---'); // Added header for clarity
  console.log(`Trace ID: ${finalResponse.metadata.traceId}`);
  console.log(`Total Processing Time: ${duration}ms`);
  console.log(`Final Status: ${finalResponse.metadata.status}`);
  if (finalResponse.metadata.llmMetadata) {
    console.log('Aggregated LLM Metadata:');
    console.log(`- Input Tokens: ${finalResponse.metadata.llmMetadata.inputTokens ?? 'N/A'}`);
    console.log(`- Output Tokens: ${finalResponse.metadata.llmMetadata.outputTokens ?? 'N/A'}`);
    if (finalResponse.metadata.llmMetadata.thinkingTokens) {
      console.log(`- Thinking Tokens: ${finalResponse.metadata.llmMetadata.thinkingTokens}`);
    }
    console.log(`- TTFT: ${finalResponse.metadata.llmMetadata.timeToFirstTokenMs ?? 'N/A'}ms`);
    console.log(`- TGT: ${finalResponse.metadata.llmMetadata.totalGenerationTimeMs ?? 'N/A'}ms`);
    console.log(`- Stop Reason: ${finalResponse.metadata.llmMetadata.stopReason ?? 'N/A'}`);
  }
  if (finalResponse.metadata.error) {
    console.error(`Error during processing: ${finalResponse.metadata.error}`);
  }
  console.log('---------------------------');
}

// --- Main Interactive Session Logic ---
async function runSession() {
  // 1. Setup Session Configuration
  const { provider, stream, enabledToolNames } = await setupSession();
  const threadId = `interactive-thread-${generateUUID()}`;

  console.log('\n--- Session Configuration ---');
  console.log(`Provider: ${provider}`);
  console.log(`Streaming: ${stream}`);
  console.log(`Enabled Tools: ${enabledToolNames.join(', ') || 'None'}`);
  console.log(`Thread ID: ${threadId}`);
  console.log('---------------------------\n');

  // 2. Initialize ART
  const art = await initializeART(provider);

  // 3. Set Thread Configuration
  const threadConfig: ThreadConfig = {
    reasoning: {
      provider: provider,
      model: provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-flash-latest', // Example model selection
    },
    enabledTools: enabledToolNames, // Use selected tools
    historyLimit: 20,
    systemPrompt: "You are a helpful assistant. Use tools when necessary.",
  };
  try {
    await art.stateManager.setThreadConfig(threadId, threadConfig);
    console.log(`Configuration set for thread: ${threadId}`);
  } catch (configError) {
    console.error(`Error setting thread config: ${configError}`);
    process.exit(1);
  }

  // 4. Setup Persistent Subscriptions for the Session
  const observationSocket = art.uiSystem.getObservationSocket();
  // Note: logObservation now updates currentIntent/currentPlan based on currentTraceId
  const unsubObservation = observationSocket.subscribe(
    (observation: Observation) => logObservation(observation, threadId)
  );
  console.log('Subscribed to observations.');

  let unsubLlmStream: (() => void) | null = null;
  if (stream) {
    const llmStreamSocket = art.uiSystem.getLLMStreamSocket();
    // Note: Filtering by traceId happens inside handleStreamEvent using currentTraceId
    unsubLlmStream = llmStreamSocket.subscribe(
        (event: StreamEvent) => handleStreamEvent(event) // Removed threadId argument
    );
    console.log('Subscribed to LLM stream events.');
  }

  // 5. Start Interactive Loop
  const rl = readline.createInterface({ input, output });
  console.log('\nEnter your query or type "/bye" to exit.');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = await rl.question('> ');

    if (query.toLowerCase() === '/bye' || query.toLowerCase() === '/exit') {
      break; // Exit loop
    }

    if (!query.trim()) {
      continue; // Skip empty input
    }

    currentTraceId = `interactive-trace-${generateUUID()}`; // Set traceId for this query
    currentIntent = null; // Reset captures for the new query
    currentPlan = null;
    console.log(`\nProcessing (Trace: ${currentTraceId.substring(0, 8)})...`);

    const agentProps: AgentProps = {
      query: query,
      threadId: threadId,
      traceId: currentTraceId,
      options: { stream: stream },
    };

    const startTime = Date.now();
    try {
      const finalResponse: AgentFinalResponse = await art.process(agentProps);
      const duration = Date.now() - startTime;
      // Pass captured data to display function
      displayFinalResponse(finalResponse, duration, stream, query, currentIntent, currentPlan);
    } catch (error) {
      console.error('\n--- An unexpected error occurred during processing ---');
      console.error(error);
      // Continue the loop
    } finally {
        currentTraceId = null; // Clear traceId after processing
    }
    console.log('\nEnter your query or type "/bye" to exit.'); // Prompt again
  }

  // 6. Cleanup
  console.log('\nExiting session. Goodbye!');
  rl.close();
  unsubObservation();
  if (unsubLlmStream) unsubLlmStream();
  // Optionally add art.shutdown() if implemented
}

// --- Run the Application ---
runSession().catch(err => {
  console.error("Application failed to start or run:", err);
  process.exit(1);
});