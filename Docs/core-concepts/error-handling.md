# Error Handling in ART

Robust error handling is essential for building reliable AI agents. The ART Framework provides a standardized way to represent and manage errors through the `ARTError` class and the `ErrorCode` enum.

## `ARTError` Class

*   **Source:** `src/errors.ts`

`ARTError` is a custom error class that extends the built-in JavaScript `Error`. It's used throughout the framework to signal issues specific to ART's operations.

**Key Properties:**

*   `message: string`: A human-readable description of the error (inherited from `Error`).
*   `name: string`: Set to `'ARTError'`.
*   `code: ErrorCode`: A string enum value from `ErrorCode` that categorizes the error. This is useful for programmatic error handling.
*   `originalError?: Error`: If the `ARTError` was thrown as a result of catching another error (e.g., an error from an external library or API), this property will hold the original error object, preserving its stack trace and details.

**Example Usage (Conceptual):**

```typescript
// import { ARTError, ErrorCode } from 'art-framework';

function someRiskyOperation() {
    try {
        // ... operation that might fail ...
        if (/* condition for failure */) {
            throw new Error("Underlying system failure.");
        }
    } catch (e: any) {
        throw new ARTError("The risky operation failed.", ErrorCode.AGENT_PROCESSING_ERROR, e);
    }
}
```

## `ErrorCode` Enum

*   **Source:** `src/errors.ts`

The `ErrorCode` enum provides a set of predefined string constants representing different categories of errors that can occur within the ART framework. Using these codes allows for more precise error identification and handling.

**Key Error Codes (Refer to `src/errors.ts` for the complete list):**

*   **Configuration Errors:**
    *   `INVALID_CONFIG`: General invalid configuration.
    *   `MISSING_API_KEY`: An API key required by an adapter is missing.
*   **Storage Errors:**
    *   `STORAGE_ERROR`: General error from the storage adapter.
    *   `THREAD_NOT_FOUND`: Attempted to access a thread that doesn't exist.
    *   `SAVE_FAILED`: Failed to save data to storage.
*   **Reasoning Errors (LLM Interactions):**
    *   `LLM_PROVIDER_ERROR`: An error occurred during communication with the LLM provider (e.g., API error, network issue from adapter's perspective).
    *   `PROMPT_FRAGMENT_NOT_FOUND`: A requested prompt fragment does not exist.
    *   `PROMPT_VALIDATION_FAILED`: A constructed `ArtStandardPrompt` object failed schema validation.
    *   `PROMPT_TRANSLATION_FAILED`: An error occurred while an adapter was translating an `ArtStandardPrompt` to a provider-specific format.
    *   `OUTPUT_PARSING_FAILED`: Failed to parse the LLM's output (e.g., malformed JSON in tool calls).
*   **Tool Errors:**
    *   `TOOL_NOT_FOUND`: The requested tool is not registered.
    *   `TOOL_SCHEMA_VALIDATION_FAILED`: Tool input arguments failed validation against the tool's schema.
    *   `TOOL_EXECUTION_ERROR`: A generic error occurred during the tool's `execute` method.
    *   `TOOL_DISABLED`: The tool is not enabled for the current thread.
*   **Agent Core / Orchestration Errors:**
    *   `PLANNING_FAILED`: The agent's planning phase failed.
    *   `TOOL_EXECUTION_FAILED`: The `ToolSystem` encountered an error executing one or more tools (distinct from an individual tool's `TOOL_EXECUTION_ERROR` status).
    *   `SYNTHESIS_FAILED`: The agent's synthesis phase failed.
    *   `AGENT_PROCESSING_ERROR`: A general error during the `agent.process()` cycle.
*   **Provider Manager Errors:**
    *   `UNKNOWN_PROVIDER`: The requested LLM provider name is not configured in `ProviderManagerConfig`.
    *   `LOCAL_PROVIDER_CONFLICT`: Attempted to activate a local provider when another is already active.
    *   `LOCAL_INSTANCE_BUSY`: Attempted to use a local provider instance that is currently busy.
    *   `ADAPTER_INSTANTIATION_ERROR`: Failed to create an instance of a provider adapter.
*   **General Errors:**
    *   `NETWORK_ERROR`: A network-related error occurred.
    *   `TIMEOUT_ERROR`: An operation timed out.
    *   `UNKNOWN_ERROR`: An unspecified or unexpected error.

## Best Practices for Error Handling

1.  **Catch and Wrap:** When implementing custom components (like tools or agent cores), if you catch an error from an external library or a lower-level operation, consider wrapping it in an `ARTError` with an appropriate `ErrorCode` and passing the original error as the third argument. This provides more context.

    ```typescript
    // import { ARTError, ErrorCode, Logger } from 'art-framework';
    // async function myCustomToolExecute(input: any): Promise<any> {
    //     try {
    //         const externalResult = await someExternalApiCall(input.param);
    //         return externalResult.data;
    //     } catch (e: any) {
    //         Logger.error("External API call failed in MyCustomTool", e);
    //         throw new ARTError(
    //             `MyCustomTool failed: External API error - ${e.message}`,
    //             ErrorCode.TOOL_EXECUTION_ERROR, // Or a more specific custom error code
    //             e
    //         );
    //     }
    // }
    ```

2.  **Check `ErrorCode`:** When handling errors from ART framework functions (like `art.process()`), you can inspect the `error.code` property if the error is an `ARTError` instance to implement specific recovery or logging logic.

    ```typescript
    // import { ARTError, ErrorCode } from 'art-framework';
    // async function runApp() {
    //     try {
    //         const result = await art.process({ /* ... */ });
    //         // ...
    //     } catch (error: any) {
    //         if (error instanceof ARTError) {
    //             console.error(`ART Error [${error.code}]: ${error.message}`);
    //             if (error.code === ErrorCode.MISSING_API_KEY) {
    //                 // Prompt user to configure API key
    //             } else if (error.code === ErrorCode.LLM_PROVIDER_ERROR) {
    //                 // Maybe retry or switch provider
    //             }
    //             if (error.originalError) {
    //                 console.error("Original error:", error.originalError);
    //             }
    //         } else {
    //             console.error("An unexpected error occurred:", error);
    //         }
    //     }
    // }
    ```

3.  **Use `ExecutionMetadata`:** The `AgentFinalResponse.metadata` object contains a `status` field ('success', 'error', 'partial') and an `error` message field. This provides a summary of the execution outcome even if the `process()` call itself doesn't throw a critical error (e.g., a tool fails but the agent can still synthesize a response).

4.  **Leverage Observations:** The `ObservationSystem` records `ERROR` type observations during agent execution. Subscribing to the `ObservationSocket` or querying the `ObservationRepository` can provide a detailed log of errors that occurred, including their phase and context.

By using `ARTError` and `ErrorCode` consistently, the framework and applications built on it can handle errors in a more structured and informative way.