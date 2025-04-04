import 'fake-indexeddb/auto'; // Import fake-indexeddb FIRST to patch global indexedDB
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import {
  createArtInstance,
  // PESAgent, // Removed - Unused import
  CalculatorTool,
  AgentProps,
  AgentFinalResponse,
  ThreadConfig,
  ArtInstance, // Import the ArtInstance type
  Observation // Import the Observation type
  // Remove unused ThreadContext import
} from 'art-framework';

// Load environment variables from .env file (if present)
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default

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

    // Restore setting thread config for new threads, acknowledging potential persistence issues
    // with InMemoryStorageAdapter across HTTP requests in this specific test setup.
    if (!requestThreadId) {
      try {
        // console.log(`Setting thread config for new thread ${threadId} with provider ${provider}`);
        await art.stateManager.setThreadConfig(threadId, threadConfig);
      } catch (configError) {
        console.error(`Error setting up new thread: ${configError}`);
        res.status(500).json({
          error: 'Failed to configure new thread',
          details: configError instanceof Error ? configError.message : String(configError)
        });
        return;
      }
    }
    // If requestThreadId exists, StateManager *should* load existing config, but might fail here.

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

// Start server
app.listen(port, () => {
  // console.log(`E2E Test App server running at http://localhost:${port}`); // Removed for linting
});

