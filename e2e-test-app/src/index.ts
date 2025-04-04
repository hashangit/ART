import 'fake-indexeddb/auto'; // Import fake-indexeddb FIRST to patch global indexedDB
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import {
  createArtInstance,
  // PESAgent, // Removed - Unused import
  CalculatorTool,
  AgentProps,
  AgentFinalResponse,
  ThreadConfig
} from 'art-framework';

// Load environment variables from .env file (if present)
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default

// Middleware to parse JSON bodies
app.use(express.json());

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
    // console.log(`Creating ART instance with storage type: ${storageType} (using memory)`); // Removed for linting

    // Create ART instance - always use memory storage for server-side e2e tests
    const art = await createArtInstance({
      // agent: PESAgent, // Removed - Agent type is likely handled by the factory/default
      storage: {
        type: 'memory' // Force memory storage on the server
      },
      // Add the required reasoning configuration
      reasoning: {
        provider: 'gemini', // Use a valid provider type for factory config
        model: 'gemini-2.0-flash-lite', // Provide a default model for the chosen provider
        apiKey: process.env.GEMINI_API_KEY || '', // Add required API key from env
        // Parameters like temperature are passed during process call
      },
      tools: [new CalculatorTool()] // Create instance instead of passing the class
    });

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
  } catch (error: any) {
    console.error('--- Error creating ART instance ---');
    console.error(error);
    res.status(500).json({
      error: 'Failed to initialize ART framework',
      details: error.message || String(error),
    });
  }
});

// Start server
app.listen(port, () => {
  // console.log(`E2E Test App server running at http://localhost:${port}`); // Removed for linting
});

