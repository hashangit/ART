[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / PESAgent

# Class: PESAgent

Defined in: [core/agents/pes-agent.ts:62](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/agents/pes-agent.ts#L62)

Implements the Plan-Execute-Synthesize (PES) agent orchestration logic.
This agent follows a structured 6-stage process to handle user queries,
interact with LLMs and tools, and generate a final response.
It relies on various injected subsystems (managers, registries, etc.) to perform its tasks.
**Crucially, it determines the specific LLM capabilities required for its Planning and Synthesis stages.**

## Implements

- [`IAgentCore`](../interfaces/IAgentCore.md)

## Constructors

### Constructor

> **new PESAgent**(`dependencies`): `PESAgent`

Defined in: [core/agents/pes-agent.ts:69](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/agents/pes-agent.ts#L69)

Creates an instance of the PESAgent.

#### Parameters

##### dependencies

`PESAgentDependencies`

An object containing instances of all required subsystems (managers, registries, etc.).

#### Returns

`PESAgent`

## Methods

### process()

> **process**(`props`): `Promise`\<[`AgentFinalResponse`](../interfaces/AgentFinalResponse.md)\>

Defined in: [core/agents/pes-agent.ts:88](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/core/agents/pes-agent.ts#L88)

Executes the full Plan-Execute-Synthesize cycle for a given user query.

Stages:
1. Initiation & Config Loading: Loads thread-specific settings.
2. Planning Context Assembly: Gathers history and tool schemas.
3. Planning Call: First LLM call to generate intent, plan, and tool calls. **Determines the required capabilities (e.g., `REASONING`) for planning and includes them in the options passed to the `ReasoningEngine`.**
4. Tool Execution: Executes planned tool calls via the ToolSystem.
5. Synthesis Call: Second LLM call using plan and tool results to generate the final response. **Determines the required capabilities (e.g., `TEXT`, potentially `VISION` if applicable based on tool results) for synthesis and includes them in the options passed to the `ReasoningEngine`.**
6. Finalization: Saves messages and state, returns the final response.

#### Parameters

##### props

[`AgentProps`](../interfaces/AgentProps.md)

The input properties containing the user query, threadId, and optional context.

#### Returns

`Promise`\<[`AgentFinalResponse`](../interfaces/AgentFinalResponse.md)\>

A promise resolving to the AgentFinalResponse containing the AI's message and execution metadata.

#### Throws

If a critical error occurs during any stage that prevents completion (e.g., config loading, planning failure without fallback). Partial successes (e.g., tool errors followed by successful synthesis) might result in a 'partial' status in the metadata instead of throwing.

#### Implementation of

[`IAgentCore`](../interfaces/IAgentCore.md).[`process`](../interfaces/IAgentCore.md#process)
