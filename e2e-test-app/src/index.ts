import 'fake-indexeddb/auto'; // Import fake-indexeddb FIRST to patch global indexedDB
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import http from 'http'; // Import http module
import WebSocket, { WebSocketServer } from 'ws'; // Import ws module
import {
  createArtInstance,
  // PESAgent, // Removed - Unused import
  CalculatorTool,
  AgentProps,
  AgentFinalResponse,
  ThreadConfig,
  ArtInstance,
  Observation,
  ConversationMessage,
  ProviderAdapter,
  FormattedPrompt,
  CallOptions,
  StreamEvent,
} from 'art-framework';
// Import provider types from main package entry (now that they are re-exported)
import type {
ProviderManagerConfig,
//AvailableProviderEntry, // Keep for potential future use, suppress warning if needed
RuntimeProviderConfig,
} from 'art-framework';

// Load environment variables from .env file (if present)
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import url module

// Determine the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path to the .env.local file in the project root
const envPath = path.resolve(__dirname, '..', '..', '.env.local');
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default
// const wsPort = parseInt(process.env.WS_PORT || '3002', 10); // WebSocket attached to HTTP server, separate port not needed.

// Middleware to parse JSON bodies
app.use(express.json());

// --- Mock Adapters for E2E Testing ---

// Mock ProviderAdapter for testing API providers
class MockApiProviderAdapter implements ProviderAdapter {
    providerName: string;
    options: any;
    instanceId: string; // Add instance ID for testing

    constructor(options: any) {
        this.options = options;
        this.providerName = options.providerName || 'mock-api';
        this.instanceId = `mock-api-instance-${Date.now()}-${Math.random().toString(16).substring(2)}`;
        console.log(`[E2E Mock Adapter] Created API instance: ${this.instanceId} for ${this.providerName}`);
    }

    async call(_prompt: FormattedPrompt, _options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
        console.log(`[E2E Mock Adapter] API Call on instance: ${this.instanceId}`);
        // Simulate API work
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate some delay
        const mockResponse = `mock response from ${this.providerName} (instance: ${this.instanceId})`;

        const stream: AsyncIterable<StreamEvent> = (async function*() {
            yield { type: 'TOKEN', data: mockResponse, threadId: _options.threadId, traceId: _options.traceId || 'mock-trace-id' };
            yield { type: 'END', data: null, threadId: _options.threadId, traceId: _options.traceId || 'mock-trace-id' };
        })();
        return stream;
    }

    async shutdown(): Promise<void> {
        console.log(`[E2E Mock Adapter] Shutdown API instance: ${this.instanceId}`);
    }
}

// Mock ProviderAdapter for testing Local providers
class MockLocalProviderAdapter implements ProviderAdapter {
    providerName: string;
    options: any;
    instanceId: string; // Add instance ID for testing

    constructor(options: any) {
        this.options = options;
        this.providerName = options.providerName || 'mock-local';
         this.instanceId = `mock-local-instance-${Date.now()}-${Math.random().toString(16).substring(2)}`;
        console.log(`[E2E Mock Adapter] Created LOCAL instance: ${this.instanceId} for ${this.providerName}`);
    }

     async call(_prompt: FormattedPrompt, _options: CallOptions): Promise<AsyncIterable<StreamEvent>> {
        console.log(`[E2E Mock Adapter] LOCAL Call on instance: ${this.instanceId}`);
        // Simulate local work (faster than API)
        await new Promise(resolve => setTimeout(resolve, 10));
        const mockResponse = `mock response from ${this.providerName} (instance: ${this.instanceId})`;

        const stream: AsyncIterable<StreamEvent> = (async function*() {
            yield { type: 'TOKEN', data: mockResponse, threadId: _options.threadId, traceId: _options.traceId || 'mock-trace-id' };
            yield { type: 'END', data: null, threadId: _options.threadId, traceId: _options.traceId || 'mock-trace-id' };
        })();
        return stream;
    }

    async shutdown(): Promise<void> {
         console.log(`[E2E Mock Adapter] Shutdown LOCAL instance: ${this.instanceId}`);
    }
}

// --- ART Instance Initialization (Run Once) ---
let artInstancePromise: Promise<ArtInstance | null> | null = null;

async function initializeArt(): Promise<ArtInstance | null> {
  console.log('[E2E App] Initializing ART Instance with Multi-Provider Config...');
  try {
    const providerConfig: ProviderManagerConfig = {
      availableProviders: [
        { name: 'mock-api', adapter: MockApiProviderAdapter, isLocal: false },
        { name: 'mock-api-limited', adapter: MockApiProviderAdapter, isLocal: false }, // Another API provider for testing limits
        { name: 'mock-local-1', adapter: MockLocalProviderAdapter, isLocal: true },
        { name: 'mock-local-2', adapter: MockLocalProviderAdapter, isLocal: true },
        // Add back real providers if needed, guarded by env vars
        // Cast to 'any' to bypass type check for string adapter names
        ...(process.env.GEMINI_API_KEY ? [{ name: 'gemini', adapter: 'gemini', isLocal: false } as any] : []),
        ...(process.env.OPENAI_API_KEY ? [{ name: 'openai', adapter: 'openai', isLocal: false } as any] : []),
      ],
      maxParallelApiInstancesPerProvider: 1, // Set low for testing API limits
      apiInstanceIdleTimeoutSeconds: 2, // Set low for testing eviction
    };

    // Cast config to 'any' to bypass persistent AgentFactoryConfig type error
    const art = await createArtInstance({
      storage: {
        type: 'memory' // Force memory storage on the server
      },
      providerManagerConfig: providerConfig, // Use providerManagerConfig
      // Pass API keys if real providers are included
      apiKeys: {
        gemini: process.env.GEMINI_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        // Add other keys if needed
      },
      tools: [new CalculatorTool()]
    } as any); // Add 'as any' here
    console.log('[E2E App] ART Instance Initialized Successfully.');
    return art;
  } catch (error: any) {
    console.error('[E2E App] --- Error creating ART instance ---');
    console.error(error);
    return null; // Return null if initialization fails
  }
}

// Initialize ART when the server starts
artInstancePromise = initializeArt();
// --- End ART Instance Initialization ---

// --- WebSocket Server Setup ---
const server = http.createServer(app); // Create HTTP server from Express app
const wss = new WebSocketServer({ server }); // Attach WebSocket server

// Store client subscriptions { wsClient: [{ type: 'observation'|'conversation', threadId: string, filter?: any, id: string }] }
const clientSubscriptions = new Map<WebSocket, Array<{ id: string, type: 'observation' | 'conversation', threadId: string, filter?: any }>>();

// Function to broadcast data to relevant clients
function broadcastToSubscribers(type: 'observation' | 'conversation', threadId: string, data: Observation | ConversationMessage) {
  // console.log(`[WS Server] Broadcasting ${type} for thread ${threadId}`);
  clientSubscriptions.forEach((subscriptions, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      subscriptions.forEach(sub => {
        if (sub.type === type && sub.threadId === threadId) {
          // Basic filter check (can be expanded)
          let shouldSend = true;
          if (sub.filter) {
            if (type === 'observation' && sub.filter !== (data as Observation).type) {
              shouldSend = false;
            }
            if (type === 'conversation' && sub.filter !== (data as ConversationMessage).role) {
              shouldSend = false;
            }
            // Add more complex filter logic if needed (e.g., array filters)
          }

          if (shouldSend) {
            try {
              ws.send(JSON.stringify({ type: 'event', payload: data, subscriptionId: sub.id }));
            } catch (err) {
              console.error(`[WS Server] Error sending to client: ${err}`);
            }
          }
        }
      });
    }
  });
}

// Bridge ART sockets to WebSocket clients after ART initializes
artInstancePromise?.then(art => {
  if (art) {
    console.log('[WS Server] ART Initialized. Bridging UI Sockets...');
    const obsSocket = art.uiSystem.getObservationSocket();
    const convSocket = art.uiSystem.getConversationSocket();

    // Subscribe to internal ART Observation Socket
    obsSocket.subscribe((observation: Observation) => { // Add Observation type
      broadcastToSubscribers('observation', observation.threadId, observation);
    });

    // Subscribe to internal ART Conversation Socket
    convSocket.subscribe((message: ConversationMessage) => { // Add ConversationMessage type
      broadcastToSubscribers('conversation', message.threadId, message);
    });
    console.log('[WS Server] UI Sockets Bridged.');

    // --- Add Observation Logging ---
    console.log('[E2E App] Subscribing to ObservationSocket for logging...');
    obsSocket.subscribe((observation: Observation) => { // Add Observation type
      // Log all observations received via the socket
      console.log(`[E2E App Observation] SUBSCRIBER CALLBACK ENTERED for obsId: ${observation.id}, type: ${observation.type}`); // Log entry
      console.log(`[E2E App Observation] Received: ${JSON.stringify(observation, null, 2)}`);
    });
    console.log('[E2E App] Observation logging enabled.');
    // --- End Observation Logging ---
  } else {
    console.error('[WS Server] Cannot bridge UI Sockets: ART instance is null.');
  }
}).catch(err => {
  console.error('[WS Server] Error during ART initialization promise:', err);
});

wss.on('connection', (ws) => {
  console.log('[WS Server] Client connected');
  clientSubscriptions.set(ws, []); // Initialize subscriptions for new client

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      console.log('[WS Server] Received:', parsedMessage);

      const currentSubs = clientSubscriptions.get(ws) || [];

      if (parsedMessage.type === 'subscribe' && parsedMessage.payload) {
        const { threadId, socketType, filter } = parsedMessage.payload;
        if (threadId && (socketType === 'observation' || socketType === 'conversation')) {
          const subId = `sub-${Date.now()}-${Math.random().toString(16).substring(2)}`;
          const newSub = { id: subId, type: socketType, threadId, filter };
          clientSubscriptions.set(ws, [...currentSubs, newSub]);
          console.log(`[WS Server] Client subscribed: ${JSON.stringify(newSub)}`);
          // Confirm subscription back to client
          ws.send(JSON.stringify({ type: 'subscribed', payload: { subscriptionId: subId, ...parsedMessage.payload } }));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid subscribe payload' }));
        }
      } else if (parsedMessage.type === 'unsubscribe' && parsedMessage.payload?.subscriptionId) {
        const subIdToRemove = parsedMessage.payload.subscriptionId;
        const updatedSubs = currentSubs.filter(sub => sub.id !== subIdToRemove);
        clientSubscriptions.set(ws, updatedSubs);
        console.log(`[WS Server] Client unsubscribed: ${subIdToRemove}`);
        ws.send(JSON.stringify({ type: 'unsubscribed', payload: { subscriptionId: subIdToRemove } }));
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type or invalid payload' }));
      }
    } catch (error) {
      console.error('[WS Server] Failed to process message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to parse message' }));
    }
  });

  ws.on('close', () => {
    console.log('[WS Server] Client disconnected');
    clientSubscriptions.delete(ws); // Clean up subscriptions on disconnect
  });

  ws.on('error', (error) => {
    console.error('[WS Server] WebSocket error:', error);
    clientSubscriptions.delete(ws); // Clean up on error too
  });
});
// --- End WebSocket Server Setup ---


// Add a health check endpoint that Playwright can use to detect when the server is ready
app.get('/', (req: Request, res: Response): void => {
  res.status(200).send('E2E Test App server is running');
});

// Endpoint to process queries
app.post('/process', async (req: Request, res: Response): Promise<void> => {
  // console.log('Received request on /process'); // Removed for linting
  // Extract query, storageType, optional threadId, provider, and streaming request flag
  const {
    query,
    storageType = 'memory', // Keep storageType for potential future use, but force memory below
    threadId: requestThreadId,
    provider, // Old provider name, used for fallback/default
    providerConfig: requestProviderConfig, // New: Accept RuntimeProviderConfig object
    requestStreamEvents = false
  } = req.body;

  if (!query) {
    res.status(400).json({
      error: 'Missing required parameter: query',
    });
    return;
  }

  // Validate storage type
  // Validate storage type - allow 'indexeddb' from request but use 'indexedDB' internally
  if (storageType !== 'memory' && storageType !== 'indexeddb') { // Keep request validation lowercase
    res.status(400).json({
      error: 'Invalid storage type. Must be "memory" or "indexeddb"', // Keep error message consistent with request
    });
    return;
  }

  // For e2e tests in Node environment, we MUST use in-memory storage because
  // the framework's IndexedDB adapter relies on the 'window' object.
  // fake-indexeddb provides the API but not the browser environment context.
  try {
    // Await the single ART instance
    const art = await artInstancePromise;

    // Handle case where initialization might have failed
    if (!art) {
      res.status(500).json({
        error: 'ART framework failed to initialize on server start.',
      });
      return;
    }
    // Use the provided threadId if available, otherwise generate a new one
    const threadId = requestThreadId || `e2e-thread-${Date.now()}`;

    // Determine the RuntimeProviderConfig to use
    let runtimeProviderConfig: RuntimeProviderConfig;
    if (requestProviderConfig && requestProviderConfig.providerName) {
      // Use the config provided in the request body
      runtimeProviderConfig = requestProviderConfig;
      console.log(`[E2E App] Using providerConfig from request body:`, runtimeProviderConfig);
    } else {
      // Fallback: Construct a basic config using the old 'provider' name or a default
      const fallbackProviderName = provider || 'mock-api'; // Default to mock-api
      runtimeProviderConfig = {
        providerName: fallbackProviderName,
        modelId: 'default-mock-model', // Use a generic model ID for mocks
        adapterOptions: {} // Mock adapters don't need API keys here
      };
      console.log(`[E2E App] Using fallback providerConfig:`, runtimeProviderConfig);
    }

    // Set up a *default* thread configuration (less critical now)
    // This ensures the thread exists, but the provider used will be determined by runtimeProviderConfig
    const defaultThreadConfig: ThreadConfig = {
      reasoning: { // Add default reasoning block
          provider: 'mock-api', // Default provider for the thread if not overridden
          model: 'default-mock-model',
      },
      enabledTools: ['calculator'],
      historyLimit: 10,
    };

    // Ensure thread exists by setting a default config if needed
    try {
        await art.stateManager.loadThreadContext(threadId);
        // console.log(`[E2E App] Context found for thread ${threadId}`);
    } catch (e) {
        if (e instanceof Error && e.message.includes('not found')) {
            try {
                console.log(`[E2E App] Setting default config for new thread ${threadId}`);
                await art.stateManager.setThreadConfig(threadId, defaultThreadConfig);
            } catch (setConfigError) {
                console.error(`[E2E App] Failed to set default config for thread ${threadId}:`, setConfigError);
                res.status(500).json({
                    error: 'Failed to initialize thread configuration',
                    details: setConfigError instanceof Error ? setConfigError.message : String(setConfigError)
                });
                return; // Stop if setting default config fails
            }
        } else {
            // Log and respond for unexpected errors during context loading
            console.error(`[E2E App] Unexpected error loading thread config for ${threadId}:`, e);
            res.status(500).json({
                error: 'Failed to load thread configuration',
                details: e instanceof Error ? e.message : String(e)
            });
            return; // Stop if loading context fails unexpectedly
        }
    }

    // --- Process the query ---
    let streamSubscription: (() => void) | null = null; // Declare here for broader scope
    try {
        const traceId = `e2e-trace-${Date.now()}`; // Define traceId here
        const agentProps: AgentProps = {
          query,
          threadId,
          traceId, // Assign traceId
          options: {
            stream: requestStreamEvents, // Pass the streaming flag here
            providerConfig: runtimeProviderConfig // Pass the determined provider config
          }
        };

        console.log(`[E2E App] Calling art.process for thread ${threadId} with providerConfig:`, runtimeProviderConfig);
        // Optional debug logging:
        // const currentContext = await art.stateManager.loadThreadContext(threadId).catch(() => null);
        // console.log(`[E2E App] Current Thread Config before process:`, currentContext?.config);

      const collectedStreamEvents: any[] = []; // Use const
      let streamSubscription: (() => void) | null = null;

      // Subscribe to stream events if requested
      if (requestStreamEvents) {
        console.log(`[E2E App] Subscribing to LLMStreamSocket for test response (traceId: ${traceId})...`);
        const llmSocket = art.uiSystem.getLLMStreamSocket();
        streamSubscription = llmSocket.subscribe((event: StreamEvent) => { // Add StreamEvent type
          // Log ALL events received by this subscriber, regardless of traceId
          console.log(`[E2E App Stream Event - RAW] Received event type: ${event.type}, event traceId: ${event.traceId}, expected traceId: ${traceId}`);
          try {
            // Only collect events for the current traceId
            if (event.traceId === traceId) {
               collectedStreamEvents.push(event);
               // Log stream events received by the test harness *after* filtering
               console.log(`[E2E App Stream Event - Filtered] Collected: ${JSON.stringify(event)}`);
            }
          } catch (subError) {
            console.error(`[E2E App Stream Event] Error in subscriber callback:`, subError);
          }
        });
      }

      const startTime = Date.now();
      const finalResponse: AgentFinalResponse = await art.process(agentProps);
      const duration = Date.now() - startTime;

      // Unsubscribe if we subscribed (Use typeof check)
      if (typeof streamSubscription === 'function') {
        streamSubscription();
        console.log('[E2E App] Unsubscribed from LLMStreamSocket.');
      }

      // *** Add logging after art.process ***
      console.log(`[E2E App] art.process completed in ${duration}ms. Status: ${finalResponse.metadata.status}`);
      console.log(`[E2E App] Final Response object:`, finalResponse); // Log the entire response object
      // *** End logging ***

      // Fetch observations for the thread
      let allObservations: Observation[] = [];
      try {
        allObservations = await art.observationManager.getObservations(threadId); // Get all observations for the thread
        // console.log(`Fetched ${allObservations.length} observations for thread ${threadId}`);
      } catch (obsError) {
        console.error(`Error fetching observations for thread ${threadId}:`, obsError);
      }
      // Manually filter observations by traceId
      const observations = allObservations.filter(obs => obs.traceId === finalResponse.metadata.traceId);

      // Add test info and observations to the response
      const responsePayload: any = { // Use 'any' temporarily
        ...finalResponse,
        _testInfo: {
          requestedStorageType: storageType,
          actualStorageType: 'memory', // Always memory on the server
          requestedProvider: provider, // Add requested provider
          processingTimeMs: duration
        },
        _observations: observations // Add observations
      };

      // Add collected stream events if requested
      if (requestStreamEvents) {
        responsePayload._streamEvents = collectedStreamEvents;
      }

      // Send the final response back to the client
      res.status(200).json(responsePayload);
    } catch (processError: any) { // Catch errors during art.process
        console.error('--- Error during ART processing ---');
        console.error(processError);
        // Ensure stream subscription is cleaned up on error too (Use typeof check)
        if (typeof streamSubscription === 'function') {
            (streamSubscription as () => void)(); // Use specific function type assertion
            streamSubscription = null; // Explicitly nullify after call
            console.log('[E2E App] Unsubscribed from LLMStreamSocket due to error.');
        }
        res.status(500).json({
          error: 'Internal server error during processing.',
          details: processError.message || String(processError),
        });
    }
    // Outer catch remains for errors during setup before art.process try block
  } catch (setupError: any) {
     console.error('--- Error during request processing setup ---');
     console.error(setupError);
     res.status(500).json({
       error: 'Failed during request processing setup',
       details: setupError.message || String(setupError),
     });
  }
});

// Start the combined HTTP and WebSocket server
server.listen(port, () => {
  console.log(`[E2E App] HTTP & WebSocket Server running at http://localhost:${port}`);
});

