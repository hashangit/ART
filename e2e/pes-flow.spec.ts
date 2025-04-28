import { test, expect, APIRequestContext } from '@playwright/test'; // Import APIRequestContext
import type { AgentFinalResponse } from 'art-framework'; // Keep only AgentFinalResponse import
// Assuming StreamEvent and Observation types are available or defined similarly to adapters.spec.ts
// import { StreamEvent, Observation } from 'art-framework';

// Define a more complete response type including observations and stream events
interface ProcessResponse extends AgentFinalResponse {
  _testInfo?: { // Make optional as it might not always be present
    requestedStorageType: string;
    actualStorageType: string;
    requestedProvider?: string; // Make optional
    processingTimeMs?: number; // Make optional
  };
  _observations?: Array<any>; // Use 'any' for now, replace with Observation if imported
  _streamEvents?: Array<any>; // Use 'any' for now, replace with StreamEvent if imported
  // The 'metadata' property is now correctly inherited from AgentFinalResponse with type ExecutionMetadata
}


// Base URL is configured in playwright.config.ts
const API_ENDPOINT = '/process';

test.describe('ART Framework E2E - PES Flow', () => {

  // Helper function to make API calls
  // Updated helper function to accept APIRequestContext, requestStreamEvents, and return ProcessResponse
  async function processQuery(
    request: APIRequestContext, // Use specific type
    query: string,
    storageType: 'memory' | 'indexeddb',
    threadId?: string, // Optional threadId parameter
    requestStreamEvents: boolean = false // Add flag
  ): Promise<ProcessResponse> { // Return updated type
    const payload: any = {
      query: query,
      storageType: storageType,
      threadId: threadId, // Pass threadId (will be undefined if not provided)
      // Assuming default provider is handled by the server if not specified
    };
    if (requestStreamEvents) {
        payload.requestStreamEvents = true; // Add flag if true
    }

    // Remove undefined keys from payload before sending
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);


    const response = await request.post(API_ENDPOINT, { data: payload });
    expect(response.ok(), `API request failed with status ${response.status()}`).toBeTruthy();
    const jsonResponse = await response.json() as ProcessResponse; // Cast to updated type

    // Basic validation moved here
    expect(jsonResponse.metadata, 'Response metadata should exist').toBeDefined();
    expect(jsonResponse.metadata.threadId, 'Response metadata should include threadId').toBeDefined();
    expect(jsonResponse.metadata.status, `Response status was not 'success'. Error: ${jsonResponse.metadata.error}`).toBe('success');
    expect(jsonResponse.response?.content, 'Response content should not be empty').toBeTruthy(); // Check response.content

    // Check for observations if they are expected/returned by the endpoint
    if (jsonResponse._observations !== undefined) {
        expect(Array.isArray(jsonResponse._observations), '_observations should be an array').toBe(true);
    }
    // Check for stream events if requested and returned
    if (requestStreamEvents && jsonResponse._streamEvents !== undefined) {
        expect(Array.isArray(jsonResponse._streamEvents), '_streamEvents should be an array').toBe(true);
    }


    return jsonResponse;
  }

  // Helper function to check for specific observation types (requires observations in response)
  function expectObservationType(observations: ProcessResponse['_observations'], type: string) {
    expect(observations, `Cannot check observation type '${type}' because _observations array is missing in the response.`).toBeDefined();
    const found = observations!.some(obs => obs.type === type);
    expect(found, `Expected observation of type '${type}' but none was found. Found types: ${observations!.map(o => o.type).join(', ')}`).toBe(true);
  }


  // --- Tests using InMemoryStorageAdapter ---
  test.describe('with InMemory Storage', () => {
    test('should handle a simple query', async ({ request }) => {
      const query = 'Hello, ART!';
      const response = await processQuery(request, query, 'memory');

      expect(response).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.response.role).toBe('AI');
      expect(response.response.content).toBeDefined();
      expect(response.response.content.length).toBeGreaterThan(0);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.status).toBe('success');
      expect(response.metadata.error).toBeUndefined();
      expect(response.metadata.threadId).toBeDefined();
      // Add more specific content assertions if needed, though LLM output varies
    });

    test('should handle a query requiring the calculator tool', async ({ request }) => {
      const query = 'What is 12 * 11?';
      const response = await processQuery(request, query, 'memory');

      expect(response).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.response.role).toBe('AI');
      expect(response.response.content).toBeDefined();
      // Expect the answer to contain 132
      expect(response.response.content).toContain('132');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.status).toBe('success');
      expect(response.metadata.error).toBeUndefined();
      expect(response.metadata.threadId).toBeDefined();
      // We can't easily verify observations here without modifying the test app response,
      // but success implies the tool likely ran.
    });

    test('should handle a simple query with streaming enabled', async ({ request }) => {
        const query = 'Write a short poem about code.';
        const response = await processQuery(request, query, 'memory', undefined, true); // Request streaming

        expect(response.metadata.status).toBe('success');
        expect(response.response.content.length).toBeGreaterThan(10);

        // Verify stream events (assuming endpoint returns them)
        expect(response._streamEvents, 'Expected _streamEvents array in response').toBeDefined();
        expect(response._streamEvents!.length, '_streamEvents should not be empty').toBeGreaterThan(0);

        const tokenEvents = response._streamEvents!.filter(e => e.type === 'TOKEN');
        const metadataEvents = response._streamEvents!.filter(e => e.type === 'METADATA');
        const endEvents = response._streamEvents!.filter(e => e.type === 'END');
        const errorEvents = response._streamEvents!.filter(e => e.type === 'ERROR');

        expect(errorEvents.length, 'Should not have any ERROR events in stream').toBe(0);
        expect(tokenEvents.length, 'Should have TOKEN events').toBeGreaterThan(0);
        expect(metadataEvents.length, 'Should have METADATA events (at least planning+synthesis)').toBeGreaterThanOrEqual(2); // Expect metadata from both phases
        expect(endEvents.length, 'Should have END events (at least planning+synthesis)').toBeGreaterThanOrEqual(2); // Expect end from both phases

        // Verify stream-related observations (assuming endpoint returns them)
        expect(response._observations, 'Expected _observations array in response').toBeDefined();
        expectObservationType(response._observations, 'LLM_STREAM_START');
        expectObservationType(response._observations, 'LLM_STREAM_METADATA');
        expectObservationType(response._observations, 'LLM_STREAM_END');

        // Optional: Check token types if needed (might vary based on phase)
        // const planningTokens = tokenEvents.filter(t => t.tokenType === 'AGENT_THOUGHT_LLM_RESPONSE');
        // const synthesisTokens = tokenEvents.filter(t => t.tokenType === 'FINAL_SYNTHESIS_LLM_RESPONSE');
        // expect(planningTokens.length + synthesisTokens.length).toEqual(tokenEvents.length);

        // Optional: Reconstruct final response from synthesis tokens
        const synthesisContent = tokenEvents
            .filter(t => t.tokenType === 'FINAL_SYNTHESIS_LLM_RESPONSE' || t.tokenType === 'LLM_RESPONSE') // Include fallback
            .map(e => e.data)
            .join('');
        expect(synthesisContent).toEqual(response.response.content);
    });
  });

  // --- Tests using IndexedDBStorageAdapter ---
  test.describe('with IndexedDB Storage', () => {
    test('should handle a simple query', async ({ request }) => {
      const query = 'Greetings, ART!';
      const response = await processQuery(request, query, 'indexeddb');

      expect(response).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.response.role).toBe('AI');
      expect(response.response.content).toBeDefined();
      expect(response.response.content.length).toBeGreaterThan(0);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.status).toBe('success');
      expect(response.metadata.error).toBeUndefined();
      expect(response.metadata.threadId).toBeDefined();
    });

    test('should handle a query requiring the calculator tool', async ({ request }) => {
      const query = 'Calculate 99 / 3';
      const response = await processQuery(request, query, 'indexeddb');

      expect(response).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.response.role).toBe('AI');
      expect(response.response.content).toBeDefined();
      // Expect the answer to contain 33
      expect(response.response.content).toContain('33');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.status).toBe('success');
      expect(response.metadata.error).toBeUndefined();
      expect(response.metadata.threadId).toBeDefined();
    });

    // Test conversation persistence with IndexedDB (using fake-indexeddb on server)
    // TODO: Skipping this test. The e2e-test-app uses a single ART instance with InMemoryStorageAdapter,
    // which does not persist across requests. Testing IndexedDB persistence requires a different setup
    // or modifications to the test app to allow dynamic adapter configuration per thread/request.
    test.skip('should persist conversation history between requests', async ({ request }) => {
      const firstQuery = "My favorite fruit is mango.";
      const storage = 'indexeddb';

      // First request: Establish context
      const response1 = await processQuery(request, firstQuery, storage);
      expect(response1.metadata.status).toBe('success');
      const threadId = response1.metadata.threadId; // Get the threadId from the first response
      expect(threadId).toBeDefined();
      // console.log(`Persistence Test - Request 1 (Thread: ${threadId}): "${firstQuery}" -> "${response1.response.content}"`);

      // Second request: Ask a question requiring context from the first request
      const secondQuery = "What is my favorite fruit?";
      const response2 = await processQuery(request, secondQuery, storage, threadId); // Use the same threadId
      expect(response2.metadata.status).toBe('success');
      expect(response2.metadata.threadId).toBe(threadId); // Verify same threadId is used
      // console.log(`Persistence Test - Request 2 (Thread: ${threadId}): "${secondQuery}" -> "${response2.response.content}"`);

      // Assert that the second response contains the information from the first
      expect(response2.response.content).toBeDefined();
      expect(response2.response.content.toLowerCase()).toContain('mango');
    });
  });
});