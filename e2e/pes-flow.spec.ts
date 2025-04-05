import { test, expect } from '@playwright/test';
import type { AgentFinalResponse } from 'art-framework'; // Import type for response assertion

// Base URL is configured in playwright.config.ts
const API_ENDPOINT = '/process';

test.describe('ART Framework E2E - PES Flow', () => {

  // Helper function to make API calls
  // Helper function to make API calls, now accepts optional threadId
  async function processQuery(
    request: any,
    query: string,
    storageType: 'memory' | 'indexeddb',
    threadId?: string // Optional threadId parameter
  ): Promise<AgentFinalResponse & { metadata: { threadId: string } }> { // Ensure threadId is in metadata type
    const payload: { query: string; storageType: string; threadId?: string } = {
      query: query,
      storageType: storageType,
    };
    if (threadId) {
      payload.threadId = threadId; // Add threadId to payload if provided
    }

    const response = await request.post(API_ENDPOINT, { data: payload });
    expect(response.ok(), `API request failed with status ${response.status()}`).toBeTruthy();
    const jsonResponse = await response.json();
    
    // Log info about simulated vs actual storage for debugging
    if (jsonResponse._testInfo) {
      // console.log(`Test using storage type: requested=${jsonResponse._testInfo.requestedStorageType}, actual=${jsonResponse._testInfo.actualStorageType}`); // Removed
    }
    
    // Ensure the response includes a threadId in metadata
    expect(jsonResponse.metadata, 'Response metadata should exist').toBeDefined();
    expect(jsonResponse.metadata.threadId, 'Response metadata should include threadId').toBeDefined();

    return jsonResponse as AgentFinalResponse & { metadata: { threadId: string } };
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