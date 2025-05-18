# Advanced: Debugging ART Applications

Debugging AI agents built with the ART Framework involves understanding the flow of data and decisions through its various components. Here are strategies and tools to help you troubleshoot and diagnose issues:

## 1. Leverage the `Logger`

ART's built-in `Logger` is your first line of defense.

*   **Set Log Level:** During development, configure the log level to `LogLevel.DEBUG` in your `ArtInstanceConfig` to get the most detailed output from framework internals.
    ```typescript
    // In ArtInstanceConfig
    logger: {
        level: LogLevel.DEBUG
    }
    ```
*   **Inspect Console Output:** Pay attention to logs prefixed with `[ART]` (or your custom prefix). Key events logged include:
    *   Initialization of components (`AgentFactory`, `StateManager`, `ProviderManager`, etc.).
    *   `ReasoningEngine` requesting and releasing adapters.
    *   `ProviderAdapter` making calls (often includes model ID, stream status).
    *   `OutputParser` warnings or errors during JSON parsing or validation.
    *   `ToolSystem` and `ToolRegistry` messages about tool execution and registration.
    *   `StateManager` messages about context loading or state saving (especially with `'implicit'` strategy).
    *   UI Socket activity (`subscribe`, `notify`).
*   **Add Your Own Logs:** Use `Logger.debug()`, `Logger.info()`, `Logger.warn()`, and `Logger.error()` within your custom tools, agent logic, and adapter implementations to trace your application's specific flow.

## 2. Utilize the `ObservationSystem`

The `ObservationManager` records significant events during an agent's execution. This provides a structured audit trail.

*   **Subscribe to `ObservationSocket`:** In your development UI or a dedicated debugging tool, subscribe to `artInstance.uiSystem.getObservationSocket()`.
    ```javascript
    // Conceptual client-side subscription
    // artInstance.uiSystem.getObservationSocket().subscribe(
    //   (observation) => {
    //     console.log('OBSERVATION:', observation.type, observation.title, observation.content);
    //   },
    //   undefined, // No type filter (get all)
    //   { threadId: currentThreadId } // Filter by current thread
    // );
    ```
*   **Inspect Observation Content:**
    *   `INTENT`, `PLAN`, `THOUGHTS`: See what the LLM understood and planned, including its raw reasoning if `<think>` tags were used and parsed.
    *   `TOOL_CALL`: View the exact tools and arguments the LLM requested.
    *   `TOOL_EXECUTION`: Check the `status` ('success' or 'error'), `input`, `output`, or `error` message for each tool call. This is vital for debugging tool issues.
    *   `SYNTHESIS`: See context before final response generation.
    *   `ERROR`: Pinpoint where and why an error occurred during a specific phase.
    *   `LLM_STREAM_START`, `LLM_STREAM_METADATA`, `LLM_STREAM_ERROR`, `LLM_STREAM_END`: Track the lifecycle of LLM calls.
*   **Query Historical Observations:** Use `artInstance.observationManager.getObservations(threadId, filter?)` to retrieve past observations for a thread if you're debugging an issue after the fact.

## 3. Inspect Stored Data (`StorageAdapter`)

If you're using a persistent `StorageAdapter` like `IndexedDBStorageAdapter`:

*   **Browser Developer Tools:**
    *   Open your browser's developer tools (F12).
    *   Navigate to the "Application" (Chrome/Edge) or "Storage" (Firefox) tab.
    *   Find "IndexedDB" and expand your database (e.g., "MyAgentDB_ART").
    *   You can inspect the content of object stores like:
        *   `conversations`: See the raw `ConversationMessage` objects.
        *   `observations`: Examine persisted `Observation` records.
        *   `state`: View the stored `ThreadContext` (containing `ThreadConfig` and `AgentState`).
*   **Verify Data Integrity:** Check if messages, state, and configurations are being saved and loaded as expected.

## 4. Debugging LLM Prompts and Responses

This is often the most challenging part.

*   **Log Full Prompts:** In your custom agent logic or by modifying `PESAgent` (if you've forked it), log the complete `ArtStandardPrompt` object just before it's sent to `ReasoningEngine.call()`.
    ```typescript
    // Logger.debug("Sending to LLM (Planning):", JSON.stringify(planningPrompt, null, 2));
    ```
*   **Log Raw LLM Output:** Log the accumulated text from the LLM stream (e.g., `planningOutputText` in `PESAgent`) before it's passed to the `OutputParser`. This helps you see exactly what the LLM produced.
*   **Isolate LLM Calls:**
    *   Temporarily bypass parts of your agent logic to test a specific LLM call with a fixed prompt directly.
    *   Use tools like Postman, Insomnia, or the LLM provider's own playground/workbench to send the *exact same prompt and parameters* that your adapter is sending. Compare the results. This can help determine if an issue is with your prompt, the model's behavior, or your adapter's translation.
*   **Iterate on Prompts:** If the LLM isn't producing the desired output format (for planning, tool calls) or quality:
    *   Refine your system prompt.
    *   Improve tool descriptions (`ToolSchema.description`).
    *   Add or clarify instructions for output formatting (e.g., for the "Tool Calls:" JSON).
    *   Experiment with few-shot examples in the prompt.
    *   Consider using `<think>` tags to encourage the LLM to show its reasoning, then inspect the `thoughts` output by `OutputParser`.
*   **Check Adapter Translation:** If you suspect an issue in how `ArtStandardPrompt` is being translated by a `ProviderAdapter`, add debug logs within the adapter's `call` method and its prompt translation helpers to see the provider-specific payload being generated.

## 5. Debugging Tools (`IToolExecutor`)

*   **Validate `ToolSchema`:** Ensure your `inputSchema` is correct and accurately reflects the arguments your `execute` method expects. Use a JSON Schema validator tool.
*   **Log Inside `execute()`:** Add detailed logging at the beginning of your tool's `execute` method to see the `input` it received and the `context`. Log key steps and the final `output` or `error`.
*   **Test Tools in Isolation:** Write unit tests for your tool executors, mocking any external dependencies they might have.
*   **Inspect `TOOL_EXECUTION` Observations:** These observations will show the exact `input` the `ToolSystem` passed to your tool (after validation) and the `ToolResult` it returned.

## 6. TypeScript and Static Analysis

*   Leverage TypeScript's static type checking. Ensure your custom components correctly implement ART interfaces and use the defined types.
*   Use a linter (like ESLint) to catch common errors and enforce code style.

## 7. Step-Through Debugging

*   If running in Node.js or a browser environment with a debugger, set breakpoints in:
    *   Your custom agent logic.
    *   `PESAgent.process()` stages.
    *   `OutputParser.parsePlanningOutput()`.
    *   `ToolSystem.executeTools()`.
    *   Your custom tool's `execute()` method.
    *   The relevant `ProviderAdapter.call()` method.
    This allows you to inspect variable values and understand the control flow at critical points.

By combining these techniques, you can effectively debug your ART applications and gain a clear understanding of your agent's behavior.