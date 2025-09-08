[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OutputParser

# Interface: OutputParser

Defined in: [src/core/interfaces.ts:150](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L150)

Interface for parsing structured output from LLM responses.

## Methods

### parsePlanningOutput()

> **parsePlanningOutput**(`output`): `Promise`\<\{ `intent?`: `string`; `plan?`: `string`; `thoughts?`: `string`; `title?`: `string`; `toolCalls?`: [`ParsedToolCall`](ParsedToolCall.md)[]; \}\>

Defined in: [src/core/interfaces.ts:171](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L171)

Parses the raw planning LLM output into structured fields.

#### Parameters

##### output

`string`

#### Returns

`Promise`\<\{ `intent?`: `string`; `plan?`: `string`; `thoughts?`: `string`; `title?`: `string`; `toolCalls?`: [`ParsedToolCall`](ParsedToolCall.md)[]; \}\>

#### Remarks

This method should be resilient to provider-specific wrappers and formats.
Implementations MUST attempt JSON-first parsing and then fall back to parsing
labeled sections. Supported fields:
- `title?`: A concise thread title (<= 10 words), derived from the user's intent and context.
- `intent?`: A short summary of the user's goal.
- `plan?`: A human-readable list/description of steps.
- `toolCalls?`: Structured tool call intents parsed from the output.
- `thoughts?`: Aggregated content extracted from <think> tags when present.

***

### parseSynthesisOutput()

> **parseSynthesisOutput**(`output`): `Promise`\<`string`\>

Defined in: [src/core/interfaces.ts:186](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L186)

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
