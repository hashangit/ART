# How-To: Use the `ans` Variable in `CalculatorTool`

The built-in `CalculatorTool` in the ART Framework has a handy feature: it remembers the result of the last calculation *within the same conversation thread* and makes this result available as a special variable named `ans`. This allows for multi-step calculations where the output of one calculation can be easily used as an input for the next.

## How `ans` Works

1.  **Internal Storage:** The `CalculatorTool` maintains an internal `Map` (called `resultStore`) that stores the last successful calculation result, keyed by `threadId`.
2.  **Execution Scope:** When `CalculatorTool.execute()` is called:
    *   It retrieves the `threadId` from the `ExecutionContext`.
    *   It looks up the `resultStore` for a previous result associated with that `threadId`.
    *   If a previous result exists, it's added to the `mathjs.evaluate()` scope as the variable `ans`.
3.  **Updating `ans`:** After a successful calculation, the new `resultValue` (the actual numerical or complex object from `mathjs`, not just its string representation) is stored back into `resultStore` for the current `threadId`, overwriting any previous `ans` value for that thread.
4.  **Isolation:** The `ans` variable is scoped per `threadId`. Calculations in one thread do not affect the `ans` variable in another thread.

## Example Usage

Let's say an agent needs to perform a sequence of calculations:
1. Calculate `(10 + 5) * 2`.
2. Then, take that result and find its square root.
3. Finally, add `7` to the square root.

Here's how the LLM might request the `CalculatorTool` using the `ans` variable, and how the tool would process it:

**User Query:** "Calculate (10 + 5) * 2. Then find the square root of that. Finally, add 7 to the square root."

**Agent's Plan (Simplified LLM Output):**

```
Intent: Perform a sequence of three calculations.
Plan:
1. Calculate (10 + 5) * 2.
2. Calculate the square root of the previous result using 'ans'.
3. Add 7 to the result of the square root calculation, again using 'ans'.
Tool Calls: [
  {"callId": "calc1", "toolName": "calculator", "arguments": {"expression": "(10 + 5) * 2"}},
  {"callId": "calc2", "toolName": "calculator", "arguments": {"expression": "sqrt(ans)"}},
  {"callId": "calc3", "toolName": "calculator", "arguments": {"expression": "ans + 7"}}
]
```

**Execution by `ToolSystem` and `CalculatorTool`:**

*   **Call 1 (`calc1`):**
    *   Input: `{ expression: "(10 + 5) * 2" }`
    *   `ans` for this thread is initially undefined.
    *   `CalculatorTool` evaluates `(10 + 5) * 2` which is `30`.
    *   Result `30` is stored for the current `threadId` (becomes the new `ans`).
    *   `ToolResult`: `{ ..., status: 'success', output: { result: 30 } }`

*   **Call 2 (`calc2`):**
    *   Input: `{ expression: "sqrt(ans)" }`
    *   `CalculatorTool` retrieves `ans = 30` for the current `threadId`.
    *   It evaluates `sqrt(30)`, which is approximately `5.477225575`.
    *   Result `5.477225575` is stored for the current `threadId` (overwriting the previous `ans`).
    *   `ToolResult`: `{ ..., status: 'success', output: { result: 5.477225575051661 } }` (mathjs precision)

*   **Call 3 (`calc3`):**
    *   Input: `{ expression: "ans + 7" }`
    *   `CalculatorTool` retrieves `ans = 5.477225575051661` for the current `threadId`.
    *   It evaluates `5.477225575051661 + 7`, which is approximately `12.477225575`.
    *   Result `12.477225575051661` is stored for the current `threadId`.
    *   `ToolResult`: `{ ..., status: 'success', output: { result: 12.477225575051661 } }`

**Agent's Synthesis Prompt Context (Simplified):**

The `PESAgent` would then provide these `ToolResult`s to the LLM for the synthesis phase. The context for the LLM might include something like:

```
...
Tool Execution Results:
- Tool: calculator (Call ID: calc1)
  Status: success
  Output: {"result":30}
- Tool: calculator (Call ID: calc2)
  Status: success
  Output: {"result":5.477225575051661}
- Tool: calculator (Call ID: calc3)
  Status: success
  Output: {"result":12.477225575051661}

Based on the user query and tool results, synthesize a final response...
```

The LLM can then formulate a response like: "First, (10 + 5) * 2 is 30. The square root of 30 is approximately 5.48. Adding 7 to that gives approximately 12.48."

## Important Notes:

*   **Thread-Scoped:** The `ans` variable is specific to each `threadId`. One user's multi-step calculation won't interfere with another's.
*   **Overwritten:** Each successful calculation by the `CalculatorTool` within a thread updates (overwrites) the `ans` value for that thread.
*   **Availability:** `ans` is only available if a previous calculation *by the `CalculatorTool`* has occurred successfully in the *same thread* and was processed by the *same `CalculatorTool` instance*.
*   **Error Handling:** If a calculation involving `ans` fails (e.g., `ans` is undefined because no prior calculation, or `ans` holds a value that leads to a math error like `log(ans)` if `ans` was 0), the `CalculatorTool` will return an error `ToolResult`.
*   **LLM Awareness:** For the LLM to effectively use `ans`, its planning prompt should include a mention of this capability in the `CalculatorTool`'s description (as is done in the default schema).

The `ans` variable makes the `CalculatorTool` more powerful for sequential calculations, reducing the need for the LLM to explicitly pass results from one calculation step to the next as a separate variable in the `scope`.
```

```markdown
docs/how-to/leverage-think-tags.md
```
```markdown
# How-To: Leverage `<think>` Tags for Agent Observability

In complex AI agent interactions, it's often beneficial for the Large Language Model (LLM) to "show its work" or articulate its reasoning process before arriving at a plan or final answer. The ART Framework, through its `OutputParser`, supports a convention of using `<think>...</think>` XML-like tags in LLM prompts to encourage this behavior and to extract these "thoughts."

## What are `<think>` Tags?

`<think>` tags are a simple mechanism you can instruct your LLM to use in its responses, particularly during the planning phase. The content enclosed within these tags represents the LLM's intermediate reasoning, reflections, self-correction, or detailed breakdown of its understanding.

**Example: LLM Planning Output with `<think>` Tags**

```text
<think>
The user wants to know the capital of France and the weather there.
This requires two steps:
1. Find the capital of France.
2. Get the weather for that capital city.
I have tools for search and weather.
</think>
Intent: Find the capital of France and then get its current weather.
Plan:
3. Use the 'search' tool to find the capital of France.
4. Use the 'get_weather' tool with the capital city found in step 1.
5. Synthesize the information into a coherent response.
Tool Calls: [
  {"callId": "search_capital", "toolName": "search", "arguments": {"query": "capital of France"}},
  {"callId": "weather_capital", "toolName": "get_weather", "arguments": {"location": "Paris"}} // LLM might pre-fill if confident
]
```
*(Note: The LLM might not perfectly fill the second tool call's arguments until the first is executed; this is just an illustrative example of thought and plan separation.)*

## How `OutputParser` Handles `<think>` Tags

The `OutputParser.parsePlanningOutput(output: string)` method in ART `v0.2.7` uses an `XmlMatcher` utility to specifically look for and extract content within `<think>...</think>` tags.

1.  **Extraction:** `XmlMatcher` processes the entire raw string output from the LLM.
2.  **Separation:**
    *   Content found *inside* any `<think>...</think>` tags is collected. If multiple `<think>` blocks exist, their content is aggregated, typically separated by `\n\n---\n\n`. This aggregated content becomes the `thoughts` field in the parsed result.
    *   Content *outside* the `<think>` tags is considered the "non-thinking" or primary output, which is then parsed for "Intent:", "Plan:", and "Tool Calls:" sections.
3.  **Result:** `parsePlanningOutput` returns an object like:
    ```typescript
    {
      thoughts?: string; // Aggregated content from all <think> tags
      intent?: string;
      plan?: string;
      toolCalls?: ParsedToolCall[];
    }
    ```

## Benefits of Using `<think>` Tags

1.  **Improved Observability:**
    *   By examining the `thoughts` field, developers can gain deeper insights into the LLM's reasoning process. This is invaluable for debugging why an agent made a particular decision, chose certain tools, or misinterpreted a query.
    *   UI components can display these thoughts (e.g., in a "developer log" or an "agent thinking..." panel) to provide transparency.

2.  **Better Prompt Engineering:**
    *   Encouraging the LLM to "think out loud" within these tags can sometimes lead to better quality plans and tool usage, as it forces the model to break down the problem before committing to actions. This is related to "Chain of Thought" prompting techniques.

3.  **Structured Output:**
    *   It helps separate the LLM's verbose reasoning from the more structured and actionable parts of its plan (Intent, Plan, Tool Calls), making the latter easier to parse reliably.

4.  **Debugging LLM Failures:**
    *   If the LLM fails to produce a valid plan or makes incorrect tool calls, the content within the `<think>` tags might reveal misunderstandings or flawed logic that can be addressed by refining the system prompt or tool descriptions.

## How to Instruct the LLM to Use `<think>` Tags

You need to include instructions in your system prompt or the task-specific part of your planning prompt that tells the LLM to use these tags.

**Example Prompt Instruction (for the planning phase):**

```
System Prompt:
You are a helpful AI assistant. Your goal is to understand the user's query, create a plan, and identify any tools needed.

User Query Instructions:
When formulating your plan, first use <think>...</think> tags to write out your step-by-step reasoning, analyze the query, and consider which tools might be useful.
After your thoughts, provide your response in the following structured format:
Intent: [Your understanding of the user's goal]
Plan: [Your step-by-step plan]
Tool Calls: [A JSON array of tool calls, or an empty array [] if no tools are needed. Format: [{"callId": "unique_id", "toolName": "tool_name", "arguments": {"arg_name": "value"}}]]

User Query: {{user_query}}
Available Tools: {{tools_description}}
```

## Using the Extracted Thoughts

Once `OutputParser.parsePlanningOutput()` returns the `thoughts` string, your agent logic (e.g., `PESAgent`) can:

1.  **Record an Observation:**
    ```typescript
    // In PESAgent, after parsing planning output:
    // if (parsedPlanningOutput.thoughts) {
    //   await this.deps.observationManager.record({
    //     threadId: props.threadId,
    //     traceId: traceId,
    //     type: ObservationType.THOUGHTS, // Assuming ObservationType.THOUGHTS exists
    //     content: { thoughts: parsedPlanningOutput.thoughts },
    //     metadata: { timestamp: Date.now() }
    //   });
    // }
    ```
    *(Note: `ObservationType.THOUGHTS` is used as an example; you might map it to an existing type or add a new one if needed. The `OutputParser` itself doesn't record observations; the consuming agent logic does.)*

2.  **Log for Debugging:**
    ```typescript
    // Logger.debug(`[${traceId}] LLM Thoughts:\n${parsedPlanningOutput.thoughts}`);
    ```

3.  **Display in UI:** The `Observation` containing the thoughts can be sent to the UI via `ObservationSocket` for display.

By encouraging and correctly parsing `<think>` tags, you can significantly enhance the transparency and debuggability of your ART agents.