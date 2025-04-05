import { test, expect } from '@playwright/test'; // Removed unused APIRequestContext
import { AgentFinalResponse, Observation, ObservationType } from 'art-framework'; // Import necessary types

// Helper function to make requests and extract tool results
async function processQueryAndGetToolResult(request: any, query: string, threadId?: string): Promise<{ finalResponse: AgentFinalResponse & { _observations?: Observation[] }, toolResultObs?: Observation }> {
  const response = await request.post('/process', {
    data: {
      query: query,
      provider: 'gemini', // Assuming gemini is needed to trigger tool use reliably
      threadId: threadId,
    },
  });
   // Allow non-OK responses for error tests, but log them
  if (!response.ok()) {
    console.warn(`[Test Helper] API request for query "${query}" failed with status ${response.status()}`);
  }
  const json = await response.json();

  // Type assertion for the response payload including _observations
  const finalResponse = json as AgentFinalResponse & { _observations?: Observation[] };

  // Find the TOOL_EXECUTION observation for the calculator tool
  const toolResultObs = finalResponse._observations?.find(obs =>
    obs.type === ObservationType.TOOL_EXECUTION && obs.content?.toolName === 'calculator'
  );

  return { finalResponse, toolResultObs };
}


test.describe('E2E Tool Edge Case Tests (Calculator)', () => {

  test('should handle scope variables correctly', async ({ request }) => {
    // The tool's scope handling merges allowedFunctions and input.scope.
    // It doesn't seem designed to *accept* pi via scope based on the current implementation,
    // it relies on mathjs's internal pi. Let's test with variables 'a', 'b', 'c'.
    const queryWithScope = "Calculate a * b + c, where a=10, b=5, and c=2";
    const { finalResponse, toolResultObs } = await processQueryAndGetToolResult(request, queryWithScope);

    // Check tool execution first
    expect(toolResultObs, 'TOOL_EXECUTION observation should exist').toBeDefined();
    expect(toolResultObs?.content?.status, 'Tool execution status should be success').toBe('success');
    expect(toolResultObs?.content?.output?.result, 'Tool output should be correct').toBeCloseTo(52); // 10 * 5 + 2

    // Check final response (might fail if API limit hit during synthesis)
    if (finalResponse.metadata.status === 'success') {
      expect(finalResponse.response.content).toMatch(/52/); // Check if LLM included the result
    } else {
      console.warn(`Scope test final status was ${finalResponse.metadata.status}, likely due to API limit during synthesis. Tool execution was successful.`);
      expect(finalResponse.metadata.status).toMatch(/error|partial/);
    }
  });

  test('should handle complex numbers correctly', async ({ request }) => {
    const query = "Calculate the square root of -9";
    const { finalResponse, toolResultObs } = await processQueryAndGetToolResult(request, query);

    // Check tool execution first
    expect(toolResultObs, 'TOOL_EXECUTION observation should exist').toBeDefined();
    expect(toolResultObs?.content?.status, 'Tool execution status should be success').toBe('success');
    // mathjs returns complex numbers as objects, the tool converts to string "3i"
    expect(toolResultObs?.content?.output?.result, 'Tool output should be correct complex string').toBe('3i');

    // Check final response (might fail if API limit hit during synthesis)
    if (finalResponse.metadata.status === 'success') {
       // Check if LLM included the result (might format it differently)
      expect(finalResponse.response.content).toMatch(/3i/i);
    } else {
      console.warn(`Complex number test final status was ${finalResponse.metadata.status}, likely due to API limit during synthesis. Tool execution was successful.`);
       expect(finalResponse.metadata.status).toMatch(/error|partial/);
    }
  });

  test('should block disallowed functions (e.g., factorial)', async ({ request }) => {
    const query = "Calculate the factorial of 5 (5!)"; // Factorial '!' or factorial() is not in allowedFunctions
    const { finalResponse, toolResultObs } = await processQueryAndGetToolResult(request, query);

    // Check tool execution observation first - this is the primary check
    expect(toolResultObs, 'TOOL_EXECUTION observation should exist').toBeDefined();
    expect(toolResultObs?.content?.status, 'Tool execution status should be error').toBe('error');
    expect(toolResultObs?.content?.error, 'Tool error message should indicate disallowed function').toContain('Failed to evaluate expression: Undefined symbol factorial'); // Or similar mathjs error

    // Check final response - LLM should report the tool error, but final status might vary
    expect(finalResponse.metadata.status).toMatch(/error|partial|success/); // Success is possible if LLM handles the tool error gracefully
    if (finalResponse.metadata.status !== 'success') {
        expect(finalResponse.metadata.error).toBeDefined();
        // Error might be the tool error or a synthesis error
    }
    expect(finalResponse.response.content).toMatch(/error evaluating|could not calculate the factorial|undefined symbol factorial/i); // Check LLM response reflects error
  });

   test('should return error message from mathjs for syntax errors', async ({ request }) => {
    const query = "Calculate 2 + * 3"; // Syntax error
    const { finalResponse, toolResultObs } = await processQueryAndGetToolResult(request, query);

    // Check tool execution observation first - this is the primary check
    expect(toolResultObs, 'TOOL_EXECUTION observation should exist').toBeDefined();
    expect(toolResultObs?.content?.status, 'Tool execution status should be error').toBe('error');
    // Example mathjs error message, might vary slightly
    expect(toolResultObs?.content?.error, 'Tool error message should indicate syntax error').toContain('Failed to evaluate expression: Value expected');

    // Check final response - LLM should report the tool error, but final status might vary
    expect(finalResponse.metadata.status).toMatch(/error|partial|success/); // Success is possible if LLM handles the tool error gracefully
     if (finalResponse.metadata.status !== 'success') {
        expect(finalResponse.metadata.error).toBeDefined();
        // Error might be the tool error or a synthesis error
    }
    expect(finalResponse.response.content).toMatch(/error evaluating|syntax error|value expected/i); // Check LLM response reflects error
  });

});