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
  ArtInstance // Import the ArtInstance type
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
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite',
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
  const { query, storageType = 'memory', threadId: requestThreadId } = req.body;

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

    // Set up a default thread configuration
    const threadConfig: ThreadConfig = {
      reasoning: {
        // Use the same provider/model as the main instance for consistency in tests
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite',
        parameters: { temperature: 0.7 } // Keep parameters if needed
      },
      enabledTools: ['calculator'],
      historyLimit: 10,
      systemPrompt: 'You are a helpful assistant.'
    };

    // Only set the default thread config if it's a new thread (no threadId provided in request)
    if (!requestThreadId) {
      try {
        // console.log(`Setting default thread config for new thread ${threadId}`); // Removed for linting
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
    // If requestThreadId exists, assume the framework will load existing context/config during art.process

    // Process the query
    // console.log(`Processing query: "${query}"`); // Removed for linting
    const agentProps: AgentProps = {
      query,
      threadId
    };

    try {
      const startTime = Date.now();
      const finalResponse: AgentFinalResponse = await art.process(agentProps);
      const duration = Date.now() - startTime;
      // console.log(`Processing complete in ${duration}ms. Status: ${finalResponse.metadata.status}`); // Removed for linting

      // Add a note in the response for testing purposes
      // @ts-expect-error - Adding custom field for testing
      finalResponse._testInfo = {
        requestedStorageType: storageType,
        // Reflect the actual storage used, mapping to the correct framework type name
        actualStorageType: 'memory', // Always memory on the server
        processingTimeMs: duration
      };

      // Send the final response back to the client
      res.status(200).json(finalResponse);
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

