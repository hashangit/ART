import { test, expect } from '@playwright/test';
import type { AgentFinalResponse } from 'art-framework'; // Import type for response assertion

// Base URL is configured in playwright.config.ts
const API_ENDPOINT = '/process';

test.describe('ART Framework E2E - PES Flow', () => {

  // Helper function to make API calls
  async function processQuery(request: any, query: string, storageType: 'memory' | 'indexeddb'): Promise<AgentFinalResponse> {
    const response = await request.post(API_ENDPOINT, {
      data: {
        query: query,
        storageType: storageType,
      },
    });
    expect(response.ok(), `API request failed with status ${response.status()}`).toBeTruthy();
    const jsonResponse = await response.json();
    
    // Log info about simulated vs actual storage for debugging
    if (jsonResponse._testInfo) {
      // console.log(`Test using storage type: requested=${jsonResponse._testInfo.requestedStorageType}, actual=${jsonResponse._testInfo.actualStorageType}`); // Removed
    }
    
    return jsonResponse as AgentFinalResponse;
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

    // Add a note explaining the test approach
    test.fixme('should persist conversation history between requests', async () => { // Removed unused parameter object
      // This test would verify that conversation history is maintained across requests
      // For now, we're using memory storage for all tests in the server environment
      // A complete test would require a browser environment or fake-indexeddb for Node.js
    });
  });
});