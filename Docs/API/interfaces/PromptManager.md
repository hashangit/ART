[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / PromptManager

# Interface: PromptManager

Defined in: [core/interfaces.ts:55](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L55)

Interface for managing and constructing prompts for the LLM.

## Methods

### createPlanningPrompt()

> **createPlanningPrompt**(`query`, `history`, `systemPrompt`, `availableTools`, `threadContext`): `Promise`\<[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)\>

Defined in: [core/interfaces.ts:66](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L66)

Constructs the prompt specifically for the planning phase of an agent's execution cycle (e.g., in PES).
This prompt typically instructs the LLM to understand the query, form a plan, and identify necessary tool calls.

#### Parameters

##### query

`string`

The user's original query.

##### history

[`ConversationMessage`](ConversationMessage.md)[]

Recent conversation history relevant to the current context.

##### systemPrompt

The base system instructions for the agent in this thread.

`undefined` | `string`

##### availableTools

[`ToolSchema`](ToolSchema.md)[]

An array of schemas for tools that are enabled and available for use in this thread.

##### threadContext

[`ThreadContext`](ThreadContext.md)

The full context (config and state) for the current thread.

#### Returns

`Promise`\<[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)\>

A promise resolving to the formatted prompt (string or provider-specific object) ready for the `ReasoningEngine`.

***

### createSynthesisPrompt()

> **createSynthesisPrompt**(`query`, `intent`, `plan`, `toolResults`, `history`, `systemPrompt`, `threadContext`): `Promise`\<[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)\>

Defined in: [core/interfaces.ts:86](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L86)

Constructs the prompt specifically for the synthesis phase of an agent's execution cycle (e.g., in PES).
This prompt typically provides the LLM with the original query, the plan, tool results, and history, asking it to generate the final user-facing response.

#### Parameters

##### query

`string`

The user's original query.

##### intent

The intent extracted during the planning phase.

`undefined` | `string`

##### plan

The plan generated during the planning phase.

`undefined` | `string`

##### toolResults

[`ToolResult`](ToolResult.md)[]

An array of results obtained from executing the tools specified in the plan.

##### history

[`ConversationMessage`](ConversationMessage.md)[]

Recent conversation history.

##### systemPrompt

The base system instructions for the agent.

`undefined` | `string`

##### threadContext

[`ThreadContext`](ThreadContext.md)

The full context (config and state) for the current thread.

#### Returns

`Promise`\<[`FormattedPrompt`](../type-aliases/FormattedPrompt.md)\>

A promise resolving to the formatted prompt (string or provider-specific object) ready for the `ReasoningEngine`.
