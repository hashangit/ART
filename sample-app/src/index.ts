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
  ToolSchema,
  ObservationType,
  // --- New Imports based on Multi-Provider Update ---
  ProviderManagerConfig,
  AvailableProviderEntry,
  RuntimeProviderConfig,
  OpenAIAdapter, // Import Adapter Class
  GeminiAdapter, // Import Adapter Class
  // --- End New Imports ---
} from 'art-framework';
import dotenv from 'dotenv';
import path from 'path';
import inquirer from 'inquirer';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// --- Configuration ---
const AVAILABLE_PROVIDERS = ['gemini', 'openai'] as const;
type ProviderChoice = (typeof AVAILABLE_PROVIDERS)[number];
const AVAILABLE_TOOLS: ToolSchema[] = [new CalculatorTool().schema];

// --- Load Environment Variables ---
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });
console.log(`[Sample App] Attempting to load .env from: ${envPath}`);

// --- ART Initialization Function (Updated for Multi-Provider) ---
async function initializeART(): Promise<ArtInstance> {
  console.log(`\nART Sample App - Initializing ART Instance with Multi-Provider Support...`);

  // Define available providers for the ProviderManager
  const availableProviders: AvailableProviderEntry[] = [
    {
      name: 'gemini',
      adapter: GeminiAdapter, // Pass the class constructor
      // isLocal: false, // Default is false
    },
    {
      name: 'openai',
      adapter: OpenAIAdapter, // Pass the class constructor
      // isLocal: false, // Default is false
    },
    // Add other providers here if needed, e.g., AnthropicAdapter, OllamaAdapter
  ];

  // Configure the ProviderManager
  const providerManagerConfig: ProviderManagerConfig = {
    availableProviders: availableProviders,
    maxParallelApiInstancesPerProvider: 3, // Example limit
    apiInstanceIdleTimeoutSeconds: 180, // Example timeout
  };

  try {
    // Create the ART instance with the ProviderManager configuration
    const instance = await createArtInstance({
      storage: { type: 'memory' }, // Keep using memory storage for simplicity
      providers: providerManagerConfig, // Pass the ProviderManager config
      tools: [new CalculatorTool()], // Tools available to the instance
    });
    console.log(`ART Instance Initialized Successfully with available providers: ${availableProviders.map(p => p.name).join(', ')}.`);
    return instance;
  } catch (error) {
    console.error(`\n--- Failed to initialize ART Instance ---`);
    console.error(error);
    process.exit(1);
  }
}

// --- Interactive Setup Function (Unchanged) ---
async function setupSession(): Promise<{
  // provider: ProviderChoice; // Removed provider from initial setup
  stream: boolean;
  enabledToolNames: string[];
}> {
  console.log('Welcome to the Interactive ART CLI!');
  console.log('Let\'s configure your session.');

  const answers = await inquirer.prompt([
    // Removed provider selection prompt
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
      default: [],
    },
  ]);

  return answers as {
    // provider: ProviderChoice; // Removed provider
    stream: boolean;
    enabledToolNames: string[];
  };
}

// --- State Variables for Capturing Observations (scoped for runSession) ---
let currentIntent: any | null = null;
let currentPlan: any | null = null;

// --- Function to Log Observations (Unchanged) ---
// (Keep the existing logObservation function as it filters by threadId and traceId correctly)
let currentTraceId: string | null = null; // Moved currentTraceId definition here
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
          console.log(`Phase: ${observation.content?.phase ?? 'N/A'}`); // Added null check for content
          break;
      case ObservationType.LLM_STREAM_METADATA: // Use Enum
          console.log(`Phase: ${observation.metadata?.phase}, Stop Reason: ${observation.content?.stopReason}, Tokens: ${observation.content?.outputTokens}`); // Added null check for content
          break;
      case ObservationType.FINAL_RESPONSE: // Use Enum
          console.log(`Final Message ID: ${observation.content?.message?.messageId}`); // Added null check for content/message
          break;
      default:
          // Fallback for any other types
          console.log(JSON.stringify(observation.content, null, 2));
  }
}


// --- Enhanced Stream Event Handler (Unchanged) ---
// (Keep the existing handleStreamEvent function as it filters by traceId correctly)
function handleStreamEvent(event: StreamEvent) {
  // Filter stream events for the specific traceId being processed
  if (!currentTraceId || event.traceId !== currentTraceId) return;

  switch (event.type) {
    case 'TOKEN': {
      const typeLabel = event.tokenType ? `[${event.tokenType}]` : ''; // Make label less verbose
      // Handle potential structured content (like tool calls in Anthropic)
      if (typeof event.data === 'string') {
          process.stdout.write(`${typeLabel}${event.data}`); // Show type before token
      } else {
          // Log structured data differently if needed
          process.stdout.write(`${typeLabel}[Structured Data]: ${JSON.stringify(event.data)} `);
      }
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


// --- Function to Display Final Response (Unchanged) ---
// (Keep the existing displayFinalResponse function)
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
      // Handle potential structured content in final response
      if (typeof finalResponse.response.content === 'string') {
          console.log(finalResponse.response.content); // Print final content only if not streamed
      } else {
          console.log(JSON.stringify(finalResponse.response.content, null, 2));
      }
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


// --- Main Interactive Session Logic (Updated for Multi-Provider) ---
async function runSession() {
  // 1. Setup Session Configuration (Get user preferences)
  const { /* provider, */ stream, enabledToolNames } = await setupSession(); // Removed provider
  const threadId = `interactive-thread-${generateUUID()}`;

  console.log('\n--- Session Configuration ---');
  // console.log(`Selected Provider: ${provider}`); // Removed initial provider log
  console.log(`Streaming: ${stream}`);
  console.log(`Enabled Tools: ${enabledToolNames.join(', ') || 'None'}`);
  console.log(`Thread ID: ${threadId}`);
  console.log('---------------------------\n');

  // 2. Initialize ART (Now initializes with all available providers)
  const art = await initializeART();

  // 3. Prepare base Thread Configuration (without provider initially)
  const baseThreadConfig: Omit<ThreadConfig, 'providerConfig'> = { // Type ensures providerConfig is handled later
    enabledTools: enabledToolNames,
    historyLimit: 20,
  };
  console.log(`Base configuration prepared for thread: ${threadId}`);
  // We will set the full ThreadConfig including provider inside the loop

  // 4. Setup Persistent Subscriptions for the Session (Unchanged logic)
  const observationSocket = art.uiSystem.getObservationSocket();
  const unsubObservation = observationSocket.subscribe(
    (observation: Observation) => logObservation(observation, threadId)
  );
  console.log('Subscribed to observations.');

  let unsubLlmStream: (() => void) | null = null;
  if (stream) {
    const llmStreamSocket = art.uiSystem.getLLMStreamSocket();
    unsubLlmStream = llmStreamSocket.subscribe(
        (event: StreamEvent) => handleStreamEvent(event)
    );
    console.log('Subscribed to LLM stream events.');
  }

  // 5. Start Interactive Loop (Logic updated for runtime provider selection)
  const rl = readline.createInterface({ input, output });
  console.log('\nEnter "/bye" or "/exit" to quit.');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // --- Ask for Provider for this query using readline ---
    let provider: ProviderChoice | null = null;
    while (!provider) {
      const providerInput = await rl.question(`Select provider (${AVAILABLE_PROVIDERS.join('/')}): `);
      if (AVAILABLE_PROVIDERS.includes(providerInput as ProviderChoice)) {
        provider = providerInput as ProviderChoice;
      } else if (providerInput.toLowerCase() === '/bye' || providerInput.toLowerCase() === '/exit') {
        // Allow exiting during provider selection
        console.log('\nExiting session. Goodbye!');
        rl.close();
        unsubObservation();
        if (unsubLlmStream) unsubLlmStream();
        // Optionally add art.shutdown() if implemented
        return; // Exit the runSession function
      } else {
        console.log(`Invalid provider. Please choose from: ${AVAILABLE_PROVIDERS.join(', ')}`);
      }
    }

    // --- Prepare Runtime Provider Config ---
    let apiKey: string | undefined;
    if (provider === 'gemini') {
      apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Error: GEMINI_API_KEY not found in environment variables.');
        continue; // Ask for provider again
      }
    } else if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('Error: OPENAI_API_KEY not found in environment variables.');
        continue; // Ask for provider again
      }
    } else {
      // Should not happen with inquirer list, but good practice
      console.error(`Unsupported provider selected: ${provider}`);
      continue;
    }

    const runtimeProviderConfig: RuntimeProviderConfig = {
      providerName: provider,
      modelId: provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-flash-latest',
      adapterOptions: { apiKey: apiKey }
    };

    // --- Set Full Thread Config for this query ---
    const threadConfig: ThreadConfig = {
      ...baseThreadConfig, // Combine base config with runtime provider
      providerConfig: runtimeProviderConfig,
    };

    try {
      await art.stateManager.setThreadConfig(threadId, threadConfig);
      console.log(`Configuration updated for thread ${threadId} (Using ${provider})`);
    } catch (configError) {
      console.error(`Error setting thread config: ${configError}`);
      continue; // Skip to next iteration
    }

    // --- Ask for User Query ---
    const query = await rl.question(`> [${provider}] Enter query: `);

    if (query.toLowerCase() === '/bye' || query.toLowerCase() === '/exit') {
      break; // Exit loop
    }

    if (!query.trim()) {
      continue; // Skip empty input
    }

    // --- Process Query ---
    currentTraceId = `interactive-trace-${generateUUID()}`; // Set traceId for this query
    currentIntent = null; // Reset captures for the new query
    currentPlan = null;
    console.log(`\nProcessing (Provider: ${provider}, Trace: ${currentTraceId.substring(0, 8)})...`);

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
      displayFinalResponse(finalResponse, duration, stream, query, currentIntent, currentPlan);
    } catch (error) {
      console.error('\n--- An unexpected error occurred during processing ---');
      console.error(error);
    } finally {
        currentTraceId = null; // Clear traceId after processing
    }
    console.log('\nEnter "/bye" or "/exit" to quit.'); // Prompt again
  }

  // 6. Cleanup (Unchanged logic)
  console.log('\nExiting session. Goodbye!');
  rl.close();
  unsubObservation();
  if (unsubLlmStream) unsubLlmStream();
  // Optionally add art.shutdown() if implemented in the framework
}

// --- Run the Application ---
runSession().catch(err => {
  console.error("Application failed to start or run:", err);
  process.exit(1);
});
