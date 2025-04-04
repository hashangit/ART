import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import {
  createArtInstance,
  PESAgent,
  CalculatorTool,
  AgentProps,
  AgentFinalResponse,
  ThreadConfig
  // Removed StorageConfig import - not needed directly
} from 'art-framework';

// Load environment variables from .env file (if present)
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default

// Middleware to parse JSON bodies
app.use(express.json());

// Endpoint to process queries
app.post('/process', async (req: Request, res: Response): Promise<void> => {
  console.log('Received request on /process');
  const { query, storageType = 'memory' } = req.body; // Default to memory storage

  if (!query) {
    res.status(400).json({ error: 'Missing "query" in request body' });
    return;
  }
  // Correct the casing check for 'indexedDB'
  if (storageType !== 'memory' && storageType !== 'indexedDB') {
    res.status(400).json({ error: 'Invalid "storageType". Must be "memory" or "indexedDB".' });
    return;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('Error: GEMINI_API_KEY not found in environment variables.');
    res.status(500).json({ error: 'Server configuration error: Missing API key.' });
    return;
  }

  try {
    console.log(`Initializing ART with storage: ${storageType}`);
    const art = await createArtInstance({
      agentCore: PESAgent,
      storage: {
        // Correct the casing for the type and the check
        type: storageType as 'memory' | 'indexedDB',
        dbName: storageType === 'indexedDB' ? 'art-e2e-test-db' : undefined,
      },
      reasoning: {
        provider: 'gemini',
        apiKey: geminiApiKey,
      },
      tools: [new CalculatorTool()],
    });
    console.log('ART Instance Initialized.');

    const threadId = `e2e-thread-${Date.now()}`; // Use a dynamic thread ID for isolation
    console.log(`Using threadId: ${threadId}`);

    const defaultThreadConfig: ThreadConfig = {
      reasoning: {
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite', // Or your preferred model
      },
      enabledTools: [CalculatorTool.toolName],
      historyLimit: 5,
      systemPrompt: "You are a test assistant.",
    };

    await art.stateManager.setThreadConfig(threadId, defaultThreadConfig);
    console.log(`Default configuration set for thread: ${threadId}`);

    const agentProps: AgentProps = {
      query: query,
      threadId: threadId,
    };

    // Optional: Subscribe to observations if needed for debugging server-side
    // const observationSocket = art.uiSystem.getObservationSocket();
    // const unsubscribe = observationSocket.subscribe(obs => {
    //   console.log(`[E2E App Observation - ${obs.type}]`, obs.content);
    // });

    console.log(`Processing query: "${query}"`);
    const startTime = Date.now();
    const finalResponse: AgentFinalResponse = await art.process(agentProps);
    const duration = Date.now() - startTime;
    console.log(`Processing complete in ${duration}ms. Status: ${finalResponse.metadata.status}`);

    // unsubscribe(); // Don't forget to unsubscribe if you subscribed

    // Send the final response back to the client
    res.status(200).json(finalResponse);

  } catch (error: any) {
    console.error('--- Error during ART processing ---');
    console.error(error);
    res.status(500).json({
      error: 'Internal server error during processing.',
      details: error.message || String(error),
    }); // End of res.status(500).json()
  } // End of catch block
}); // End of app.post handler

// Start the server
app.listen(port, () => {
  console.log(`E2E Test App server listening on http://localhost:${port}`);
});