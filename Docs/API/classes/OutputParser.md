[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / OutputParser

# Class: OutputParser

Defined in: [systems/reasoning/OutputParser.ts:26](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/systems/reasoning/OutputParser.ts#L26)

Default implementation of the `OutputParser` interface.
Responsible for extracting structured data (intent, plan, tool calls) from the planning phase
LLM response and the final response content from the synthesis phase response.
Includes robust parsing for tool call JSON arrays and Zod validation.

## Implements

## Implements

- `OutputParser`

## Constructors

### Constructor

> **new OutputParser**(): `OutputParser`

#### Returns

`OutputParser`

## Methods

### parsePlanningOutput()

> **parsePlanningOutput**(`output`): `Promise`\<\{ `intent`: `string`; `plan`: `string`; `thoughts`: `string`; `toolCalls`: [`ParsedToolCall`](../interfaces/ParsedToolCall.md)[]; \}\>

Defined in: [systems/reasoning/OutputParser.ts:50](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/systems/reasoning/OutputParser.ts#L50)

Parses the raw string output from the planning LLM call to extract structured information.

This method performs the following steps:
1. Uses `XmlMatcher` to identify and extract content within `<think>...</think>` tags.
   This extracted content is aggregated into the `thoughts` field of the result.
2. The remaining content (outside of `<think>` tags) is then parsed for sections
   explicitly marked with "Intent:", "Plan:", and "Tool Calls:".
3. It attempts to find and parse a JSON array within the "Tool Calls:" section, handling
   potential markdown fences (e.g., ```json ... ```) and validating the structure using Zod.

#### Parameters

##### output

`string`

The raw string response from the planning LLM call, which may include
                text, `<think>` tags, and sections for Intent, Plan, and Tool Calls.

#### Returns

`Promise`\<\{ `intent`: `string`; `plan`: `string`; `thoughts`: `string`; `toolCalls`: [`ParsedToolCall`](../interfaces/ParsedToolCall.md)[]; \}\>

A promise resolving to an object containing:
         - `thoughts?`: An optional string aggregating content from all `<think>` tags, separated by "\\n\\n---\\n\\n".
         - `intent?`: An optional string for the parsed intent.
         - `plan?`: An optional string for the parsed plan.
         - `toolCalls?`: An optional array of `ParsedToolCall` objects. This will be an empty array `[]`
                       if the "Tool Calls:" section is present in the non-thinking content but is empty,
                       or if the JSON is invalid/fails validation. It remains `undefined` if the
                       "Tool Calls:" section itself is missing from the non-thinking content.
         Fields will be `undefined` if the corresponding section is not found or cannot be parsed correctly.

#### Implementation of

`IOutputParser.parsePlanningOutput`

***

### parseSynthesisOutput()

> **parseSynthesisOutput**(`output`): `Promise`\<`string`\>

Defined in: [systems/reasoning/OutputParser.ts:188](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/systems/reasoning/OutputParser.ts#L188)

/**
 * Parses the raw string output from the synthesis LLM call to extract the final, user-facing response content.
 * This default implementation simply trims whitespace from the input string.
 * More complex implementations could potentially remove specific tags or formatting if needed.
 *

#### Parameters

##### output

`string`

The raw string response from the synthesis LLM call.
 *

#### Returns

`Promise`\<`string`\>

A promise resolving to the cleaned, final response string.

#### Implementation of

`IOutputParser.parseSynthesisOutput`
