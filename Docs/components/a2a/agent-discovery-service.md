# AgentDiscoveryService

The `AgentDiscoveryService` is a key component of the A2A delegation system. Its primary role is to programmatically filter and rank a list of available agents to find the most suitable candidates for a given task. This service provides the first layer of the hybrid selection model, efficiently narrowing down the options before the LLM makes the final decision.

## Role and Responsibilities

*   **Agent Registry:** The service maintains a registry of all available agents that can be delegated to. This registry is typically populated from a configuration file or a service discovery mechanism.
*   **Task Analysis:** It performs a basic analysis of the task description to extract keywords and other relevant information.
*   **Filtering and Ranking:** It uses the analyzed task information to filter the list of available agents and rank them based on their suitability. The ranking algorithm can be based on various factors, such as keyword matching in the agent's description, the tools the agent has available, or other metadata.
*   **Candidate Selection:** It returns a short, ranked list of the top candidate agents to the `PESAgent`.

## How It Works

1.  **Configuration:** The `AgentDiscoveryService` is initialized with a list of available agents. Each agent in the list should have metadata that describes its capabilities, such as a name, a description, and a list of tools it can use.

2.  **Finding Agents:** When the `PESAgent` needs to consider delegating a task, it calls the `findTopAgentsForTask` method on the `AgentDiscoveryService`, passing the task description.

3.  **Ranking:** The `AgentDiscoveryService` iterates through its list of registered agents and calculates a relevance score for each one based on the task description. A simple implementation might use keyword matching between the task description and the agent's metadata.

4.  **Returning Candidates:** The service returns a ranked list of the top N agents (e.g., the top 3) to the `PESAgent`.

## Example Usage

The `AgentDiscoveryService` is used internally by the `PESAgent`. Here is a conceptual example of how it might be configured and used:

```typescript
// In your configuration
const availableAgents = [
  {
    id: "TravelAgent",
    description: "An agent that can book flights, hotels, and rental cars.",
    tools: ["bookFlight", "bookHotel"],
  },
  {
    id: "DataAnalysisAgent",
    description: "An agent that can analyze data, create charts, and generate reports.",
    tools: ["runQuery", "createChart"],
  },
];

const discoveryService = new AgentDiscoveryService(availableAgents);

// Inside the PESAgent, when processing a task
const taskDescription = "Book a flight to Paris for next week.";
const candidateAgents = await discoveryService.findTopAgentsForTask(taskDescription);

// candidateAgents would likely be: [{ id: "TravelAgent", ... }]
```

The `PESAgent` would then take this list of candidates and inject it into the prompt for the LLM, allowing the LLM to make the final selection.

## Customization

The default `AgentDiscoveryService` can be extended or replaced with a custom implementation to support more sophisticated ranking algorithms. For example, you could create a version that uses vector embeddings to find semantically similar agents, or one that queries an external agent registry service.