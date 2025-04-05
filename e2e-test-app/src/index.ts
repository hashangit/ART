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
  ArtInstance, // Import the ArtInstance type
  Observation, // Import the Observation type
  ConversationMessage, // Import ConversationMessage type
  ObservationType, // Import ObservationType enum
  MessageRole, // Import MessageRole enum
  ObservationSocket, // Import ObservationSocket class type
  ConversationSocket // Import ConversationSocket class type
  // Remove unused ThreadContext import
} from 'art-framework';

// Load environment variables from .env file (if present)
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default
// const wsPort = parseInt(process.env.WS_PORT || '3002', 10); // WebSocket attached to HTTP server, separate port not needed.

// Middleware to parse JSON bodies
app.use(express.json());

// --- ART Instance Initialization (Run Once) ---
let artInstancePromise: Promise<ArtInstance | null> | null = null;

async function initializeArt(): Promise<ArtInstance | null> {
  console.log('[E2E App] Initializing ART Instance...');
  try {
    const art = await createArtInstance({
      storage: {
        type: 'memory' // Force memory storage on the server
      },
      reasoning: {
        // Provide a default reasoning config for the instance
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite', // Use the updated default model
        apiKey: process.env.GEMINI_API_KEY || '',
      },
      tools: [new CalculatorTool()]
    });
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
    obsSocket.subscribe((observation) => {
      broadcastToSubscribers('observation', observation.threadId, observation);
    });

    // Subscribe to internal ART Conversation Socket
    convSocket.subscribe((message) => {
      broadcastToSubscribers('conversation', message.threadId, message);
    });
    console.log('[WS Server] UI Sockets Bridged.');
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
  // Extract query, storageType, and optional threadId from request body
  const { query, storageType = 'memory', threadId: requestThreadId, provider = 'gemini' } = req.body; // Add provider

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

    // Determine API Key based on provider
    let apiKey = '';
    let model = 'default-model'; // Provide a default or handle missing models
    switch (provider) {
      case 'gemini':
        apiKey = process.env.GEMINI_API_KEY || '';
        model = 'gemini-1.5-flash-latest'; // Use a common model
        break;
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY || '';
        model = 'gpt-3.5-turbo'; // Example model
        break;
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY || '';
        model = 'claude-3-haiku-20240307'; // Example model
        break;
      case 'openrouter':
        apiKey = process.env.OPENROUTER_API_KEY || '';
        model = 'openrouter/auto'; // Example model
        break;
      case 'deepseek':
        apiKey = process.env.DEEPSEEK_API_KEY || '';
        model = 'deepseek-chat'; // Example model
        break;
      default:
        console.warn(`[E2E App] Unknown provider requested: ${provider}. Using default Gemini config.`);
        apiKey = process.env.GEMINI_API_KEY || '';
        model = 'gemini-1.5-flash-latest';
        // Optionally return an error if an unsupported provider is critical
        // res.status(400).json({ error: `Unsupported provider: ${provider}` });
        // return;
    }

    if (!apiKey) {
      console.warn(`[E2E App] API Key for provider ${provider} is missing.`);
      // Optionally return an error if API key is missing
      // res.status(400).json({ error: `Missing API Key for provider: ${provider}` });
      // return;
    }

    // Set up thread configuration dynamically
    const threadConfig: ThreadConfig = {
      reasoning: {
        provider: provider, // Use requested provider
        model: model,       // Use determined model
        // apiKey is typically configured at the instance level, not per-thread config
        parameters: { temperature: 0.7 }
      },
      enabledTools: ['calculator'],
      historyLimit: 10,
      systemPrompt: 'You are a helpful assistant.'
    };

    // Ensure thread configuration exists, setting it if necessary.
    // This is crucial for InMemoryStorageAdapter which doesn't persist across requests here.
    try {
      let contextExists = false;
      try {
          // Attempt to load context first
          const existingContext = await art.stateManager.loadThreadContext(threadId);
          // Check if config actually exists within the loaded context
          if (existingContext?.config) {
              contextExists = true;
              // console.log(`[E2E App] Context found for thread ${threadId}`);
          }
      } catch (loadError) {
          // Ignore error if context simply not found, log others
          if (!(loadError instanceof Error && loadError.message.includes('not found'))) {
              console.warn(`[E2E App] Error loading context for thread ${threadId}:`, loadError);
          }
      }

      // If context/config doesn't exist, set it
      if (!contextExists) {
          // console.log(`[E2E App] Setting config for thread ${threadId} (Provider: ${provider})`);
          await art.stateManager.setThreadConfig(threadId, threadConfig);
      }

    } catch (configError) {
        console.error(`[E2E App] Error setting up thread ${threadId}: ${configError}`);
        res.status(500).json({
            error: 'Failed to configure thread',
            details: configError instanceof Error ? configError.message : String(configError)
        });
        return;
    }

    // Process the query
    // console.log(`Processing query: "${query}"`); // Removed for linting
    // Restore original AgentProps without options override
    const agentProps: AgentProps = {
      query,
      threadId
    };

    try {
      const startTime = Date.now();
      const finalResponse: AgentFinalResponse = await art.process(agentProps);
      const duration = Date.now() - startTime;
      // console.log(`Processing complete in ${duration}ms. Status: ${finalResponse.metadata.status}`);

      // Fetch observations for the thread
      let observations: Observation[] = [];
      try {
        observations = await art.observationManager.getObservations(threadId); // Access via observationManager
        // console.log(`Fetched ${observations.length} observations for thread ${threadId}`);
      } catch (obsError) {
        console.error(`Error fetching observations for thread ${threadId}:`, obsError);
        // Decide if this should be a fatal error or just logged
      }

      // Add test info and observations to the response
      const responsePayload = {
        ...finalResponse,
        _testInfo: {
          requestedStorageType: storageType,
          actualStorageType: 'memory', // Always memory on the server
          requestedProvider: provider, // Add requested provider
          processingTimeMs: duration
        },
        _observations: observations // Add observations
      };

      // Send the final response back to the client
      res.status(200).json(responsePayload);
    } catch (error: any) {
      console.error('--- Error during ART processing ---');
      console.error(error);
      res.status(500).json({
        error: 'Internal server error during processing.',
        details: error.message || String(error),
      });
    }
  } catch (initError: any) {
     // This catch block might be less likely to be hit now,
     // but kept for safety during request processing itself.
    console.error('--- Error during request processing setup ---');
    console.error(initError);
    res.status(500).json({
      error: 'Failed during request processing setup',
      details: initError.message || String(initError),
    });
  }
});

// Start the combined HTTP and WebSocket server
server.listen(port, () => {
  console.log(`[E2E App] HTTP & WebSocket Server running at http://localhost:${port}`);
});

