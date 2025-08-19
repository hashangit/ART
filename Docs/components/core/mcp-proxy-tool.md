# McpProxyTool

The `McpProxyTool` is a specialized tool that acts as a bridge between the ART framework's `ToolSystem` and a remote MCP server. It allows an agent to expose tools from another MCP-enabled service as if they were its own native tools.

## Role and Responsibilities

*   **Tool Proxying:** It takes a tool call intended for a remote service, forwards it to the appropriate MCP server, and returns the result to the local agent.
*   **Dynamic Tool Schema:** It can dynamically fetch the schemas of the remote tools from the MCP server and provide them to the local `ToolRegistry`. This allows the local agent's LLM to know about and use the remote tools.
*   **Seamless Integration:** It integrates seamlessly with the local `ToolSystem`, making the remote tools appear as regular tools to the `PESAgent` and the LLM.

## Use Cases

*   **Tool Sharing:** An agent can "borrow" tools from another, more specialized agent or service without needing to have the implementation of those tools locally.
*   **Microservice Architectures:** In a system composed of multiple microservices, each with its own set of tools, the `McpProxyTool` can be used to create a unified toolset for a primary agent.
*   **Legacy System Integration:** It can be used to wrap a legacy system that exposes its functionality via an MCP server, making that functionality available to a modern ART agent.

## How It Works

1.  **Initialization:** An `McpProxyTool` is created for a specific MCP server. It is configured with an `McpClient` for communicating with that server.

2.  **Schema Fetching:** When the `McpProxyTool` is registered with the local `ToolRegistry`, it can be configured to fetch the schemas of all the tools available on the remote MCP server. It then registers these schemas with the local `ToolRegistry`, prefixed with a unique identifier for the remote service.

3.  **Execution:** When the LLM decides to use one of the remote tools, the local `ToolSystem` invokes the `execute` method of the `McpProxyTool`.

4.  **Forwarding:** The `McpProxyTool` takes the tool call, uses its `McpClient` to forward the call to the remote MCP server, and waits for the result.

5.  **Returning the Result:** The result from the remote server is then returned back through the local `ToolSystem` to the `PESAgent`, just like the result of a native tool.

## Example

Imagine you have a `CalculatorService` running as a separate MCP server with a tool called `add`.

1.  You would create an `McpProxyTool` for the `CalculatorService`.
2.  This proxy tool would register a tool with the schema for `add` in the local `ToolRegistry`, perhaps with the name `calculator.add`.
3.  When the LLM needs to add two numbers, it would generate a tool call for `calculator.add`.
4.  The `McpProxyTool` would intercept this call, send the `add` request to the `CalculatorService`, get the result, and return it to the local agent.

This powerful mechanism allows for the creation of highly modular and reusable toolsets in a distributed agent system.