# TaskDelegationService

The `TaskDelegationService` is the component responsible for the actual execution of a delegated task. Once the `PESAgent` has decided (with the help of the LLM) which agent to delegate to, it uses the `TaskDelegationService` to initiate and manage the task on the delegate agent.

## Role and Responsibilities

*   **Task Execution:** It handles the logic of sending the task to the chosen delegate agent and starting its execution.
*   **Communication:** It manages the communication channel with the delegate agent, which could be an MCP connection, a direct API call, or another mechanism.
*   **Lifecycle Management:** It can be responsible for managing the lifecycle of the delegated task, including tracking its status and handling completion or failure.
*   **Result Handling:** It receives the result from the delegate agent and returns it to the initiating `PESAgent`.

## How It Works

1.  **Initiation:** The `PESAgent` calls the `delegateTask` method on the `TaskDelegationService`, providing the ID of the delegate agent and the task details.

2.  **Connection:** The `TaskDelegationService` establishes a connection to the delegate agent. In the ART framework, this is typically done via an `McpClient` that connects to the delegate agent's MCP server.

3.  **Task Invocation:** It sends the task to the delegate agent, for example, by calling the `process` method on the delegate agent's `ArtInstance` through the MCP connection.

4.  **Monitoring:** The service can monitor the progress of the delegated task, potentially by subscribing to the delegate agent's `ObservationSocket` or `ConversationSocket`.

5.  **Returning the Result:** When the delegate agent completes the task, it sends a final response. The `TaskDelegationService` captures this response and returns it to the `PESAgent` that initiated the delegation.

## Example Usage

The `TaskDelegationService` is used internally by the `PESAgent`. Here is a conceptual example of how it might be used:

```typescript
// Inside the PESAgent, after the LLM has selected a delegate agent

const delegateAgentId = "TravelAgent";
const taskDetails = {
  description: "Book a flight to Paris for next week.",
  // ... other task parameters
};

try {
  const result = await taskDelegationService.delegateTask(delegateAgentId, taskDetails);
  // The PESAgent can now use the result to continue its own plan
  console.log("Delegated task completed with result:", result);
} catch (error) {
  console.error("Delegated task failed:", error);
  // The PESAgent can handle the error and potentially try another approach
}
```

## Configuration

The `TaskDelegationService` needs to be configured with the connection details for the available delegate agents. This is typically done by providing a mapping of agent IDs to their MCP server URLs.

```typescript
// In your configuration
const agentEndpoints = {
  TravelAgent: "http://localhost:8081/mcp",
  DataAnalysisAgent: "http://localhost:8082/mcp",
};

const taskDelegationService = new TaskDelegationService(agentEndpoints);
```

This configuration allows the `TaskDelegationService` to know where to send the delegation request for a given agent ID.