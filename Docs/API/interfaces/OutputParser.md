[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / OutputParser

# Interface: OutputParser

Defined in: [core/interfaces.ts:100](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L100)

Interface for parsing structured output from LLM responses.

## Methods

### parsePlanningOutput()

> **parsePlanningOutput**(`output`): `Promise`\<\{ `intent`: `string`; `plan`: `string`; `toolCalls`: [`ParsedToolCall`](ParsedToolCall.md)[]; \}\>

Defined in: [core/interfaces.ts:108](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L108)

Parses the raw string output from the planning LLM call to extract structured information.
Implementations should be robust to variations in LLM output formatting.

#### Parameters

##### output

`string`

The raw string response from the planning LLM call.

#### Returns

`Promise`\<\{ `intent`: `string`; `plan`: `string`; `toolCalls`: [`ParsedToolCall`](ParsedToolCall.md)[]; \}\>

A promise resolving to an object containing the extracted intent, plan description, and an array of parsed tool calls.

#### Throws

If the output cannot be parsed into the expected structure (typically code `OUTPUT_PARSING_FAILED`).

***

### parseSynthesisOutput()

> **parseSynthesisOutput**(`output`): `Promise`\<`string`\>

Defined in: [core/interfaces.ts:121](https://github.com/hashangit/ART/blob/f4539b852e546bb06f1cc8c56173d3ccfb0ad7fa/src/core/interfaces.ts#L121)

Parses the raw string output from the synthesis LLM call to extract the final, user-facing response content.
This might involve removing extraneous tags or formatting.

#### Parameters

##### output

`string`

The raw string response from the synthesis LLM call.

#### Returns

`Promise`\<`string`\>

A promise resolving to the clean, final response string.

#### Throws

If the final response cannot be extracted (typically code `OUTPUT_PARSING_FAILED`).
