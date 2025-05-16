[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / PESAgent

# Class: PESAgent

Defined in: [core/agents/pes-agent.ts:85](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/agents/pes-agent.ts#L85)

Implements the Plan-Execute-Synthesize (PES) agent orchestration logic.
This agent follows a structured approach:
1.  **Plan:** Understand the user query, determine intent, and create a plan (potentially involving tool calls).
2.  **Execute:** Run any necessary tools identified in the planning phase.
3.  **Synthesize:** Generate a final response based on the query, plan, and tool results.

It constructs standardized prompts (`ArtStandardPrompt`) directly as JavaScript objects
for the `ReasoningEngine`. It processes the `StreamEvent` output from the reasoning engine for both planning and synthesis.

## Implements

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

Defined in: [core/agents/pes-agent.ts:94](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/agents/pes-agent.ts#L94)

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

Defined in: [core/agents/pes-agent.ts:126](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/agents/pes-agent.ts#L126)

Executes the full Plan-Execute-Synthesize cycle for a given user query.

**Workflow:**
1.  **Initiation & Config:** Loads thread configuration and system prompt.
2.  **Data Gathering:** Gathers history, available tools, system prompt, and query.
3.  **Planning Prompt Construction:** Directly constructs the `ArtStandardPrompt` object/array for planning.
4.  **Planning LLM Call:** Sends the planning prompt object to the `reasoningEngine` (requesting streaming). Consumes the `StreamEvent` stream, buffers the output text, and handles potential errors.
5.  **Planning Output Parsing:** Parses the buffered planning output text to extract intent, plan, and tool calls using `outputParser.parsePlanningOutput`.
6.  **Tool Execution:** Executes identified tool calls via the `toolSystem`.
7.  **Data Gathering (Synthesis):** Gathers the original query, plan, tool results, history, etc.
8.  **Synthesis Prompt Construction:** Directly constructs the `ArtStandardPrompt` object/array for synthesis.
9.  **Synthesis LLM Call:** Sends the synthesis prompt object to the `reasoningEngine` (requesting streaming). Consumes the `StreamEvent` stream, buffers the final response text, and handles potential errors.
10. **Finalization:** Saves the final AI message, updates state if needed, records observations, and returns the result.

**Error Handling:**
- Errors during critical phases (planning/synthesis LLM call) will throw an `ARTError`. Prompt construction errors are less likely but possible if data is malformed.
- Errors during tool execution or synthesis LLM call might result in a 'partial' success status, potentially using the error message as the final response content.

#### Parameters

##### props

[`AgentProps`](../interfaces/AgentProps.md)

The input properties containing the user query, threadId, userId, traceId, etc.

#### Returns

`Promise`\<[`AgentFinalResponse`](../interfaces/AgentFinalResponse.md)\>

A promise resolving to the final response, including the AI message and execution metadata.

#### Throws

If a critical error occurs that prevents the agent from completing the process (e.g., config loading, planning failure).

#### See

 - 
 - //
 - // Removed - context is implicit in object construction
 - 
 - 

#### Implementation of

[`IAgentCore`](../interfaces/IAgentCore.md).[`process`](../interfaces/IAgentCore.md#process)
