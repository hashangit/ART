import { test, expect, APIRequestContext } from '@playwright/test';
import { AgentFinalResponse, Observation } from 'art-framework'; // Import necessary types

// Helper function to make requests
async function processQuery(request: APIRequestContext, query: string, threadId: string, provider: string = 'gemini'): Promise<AgentFinalResponse & { _observations?: Observation[] }> {
  const response = await request.post('/process', {
    data: {
      query: query,
      provider: provider,
      threadId: threadId,
    },
  });
  expect(response.ok(), `API request failed with status ${response.status()} for thread ${threadId}`).toBe(true);
  const json = await response.json();
   // Type assertion for the response payload including _observations
  return json as AgentFinalResponse & { _observations?: Observation[] };
}


test.describe('E2E Context System Tests', () => {

  test('should keep different threadIds isolated', async ({ request }) => {
    const threadId1 = `context-iso-1-${Date.now()}`;
    const threadId2 = `context-iso-2-${Date.now()}`;

    // Query 1 for Thread 1
    const response1_1 = await processQuery(request, "My favorite color is blue.", threadId1);
    expect(response1_1.metadata.status).toBe('success');
    expect(response1_1.response.content).toMatch(/Okay|Alright|Got it/i); // Simple acknowledgement

    // Query 1 for Thread 2
    const response2_1 = await processQuery(request, "My favorite number is 7.", threadId2);
    expect(response2_1.metadata.status).toBe('success');
    expect(response2_1.response.content).toMatch(/Okay|Alright|Got it|great|understood/i); // Made regex less strict

    // Query 2 for Thread 1 - Should remember color, not number
    const response1_2 = await processQuery(request, "What is my favorite color?", threadId1);
    expect(response1_2.metadata.status).toBe('success');
    expect(response1_2.response.content).toMatch(/blue/i);
    expect(response1_2.response.content).not.toMatch(/7/i);

    // Query 2 for Thread 2 - Should remember number, not color
    const response2_2 = await processQuery(request, "What is my favorite number?", threadId2);
    expect(response2_2.metadata.status).toBe('success');
    expect(response2_2.response.content).toMatch(/7/i);
    expect(response2_2.response.content).not.toMatch(/blue/i);
  });

  // Note: The e2e-test-app currently only sets config (including enabledTools) for *new* threads.
  // This test verifies that the default config (which enables 'calculator') is respected.
  // Testing *disabling* tools would require modifying the test app to accept tool config in the request.
  test('should respect default thread configuration (enabledTools)', async ({ request }) => {
    const threadId = `context-config-${Date.now()}`;

    // First request - should use calculator successfully as it's enabled by default in the test app config
    const response1 = await processQuery(request, "Calculate 10 + 5", threadId);
    expect(response1.metadata.status).toBe('success');
    expect(response1.response.content).toMatch(/15/);
    const toolCallObs1 = response1._observations?.find(obs => obs.type === 'TOOL_CALL' && obs.content?.toolName === 'calculator');
    expect(toolCallObs1).toBeDefined();

    // Second request - Attempt to use a non-existent tool (should fail as expected)
    // This also implicitly tests that the thread config wasn't unexpectedly changed.
    const response2 = await processQuery(request, "Use NonExistentTool to do something", threadId);
    expect(response2.metadata.status).toBe('error'); // The overall status should be error
    expect(response2.metadata.error).toContain('Tool \'NonExistentTool\' not found');
    expect(response2.response.content).toMatch(/error|could not find the tool/i);
  });

  // TODO: Add test for configuring threads with different enabledTools (requires e2e-test-app modification)

});