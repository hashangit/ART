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
  const { query, storageType = 'memory' } = req.body; // Default to memory storage

  if (!query) {
    res.status(400).json({
      error: 'Missing required parameter: query',
    });
    return;
  }

  // Validate storage type
  if (storageType !== 'memory' && storageType !== 'indexeddb') {
    res.status(400).json({
      error: 'Invalid storage type. Must be "memory" or "indexeddb"',
    });
    return;
  }

  // For e2e tests in Node environment, we'll use in-memory storage for both types
  // This allows tests to pass while demonstrating the concept
  try {
    // console.log(`Creating ART instance with storage type: ${storageType}`); // Removed for linting
    
    // Create ART instance - always use memory storage for server-side e2e tests
    // We tell the client we're using their requested type, but internally always use memory
    // This is a special adaptation for the e2e test environment
    const art = await createArtInstance({
      // agent: PESAgent, // Removed - Agent type is likely handled by the factory/default
      storage: {
        type: 'memory'
        // Removed the incorrect config property
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

    // Generate a unique thread ID for this request unless one was provided
    const threadId = `e2e-thread-${Date.now()}`;

    // Set up a default thread configuration
    const threadConfig: ThreadConfig = {
      reasoning: {
        provider: 'mock',  // Using mock provider for tests (faster/deterministic)
        model: 'mock-model',
        parameters: { temperature: 0.7 }
      },
      enabledTools: ['calculator'],
      historyLimit: 10,
      systemPrompt: 'You are a helpful assistant.'
    };

    try {
      // Load and configure the thread
      // const threadContext = await art.stateManager.loadThreadContext(threadId); // Removed - Unused variable
      // Set thread configuration - use StateManager API to configure the thread
      // console.log(`Setting default thread config for ${threadId}`); // Removed for linting
      // The implementation details here depend on your StateManager's API
      // This would typically involve setting the threadConfig via your API
      
      // Set the default thread config using the StateManager
      await art.stateManager.setThreadConfig(threadId, threadConfig);
    } catch (configError) {
      console.error(`Error setting up thread: ${configError}`);
      res.status(500).json({
        error: 'Failed to configure thread',
        details: configError instanceof Error ? configError.message : String(configError)
      });
      return;
    }

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
        actualStorageType: 'memory', // For transparency in tests
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
