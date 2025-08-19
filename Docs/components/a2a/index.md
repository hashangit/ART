# A2A Delegation

The Agent-to-Agent (A2A) Delegation system in ART enables one agent to delegate a task to another, more specialized agent. This allows for the creation of complex, multi-agent systems where different agents can collaborate to solve a problem. The A2A system is designed as a hybrid model, combining programmatic filtering with LLM-driven reasoning to select the best agent for a given task.

## Core Components

*   **[AgentDiscoveryService](./agent-discovery-service.md):** This service is responsible for finding and ranking potential delegate agents based on a task description. It programmatically filters a list of available agents to find the most suitable candidates.

*   **[TaskDelegationService](./task-delegation-service.md):** This service handles the actual process of delegating a task to another agent once a selection has been made. It manages the communication and lifecycle of the delegated task.

## The Hybrid Selection Model

The A2A system uses a two-step process to select a delegate agent:

1.  **Programmatic Filtering:** The `AgentDiscoveryService` performs an initial pass to identify a small list of candidate agents that are most relevant to the task. This is a fast and efficient way to narrow down the options.

2.  **LLM-Driven Selection:** The list of candidate agents is then passed to the LLM as part of the planning prompt. The LLM, with its deep understanding of the task, can then make an informed decision about which agent is the best fit. This combines the speed of programmatic filtering with the reasoning capabilities of the LLM.

## How It Works

The A2A delegation flow is orchestrated by the `PESAgent`. For a detailed, step-by-step explanation of the entire process, including a sequence diagram, please see the high-level [A2A Task Delegation](../../core-concepts/a2a-delegation.md) documentation.