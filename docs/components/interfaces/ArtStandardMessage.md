[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtStandardMessage

# Interface: ArtStandardMessage

Defined in: [src/types/index.ts:899](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L899)

Represents a single message in the standardized, provider-agnostic `ArtStandardPrompt` format.

## Remarks

This structure aims to capture common message elements used by various LLM APIs.

 ArtStandardMessage

## Properties

### content

> **content**: `null` \| `string` \| `object`

Defined in: [src/types/index.ts:914](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L914)

The primary content of the message. The type and interpretation depend on the `role`:
- `system`: string (The system instruction).
- `user`: string (The user's text input).
- `assistant`: string | null (The AI's text response, or null/empty if only making `tool_calls`).
- `tool_request`: object | null (Structured representation of the tool call, often implicitly handled via `assistant` message's `tool_calls`).
- `tool_result`: string (Stringified JSON output or error message from the tool execution).

***

### name?

> `optional` **name**: `string`

Defined in: [src/types/index.ts:919](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L919)

Optional name associated with the message. Primarily used for `tool_result` role to specify the name of the tool that was executed.

***

### role

> **role**: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md)

Defined in: [src/types/index.ts:904](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L904)

The role indicating the source or type of the message.

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/types/index.ts:948](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L948)

Optional identifier linking a 'tool_result' message back to the specific 'tool_calls' entry
in the preceding 'assistant' message that requested it.
Required for 'tool_result' role.

***

### tool\_calls?

> `optional` **tool\_calls**: `object`[]

Defined in: [src/types/index.ts:929](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L929)

Optional array of tool calls requested by the assistant.

#### function

> **function**: `object`

Details of the function to be called.

##### function.arguments

> **arguments**: `string`

A stringified JSON object representing the arguments for the function.

##### function.name

> **name**: `string`

The name of the function/tool to call.

#### id

> **id**: `string`

A unique identifier for this specific tool call request.

#### type

> **type**: `"function"`

The type of the tool call, typically 'function'.

#### Remarks

Only relevant for 'assistant' role messages that trigger tool usage.
Structure mirrors common provider formats (e.g., OpenAI).
