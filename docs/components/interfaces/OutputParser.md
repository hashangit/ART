[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OutputParser

# Interface: OutputParser

Defined in: [src/core/interfaces.ts:150](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L150)

Interface for parsing structured output from LLM responses.

## Methods

### parsePlanningOutput()

> **parsePlanningOutput**(`output`): `Promise`\<\{ `intent?`: `string`; `plan?`: `string`; `toolCalls?`: [`ParsedToolCall`](ParsedToolCall.md)[]; \}\>

Defined in: [src/core/interfaces.ts:158](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L158)

Parses the raw string output from the planning LLM call to extract structured information.
Implementations should be robust to variations in LLM output formatting.

#### Parameters

##### output

`string`

The raw string response from the planning LLM call.

#### Returns

`Promise`\<\{ `intent?`: `string`; `plan?`: `string`; `toolCalls?`: [`ParsedToolCall`](ParsedToolCall.md)[]; \}\>

A promise resolving to an object containing the extracted intent, plan description, and an array of parsed tool calls.

#### Throws

If the output cannot be parsed into the expected structure (typically code `OUTPUT_PARSING_FAILED`).

***

### parseSynthesisOutput()

> **parseSynthesisOutput**(`output`): `Promise`\<`string`\>

Defined in: [src/core/interfaces.ts:171](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L171)

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
