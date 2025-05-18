# Advanced: Security Considerations

When developing AI agents with the ART Framework, especially those that interact with external services, use tools, or handle user data, security is a critical concern. Here are key areas to consider:

## 1. API Key Management

*   **Never Hardcode API Keys:** API keys for LLM providers (OpenAI, Anthropic, etc.) or other services used by tools should **never** be hardcoded directly into your source code (client-side or server-side).
*   **Environment Variables:** For server-side applications or during local development, use environment variables (e.g., `process.env.OPENAI_API_KEY`). Use a `.env` file (added to `.gitignore`) for local development convenience.
*   **Secrets Management Services:** For production environments, use dedicated secrets management services like:
    *   AWS Secrets Manager
    *   Google Cloud Secret Manager
    *   Azure Key Vault
    *   HashiCorp Vault
    Your application backend should securely fetch keys from these services at startup or on demand.
*   **Backend Proxy for Client-Side Apps:** If your ART agent runs partly or wholly in a client-side environment (browser), **do not embed API keys directly in the client-side code.** Instead, have your client make requests to your own trusted backend server. Your backend server then securely holds the API keys and makes the calls to the LLM providers or other services on behalf of the client. This prevents exposure of your API keys to end-users. The `apiBaseUrl` option in `ProviderAdapter` configurations can be used to point adapters to your backend proxy.

## 2. Tool Security

Tools extend an agent's capabilities but can also introduce security risks if not handled carefully.

*   **Input Validation (`ToolSchema` & `validateJsonSchema`):**
    *   Always define a strict `inputSchema` (JSON Schema) for your tools.
    *   The `ToolSystem` uses `validateJsonSchema` to validate arguments provided by the LLM against this schema before executing the tool. This helps prevent injection attacks or unexpected behavior due to malformed input.
    *   Be specific with types, formats, and constraints in your JSON Schemas.
*   **Principle of Least Privilege:**
    *   Tools should only have the minimum permissions necessary to perform their function. For example, a tool that reads from a database should use credentials with read-only access if it doesn't need to write.
    *   If a tool interacts with external APIs, the API keys it uses should be scoped to the minimum required permissions for that tool's operation.
*   **Sandboxing:**
    *   For tools that execute code or evaluate expressions (like the `CalculatorTool` using `mathjs`), ensure they operate in a sandboxed or restricted environment to prevent execution of arbitrary, malicious code. The `CalculatorTool` uses a limited scope of `mathjs` functions.
*   **Output Sanitization (Less Common for Tools, More for LLM):**
    *   While less common for direct tool output, if a tool's output is directly rendered in a UI without sanitization, be mindful of potential XSS vulnerabilities if the output could contain user-generated or externally sourced HTML/script content. Usually, the LLM's synthesis of tool output is the part that needs more careful handling for UI display.
*   **Tool Enablement (`ThreadConfig.enabledTools`):**
    *   Use `ThreadConfig.enabledTools` to restrict which tools are available for a specific conversation thread or user context. This prevents an LLM from attempting to use inappropriate or unauthorized tools. `ToolRegistry` (if configured with `StateManager`) and `ToolSystem` respect this.

## 3. LLM Prompt Injection

*   **Risk:** Malicious users might try to craft inputs (queries) that trick the LLM into ignoring previous instructions, revealing sensitive parts of its system prompt, or causing it to execute unintended tool calls.
*   **Mitigations:**
    *   **Instructional System Prompts:** Clearly instruct the LLM on its role, capabilities, and limitations. Explicitly tell it not to deviate from its core instructions or reveal its full prompt.
    *   **Input Sanitization/Filtering (Limited Effectiveness):** While difficult to do perfectly, some basic filtering of user input for known malicious patterns or instruction-like phrases can be a layer of defense, but it's not foolproof.
    *   **Output Parsing & Validation:** Carefully parse and validate the LLM's output, especially the "Tool Calls:" section. The `OutputParser` and `ToolSystem`'s schema validation help here. Do not blindly execute any tool call suggested by the LLM.
    *   **Few-Shot Prompting with Examples:** Show the LLM examples of valid and invalid requests or tool uses to guide its behavior.
    *   **Defense in Depth:** Combine multiple strategies. Prompt injection is an ongoing research area.
    *   **Use Models with Built-in Defenses:** Some newer models are being trained to be more resilient to prompt injection.

## 4. Data Privacy and Storage

*   **Conversation History (`ConversationRepository`):**
    *   Be mindful of the sensitivity of data stored in conversation logs. This can include Personally Identifiable Information (PII) or other confidential data shared by users.
    *   If using `IndexedDBStorageAdapter`, the data is stored on the user's client machine. Inform users about this data storage and its implications (e.g., accessible via browser dev tools).
    *   If using a custom `StorageAdapter` with a remote database:
        *   Ensure appropriate database security measures (access controls, network security).
        *   Encrypt data at rest and in transit.
        *   Implement robust authentication and authorization for database access.
    *   Implement data retention policies according to legal and business requirements.
    *   Provide mechanisms for users to export or delete their data if required by privacy regulations (e.g., GDPR, CCPA).
*   **Agent State (`StateRepository`):**
    *   `AgentState` can also store sensitive user preferences or accumulated information. Apply the same privacy and security considerations as for conversation history.
*   **Observations (`ObservationRepository`):**
    *   Observations can log detailed internal workings of the agent, including inputs to tools or intermediate LLM outputs (`<think>` tags). This data can be sensitive.
    *   Secure access to observation logs and apply retention policies. Avoid logging overly sensitive raw data directly into observation content if possible; prefer summaries or anonymized forms if the raw data isn't strictly needed for debugging.

## 5. UI Socket Communication

*   If your ART application exposes its UI Sockets (`LLMStreamSocket`, `ObservationSocket`, `ConversationSocket`) over a network (e.g., via WebSockets to a frontend application):
    *   **Secure the Channel:** Use encrypted communication (e.g., WSS for WebSockets, HTTPS for Server-Sent Events).
    *   **Authentication & Authorization:** Implement authentication to ensure only legitimate clients can connect to the sockets. Authorize subscriptions based on user identity and thread ownership/permissions to prevent users from eavesdropping on or interfering with other users' sessions or threads.
    *   **Input Validation (for control messages):** If your socket protocol allows clients to send control messages to the backend, validate these messages rigorously.

## 6. Denial of Service (DoS) / Resource Exhaustion

*   **LLM Costs:** Uncontrolled or malicious use of an agent that makes many LLM calls can lead to high costs. Implement rate limiting, quotas, or monitoring for API usage.
*   **Tool Execution:** Tools that consume significant resources (CPU, memory, network bandwidth, external API quotas) could be targets for DoS if an attacker can trigger them repeatedly with expensive inputs. Implement input validation, timeouts, and rate limiting for such tools.
*   **Storage Growth:** Unbounded conversation history or observation logging can lead to excessive storage consumption. Implement pruning or archival strategies.

## 7. Third-Party Dependencies

*   Keep all third-party libraries, including the ART Framework itself and any SDKs (e.g., `@anthropic-ai/sdk`, `@google/genai`, `openai`), up to date with security patches.
*   Audit dependencies for known vulnerabilities.

## 8. Secure Development Practices

*   Follow standard secure coding practices (input validation, output encoding if rendering LLM output directly to HTML, proper error handling that doesn't leak sensitive information).
*   Regularly review and audit your agent's prompts, tool configurations, and data handling logic for potential security weaknesses.
*   Consider threat modeling for your specific agent application to identify potential attack vectors.

Security is an ongoing process, not a one-time setup. As your agent's capabilities and integrations grow, continuously reassess and enhance its security posture.