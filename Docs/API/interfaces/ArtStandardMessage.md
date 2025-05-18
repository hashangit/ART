[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtStandardMessage

# Interface: ArtStandardMessage

Defined in: [src/types/index.ts:457](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L457)

Represents a single message in the standardized, provider-agnostic `ArtStandardPrompt` format.
This structure aims to capture common message elements used by various LLM APIs.

## Properties

### content

> **content**: `null` \| `string` \| `object`

Defined in: [src/types/index.ts:468](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L468)

The primary content of the message. The type and interpretation depend on the `role`:
- `system`: string (The system instruction).
- `user`: string (The user's text input).
- `assistant`: string | null (The AI's text response, or null/empty if only making `tool_calls`).
- `tool_request`: object | null (Structured representation of the tool call, often implicitly handled via `assistant` message's `tool_calls`).
- `tool_result`: string (Stringified JSON output or error message from the tool execution).

***

### name?

> `optional` **name**: `string`

Defined in: [src/types/index.ts:470](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L470)

Optional name associated with the message. Primarily used for `tool_result` role to specify the name of the tool that was executed.

***

### role

> **role**: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md)

Defined in: [src/types/index.ts:459](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L459)

The role indicating the source or type of the message.

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/types/index.ts:494](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L494)

Optional identifier linking a 'tool_result' message back to the specific 'tool_calls' entry
in the preceding 'assistant' message that requested it.
Required for 'tool_result' role.

***

### tool\_calls?

> `optional` **tool\_calls**: `object`[]

Defined in: [src/types/index.ts:476](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L476)

Optional array of tool calls requested by the assistant.
Only relevant for 'assistant' role messages that trigger tool usage.
Structure mirrors common provider formats (e.g., OpenAI).

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
