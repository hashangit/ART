# ART Tool Security and Best Practices

This guide provides recommendations for writing secure, robust, and maintainable native ART tools (implementing `IToolExecutor`). While the ART framework provides some safeguards like input schema validation and permission checks, the tool developer is ultimately responsible for the security and reliability of the tool's internal logic.

## Security Considerations

1.  **Input Validation &amp; Sanitization:**
    *   **Schema Validation:** The `ToolSystem` automatically validates incoming arguments against your tool's `inputSchema` before calling `execute`. Rely on this for basic structure and type checking.
    *   **Defensive Programming:** Within your `execute` method, still consider:
        *   **Type Checking/Casting:** Explicitly check or cast input types if your logic depends on them (e.g., `input.value as number`).
        *   **Range/Value Checks:** If inputs have specific constraints (e.g., positive numbers, specific enum values), validate these within your code.
        *   **Sanitization (Crucial for External Interactions):** If your tool interacts with external APIs, databases, file systems, or executes commands/code (like the `CalculatorTool` using `mathjs`), **you MUST sanitize inputs** to prevent injection attacks (SQL injection, command injection, cross-site scripting if generating HTML, etc.). Use appropriate libraries or techniques for the specific context. *Never* trust raw input for sensitive operations.
    *   **Example (`CalculatorTool`):** Uses `mathjs.evaluate` which provides its own sandboxed environment, and further restricts usable functions via an allowlist. This is much safer than using `eval()` or `new Function()`.

2.  **Error Handling:**
    *   **Graceful Failure:** Use `try...catch` blocks within `execute` to handle expected and unexpected errors.
    *   **Informative Messages:** Return clear, informative messages in the `error` field of the `ToolResult`. Avoid leaking sensitive internal details.
    *   **Logging:** Log detailed error information (including stack traces if helpful) using `Logger.error`, including the `callId`.

3.  **Tool Isolation &amp; Side Effects:**
    *   **Limited Context:** Tools receive minimal context (`ExecutionContext`). Avoid trying to access global state or other framework components directly.
    *   **Statelessness:** Design tools to be stateless whenever possible. If state is required across calls *within the same execution cycle*, manage it carefully within the `execute` method's scope. Avoid storing state in the tool class instance itself, as the instance might be reused unexpectedly or not persist across agent cycles. (Framework-level state management via `AgentState` is handled by the `StateManager`, not directly accessible to tools by default).
    *   **Minimize Side Effects:** Tools should ideally perform their specific function and return a result. Avoid unexpected side effects like modifying unrelated application state or making undocumented external calls.

4.  **Resource Management:**
    *   **External Calls:** If making network requests or interacting with external resources, handle timeouts and cleanup appropriately.
    *   **Performance:** Be mindful of performance, especially for tools running frequently or handling large data. Avoid blocking operations if possible. (Note: Basic execution timeouts are planned for the `ToolSystem` but not yet implemented in v0.2.4).

5.  **Dependencies:**
    *   Keep external dependencies to a minimum to reduce bundle size and potential security vulnerabilities.
    *   Vet any third-party libraries used within your tool.

## Best Practices

1.  **Clear Schema Definition:** A well-defined `ToolSchema` (especially the `description`, `inputSchema`, and `examples`) is crucial for the LLM to use your tool correctly and for other developers to understand it.
2.  **Focused Responsibility:** Design tools to perform a single, well-defined task. Complex operations might be better split into multiple tools.
3.  **Comprehensive Logging:** Use the `Logger` effectively (`debug`, `info`, `warn`, `error`) with the `callId` to aid debugging.
4.  **Unit Testing:** Write thorough unit tests for your tool's `execute` method using a testing framework like Vitest or Jest.
    *   Mock the `ExecutionContext`.
    *   Test valid inputs and expected successful `ToolResult` outputs.
    *   Test invalid or edge-case inputs and verify correct error `ToolResult` outputs.
    *   Test different code paths within your logic.
    *   If using external libraries (like `mathjs`), test the interaction with mocks or test instances if appropriate.
    *   Example: See `src/tools/CalculatorTool.test.ts`.
5.  **Code Clarity:** Write clean, readable, and well-commented code.

## Future Security Enhancements (Planned)

*   **WASM Sandboxing:** Executing tools compiled to WebAssembly within a secure sandbox environment.
*   **Execution Timeouts:** The `ToolSystem` plans to implement configurable timeouts to prevent runaway tools.

By adhering to these security considerations and best practices, you can contribute robust, reliable, and secure tools to the ART ecosystem.