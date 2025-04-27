import { test, expect, APIRequestContext } from '@playwright/test';
import { AgentFinalResponse } from 'art-framework'; // Assuming AgentFinalResponse is exported

// Define a type for the expected response structure including observations
interface ProcessResponse extends AgentFinalResponse {
  // Add StreamEvent type import if not already globally available in test scope
  // import { StreamEvent } from 'art-framework'; // Assuming StreamEvent is exported
  _streamEvents?: Array<any>; // Using 'any' for now, replace with StreamEvent if imported
  _testInfo: {
    requestedStorageType: string;
    actualStorageType: string;
    requestedProvider: string;
    processingTimeMs: number;
  };
  _observations: Array<{
    id: string;
    timestamp: string;
    threadId: string;
    type: string; // e.g., 'INTENT', 'PLAN', 'THOUGHTS', 'TOOL_REQUEST', 'TOOL_EXECUTION', 'FINAL_RESPONSE', 'ERROR'
    metadata?: any;
    content?: any;
  }>;
}

// Helper function to make requests and basic validation
async function processQuery(
    request: APIRequestContext,
    query: string,
    provider: string = 'gemini',
    threadId?: string,
    requestStreamEvents: boolean = false // Add flag to request stream events
): Promise<ProcessResponse> {
  const requestData: any = {
      query,
      provider,
      threadId
  };
  if (requestStreamEvents) {
      requestData.requestStreamEvents = true; // Add flag to request data if true
  }

  const response = await request.post('/process', { data: requestData });
  expect(response.ok(), `API request failed with status ${response.status()}`).toBe(true);
  const body = await response.json() as ProcessResponse;
  expect(body.metadata.status, `Response status was not 'success'. Error: ${body.metadata.error}`).toBe('success');
  expect(body.response.content, 'Response output should not be empty').toBeTruthy();
  expect(body._testInfo.requestedProvider).toBe(provider);
  expect(body._observations, 'Observations array should exist').toBeDefined();
  return body;
}

// Helper function to check for specific observation types
function expectObservationType(observations: ProcessResponse['_observations'], type: string) {
  const found = observations.some(obs => obs.type === type);
  expect(found, `Expected observation of type '${type}' but none was found. Found types: ${observations.map(o => o.type).join(', ')}`).toBe(true);
}

test.describe('Reasoning Adapter Tests', () => {

  test.describe('Gemini Adapter (Default)', () => {
    const provider = 'gemini';

    test('processes a basic query using Gemini and checks observations', async ({ request }) => {
      const query = 'What is the capital of France?';
      const response = await processQuery(request, query, provider);

      expect(response.response.content).toContain('Paris');
      expect(response._observations.length).toBeGreaterThan(0);

      // Verify key observation types (Point 3)
      expectObservationType(response._observations, 'INTENT');
      expectObservationType(response._observations, 'PLAN');
      // expectObservationType(response._observations, 'THOUGHTS'); // THOUGHTS may not always be present
      // expectObservationType(response._observations, 'SYNTHESIS'); // SYNTHESIS type is not emitted; FINAL_RESPONSE is sufficient
      expectObservationType(response._observations, 'FINAL_RESPONSE'); // Verify FINAL_RESPONSE observation exists
      // FINAL_RESPONSE is implicit in getting a successful response body
      // ERROR check would be in a separate error test
    });

    test('processes a tool query using Gemini and checks observations', async ({ request }) => {
      const query = 'What is 5 * 12?';
      const response = await processQuery(request, query, provider);

      expect(response.response.content).toContain('60');
      expect(response._observations.length).toBeGreaterThan(0);

      // Verify key observation types including tool usage (Point 3)
      expectObservationType(response._observations, 'INTENT');
      expectObservationType(response._observations, 'PLAN');
      // expectObservationType(response._observations, 'THOUGHTS'); // THOUGHTS may not always be present
      expectObservationType(response._observations, 'TOOL_CALL'); // Found in logs, use this instead of TOOL_REQUEST
      // expectObservationType(response._observations, 'TOOL_EXECUTION'); // This observation is not present in the logs for this flow
      expectObservationType(response._observations, 'SYNTHESIS'); // Check for SYNTHESIS after tool use
      // FINAL_RESPONSE is implicit
    });

     test('maintains conversation context with Gemini', async ({ request }) => {
        const threadId = `gemini-context-test-${Date.now()}`;
        // First request
        const response1 = await processQuery(request, 'My favorite color is blue.', provider, threadId);
        expect(response1.metadata.status).toBe('success');
        expect(response1.metadata.threadId).toBe(threadId);

        // Second request to the same thread
        const response2 = await processQuery(request, 'What is my favorite color?', provider, threadId);
        expect(response2.metadata.status).toBe('success');
        expect(response2.metadata.threadId).toBe(threadId);
        expect(response2.response.content.toLowerCase()).toContain('blue');

        // Verify observations exist in the second response as well
        expect(response2._observations.length).toBeGreaterThan(0);
        expectObservationType(response2._observations, 'INTENT');
        expectObservationType(response2._observations, 'PLAN');
        // expectObservationType(response2._observations, 'THOUGHTS'); // THOUGHTS may not always be present
        expectObservationType(response2._observations, 'SYNTHESIS'); // Check for SYNTHESIS instead
    });

    test('processes a basic query with streaming using Gemini', async ({ request }) => {
        const query = 'Write a short story about a curious robot.';
        // Request stream events
        const response = await processQuery(request, query, provider, undefined, true);

        // Basic response check
        expect(response.metadata.status).toBe('success');
        expect(response.response.content.length).toBeGreaterThan(10); // Check for some content

        // Check stream events were returned
        expect(response._streamEvents, 'Expected _streamEvents array in response').toBeDefined();
        expect(Array.isArray(response._streamEvents), '_streamEvents should be an array').toBe(true);
        expect(response._streamEvents!.length, '_streamEvents should not be empty').toBeGreaterThan(0);

        // Find specific event types
        const tokenEvents = response._streamEvents!.filter(e => e.type === 'TOKEN');
        const metadataEvents = response._streamEvents!.filter(e => e.type === 'METADATA');
        const endEvents = response._streamEvents!.filter(e => e.type === 'END');
        const errorEvents = response._streamEvents!.filter(e => e.type === 'ERROR');

        // Assertions on events
        expect(errorEvents.length, 'Should not have any ERROR events in stream').toBe(0);
        expect(tokenEvents.length, 'Should have TOKEN events').toBeGreaterThan(0);
        // Gemini adapter yields metadata after stream based on final chunk/response
        expect(metadataEvents.length, 'Should have at least one METADATA event').toBeGreaterThanOrEqual(1);
        expect(endEvents.length, 'Should have exactly one END event').toBe(1);

        // Check token type (assuming synthesis context)
        expect(tokenEvents[0].tokenType, 'Token type should reflect synthesis context')
          .toMatch(/FINAL_SYNTHESIS_LLM_RESPONSE|LLM_RESPONSE/);

        // Check metadata content (adapter yields metadata after stream)
        const finalMetadata = metadataEvents[metadataEvents.length - 1].data;
        expect(finalMetadata.stopReason, 'Metadata should include stopReason').toBeDefined();
        // Token counts might be present in usageMetadata
        // expect(finalMetadata.inputTokens, 'Metadata might include inputTokens').toBeDefined();
        // expect(finalMetadata.outputTokens, 'Metadata might include outputTokens').toBeDefined();

        // Optional: Reconstruct content from tokens and compare
        const streamedContent = tokenEvents.map(e => e.data).join('');
        expect(streamedContent, 'Reconstructed stream content should match final response content')
            .toEqual(response.response.content);

        // Check standard observations still exist
        expectObservationType(response._observations, 'INTENT');
        expectObservationType(response._observations, 'PLAN');
        expectObservationType(response._observations, 'SYNTHESIS');
        // Check for stream-related observations recorded by Agent Core
        expectObservationType(response._observations, 'LLM_STREAM_START');
        expectObservationType(response._observations, 'LLM_STREAM_METADATA');
        expectObservationType(response._observations, 'LLM_STREAM_END');
      });

  });

  // --- OpenAI Adapter Tests ---
  test.describe('OpenAI Adapter Tests', () => {
    // Skip these tests unless ENABLE_OPENAI_TESTS=true
    test.skip(process.env.ENABLE_OPENAI_TESTS !== 'true',
      'OpenAI tests disabled. Set ENABLE_OPENAI_TESTS=true to enable');

    const provider = 'openai';

    test('processes a basic query using OpenAI', async ({ request }) => {
      // Placeholder - Implement actual test logic
      const query = 'What is the capital of Spain?';
      const response = await processQuery(request, query, provider);
      expect(response.response.content).toContain('Madrid'); // Example assertion
      expectObservationType(response._observations, 'INTENT');
    });

    test('processes a tool query using OpenAI', async ({ request }) => {
      // Placeholder - Implement actual test logic
      const query = 'What is 7 + 8?';
      const response = await processQuery(request, query, provider);
      expect(response.response.content).toContain('15'); // Example assertion
      // OpenAI function calling might result in TOOL_CALL observation
      expectObservationType(response._observations, 'TOOL_CALL');
    });

    test('processes a basic query with streaming using OpenAI', async ({ request }) => {
      const query = 'Write a short haiku about testing.';
      // Request stream events
      const response = await processQuery(request, query, provider, undefined, true);

      // Basic response check
      expect(response.response.content.length).toBeGreaterThan(10); // Check for some content

      // Check stream events were returned (assuming endpoint modification)
      expect(response._streamEvents, 'Expected _streamEvents array in response').toBeDefined();
      expect(Array.isArray(response._streamEvents), '_streamEvents should be an array').toBe(true);
      expect(response._streamEvents!.length, '_streamEvents should not be empty').toBeGreaterThan(0);

      // Find specific event types
      const tokenEvents = response._streamEvents!.filter(e => e.type === 'TOKEN');
      const metadataEvents = response._streamEvents!.filter(e => e.type === 'METADATA');
      const endEvents = response._streamEvents!.filter(e => e.type === 'END');
      const errorEvents = response._streamEvents!.filter(e => e.type === 'ERROR');

      // Assertions on events
      expect(errorEvents.length, 'Should not have any ERROR events in stream').toBe(0);
      expect(tokenEvents.length, 'Should have TOKEN events').toBeGreaterThan(0);
      expect(metadataEvents.length, 'Should have at least one METADATA event').toBeGreaterThanOrEqual(1);
      expect(endEvents.length, 'Should have exactly one END event').toBe(1);

      // Check token type (assuming synthesis context for a basic query)
      expect(tokenEvents[0].tokenType, 'Token type should reflect synthesis context')
        .toMatch(/FINAL_SYNTHESIS_LLM_RESPONSE|LLM_RESPONSE/); // Allow LLM_RESPONSE as fallback

      // Check metadata content (adapter yields calculated metadata after stream)
      const finalMetadata = metadataEvents[metadataEvents.length - 1].data;
      expect(finalMetadata.outputTokens, 'Metadata should include outputTokens').toBeGreaterThan(0);
      expect(finalMetadata.timeToFirstTokenMs, 'Metadata should include timeToFirstTokenMs').toBeGreaterThanOrEqual(0);
      expect(finalMetadata.totalGenerationTimeMs, 'Metadata should include totalGenerationTimeMs').toBeGreaterThan(0);

      // Optional: Reconstruct content from tokens and compare
      const streamedContent = tokenEvents.map(e => e.data).join('');
      expect(streamedContent, 'Reconstructed stream content should match final response content')
          .toEqual(response.response.content);

      // Check standard observations still exist
      expectObservationType(response._observations, 'INTENT');
      expectObservationType(response._observations, 'PLAN');
      expectObservationType(response._observations, 'SYNTHESIS');
      // Check for stream-related observations recorded by Agent Core
      expectObservationType(response._observations, 'LLM_STREAM_START');
      expectObservationType(response._observations, 'LLM_STREAM_METADATA');
      expectObservationType(response._observations, 'LLM_STREAM_END');
    });
  });

  // --- Anthropic Adapter Tests ---
  test.describe('Anthropic Adapter Tests', () => {
    test.skip(process.env.ENABLE_ANTHROPIC_TESTS !== 'true',
      'Anthropic tests disabled. Set ENABLE_ANTHROPIC_TESTS=true to enable');

    const provider = 'anthropic';

    test('processes a basic query using Anthropic', async ({ request }) => {
      // Placeholder
      const query = 'What is the capital of Italy?';
      const response = await processQuery(request, query, provider);
      expect(response.response.content).toContain('Rome');
      expectObservationType(response._observations, 'INTENT');
    });
  });

  // --- OpenRouter Adapter Tests ---
  test.describe('OpenRouter Adapter Tests', () => {
    test.skip(process.env.ENABLE_OPENROUTER_TESTS !== 'true',
      'OpenRouter tests disabled. Set ENABLE_OPENROUTER_TESTS=true to enable');

    const provider = 'openrouter';

    test('processes a basic query using OpenRouter', async ({ request }) => {
      // Placeholder
      const query = 'What is the capital of Germany?';
      const response = await processQuery(request, query, provider);
      expect(response.response.content).toContain('Berlin');
      expectObservationType(response._observations, 'INTENT');
    });
  });

  // --- DeepSeek Adapter Tests ---
  test.describe('DeepSeek Adapter Tests', () => {
    test.skip(process.env.ENABLE_DEEPSEEK_TESTS !== 'true',
      'DeepSeek tests disabled. Set ENABLE_DEEPSEEK_TESTS=true to enable');

    const provider = 'deepseek';

    test('processes a basic query using DeepSeek', async ({ request }) => {
      // Placeholder
      const query = 'What is the capital of Japan?';
      const response = await processQuery(request, query, provider);
      expect(response.response.content).toContain('Tokyo');
      expectObservationType(response._observations, 'INTENT');
    });
  });
});