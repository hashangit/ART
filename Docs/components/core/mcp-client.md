# McpClient

The `McpClient` is a crucial component in the ART framework, responsible for handling communication with MCP (Model-Centric Programming) servers. It provides the foundation for features like Agent-to-Agent (A2A) delegation and remote tool execution. The `McpClient` has been refactored to be browser-first, using the native `fetch` API and removing all Node.js-specific dependencies.

## Role and Responsibilities

*   **MCP Communication:** It implements the client-side of the Model-Centric Programming protocol, enabling an ART instance to connect to and interact with an MCP server.
*   **Remote Method Invocation:** It allows the framework to invoke methods on a remote service, such as calling the `process` method of a delegate agent in an A2A scenario.
*   **Streamable HTTP Transport:** It uses a streamable HTTP transport layer to handle real-time, bidirectional communication with the server, making it efficient for streaming LLM responses and other events.
*   **Authentication:** It integrates with the `AuthManager` to automatically include authentication tokens in its requests, ensuring secure communication with protected MCP servers.

## Browser-First Design

The `McpClient` was redesigned with a browser-first philosophy, which involved several key changes:

*   **Removal of Node.js Dependencies:** All dependencies on Node.js built-in modules, such as `http`, `https`, and `events`, have been removed.
*   **Use of `fetch` API:** The client now uses the browser-native `fetch` API for all HTTP requests. This makes it compatible with any modern web browser without requiring polyfills or special configurations.
*   **Configurable URLs:** The URLs for MCP servers are now fully configurable, allowing the client to connect to any reachable MCP server, whether it's running locally, on a private network, or on the public internet.

## How It Works

1.  **Instantiation:** An `McpClient` is typically instantiated by a service that needs to communicate with an MCP server, such as the `TaskDelegationService`. It is created with the URL of the target MCP server.

2.  **Authenticated Requests:** When the client needs to make a request, it first consults the `AuthManager` to get a valid authentication token. This token is then included in the `Authorization` header of the `fetch` request.

3.  **Streaming Responses:** The client is capable of handling streaming responses from the server. This is essential for features like receiving real-time `LLMStreamEvent`s from a delegate agent. It processes the stream chunk by chunk, parsing events as they arrive.

## Example Usage

The `McpClient` is primarily used internally by other framework components. Here is a conceptual example of how the `TaskDelegationService` might use it to delegate a task:

```typescript
import { McpClient } from "@art-framework/core";

class TaskDelegationService {
  private getClientForAgent(agentId: string): McpClient {
    const agentUrl = this.agentEndpoints[agentId];
    // The McpClient would be created with the agent's URL and access to the AuthManager
    return new McpClient(agentUrl, this.authManager);
  }

  async delegateTask(agentId: string, taskDetails: any): Promise<any> {
    const client = this.getClientForAgent(agentId);

    // The client's 'call' method would make a POST request to the MCP server
    const result = await client.call("process", taskDetails);

    return result;
  }
}
```

In this example, the `TaskDelegationService` creates an `McpClient` for the specific delegate agent it wants to communicate with. It then uses the client's `call` method to invoke the `process` method on the remote agent, passing the task details. The `McpClient` handles the details of the HTTP request, including authentication and response parsing.