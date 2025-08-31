[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PESAgent

# Class: PESAgent

Defined in: [src/core/agents/pes-agent.ts:106](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L106)

Implements the Plan-Execute-Synthesize (PES) agent orchestration logic.
This agent follows a structured approach:
1.  **Plan:** Understand the user query, determine intent, and create a plan (potentially involving tool calls).
2.  **Execute:** Run any necessary tools identified in the planning phase.
3.  **Synthesize:** Generate a final response based on the query, plan, and tool results.

It constructs standardized prompts (`ArtStandardPrompt`) directly as JavaScript objects
for the `ReasoningEngine`. It processes the `StreamEvent` output from the reasoning engine for both planning and synthesis.

//

## See

 - // Removed
 - 
 - 
 - 

## Implements

- [`IAgentCore`](../interfaces/IAgentCore.md)

## Constructors

### Constructor

> **new PESAgent**(`dependencies`): `PESAgent`

Defined in: [src/core/agents/pes-agent.ts:121](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L121)

Creates an instance of the PESAgent.

#### Parameters

##### dependencies

[`PESAgentDependencies`](../interfaces/PESAgentDependencies.md)

An object containing instances of all required subsystems (managers, registries, etc.).

#### Returns

`PESAgent`

## Methods

### process()

> **process**(`props`): `Promise`\<[`AgentFinalResponse`](../interfaces/AgentFinalResponse.md)\>

Defined in: [src/core/agents/pes-agent.ts:142](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L142)

Executes the full Plan-Execute-Synthesize cycle for a given user query.

**Workflow:**
1.  **Initiation & Config:** Loads thread configuration and resolves system prompt
2.  **Data Gathering:** Gathers history, available tools
3.  **Planning:** LLM call for planning and parsing
4.  **A2A Discovery & Delegation:** Identifies and delegates A2A tasks to remote agents
5.  **Tool Execution:** Executes identified local tool calls
6.  **Synthesis:** LLM call for final response generation including A2A results
7.  **Finalization:** Saves messages and cleanup

#### Parameters

##### props

[`AgentProps`](../interfaces/AgentProps.md)

The input properties containing the user query, threadId, userId, traceId, etc.

#### Returns

`Promise`\<[`AgentFinalResponse`](../interfaces/AgentFinalResponse.md)\>

A promise resolving to the final response, including the AI message and execution metadata.

#### Throws

If a critical error occurs that prevents the agent from completing the process.

#### Implementation of

[`IAgentCore`](../interfaces/IAgentCore.md).[`process`](../interfaces/IAgentCore.md#process)
