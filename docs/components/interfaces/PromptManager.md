[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PromptManager

# Interface: PromptManager

Defined in: [src/core/interfaces.ts:92](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L92)

Interface for the stateless prompt assembler.
Uses a blueprint (template) and context provided by Agent Logic
to create a standardized prompt format (`ArtStandardPrompt`).

## Methods

### assemblePrompt()

> **assemblePrompt**(`blueprint`, `context`): `Promise`\<[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)\>

Defined in: [src/core/interfaces.ts:122](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L122)

Assembles a prompt using a Mustache template (blueprint) and context data.
Renders the template with the provided context and parses the result as an ArtStandardPrompt.

#### Parameters

##### blueprint

[`PromptBlueprint`](PromptBlueprint.md)

The Mustache template containing the prompt structure.

##### context

[`PromptContext`](PromptContext.md)

The context data to inject into the template.

#### Returns

`Promise`\<[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)\>

A promise resolving to the assembled ArtStandardPrompt.

#### Throws

If template rendering or JSON parsing fails.

***

### getFragment()

> **getFragment**(`name`, `context?`): `string`

Defined in: [src/core/interfaces.ts:102](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L102)

Retrieves a named prompt fragment (e.g., a piece of instruction text).
Optionally allows for simple variable substitution if the fragment is a basic template.

#### Parameters

##### name

`string`

The unique identifier for the fragment.

##### context?

`Record`\<`string`, `any`\>

Optional data for simple variable substitution within the fragment.

#### Returns

`string`

The processed prompt fragment string.

#### Throws

If the fragment is not found.

***

### validatePrompt()

> **validatePrompt**(`prompt`): [`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

Defined in: [src/core/interfaces.ts:111](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/core/interfaces.ts#L111)

Validates a constructed prompt object against the standard schema.

#### Parameters

##### prompt

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The ArtStandardPrompt object constructed by the agent.

#### Returns

[`ArtStandardPrompt`](../type-aliases/ArtStandardPrompt.md)

The validated prompt object (potentially after normalization if the schema does that).

#### Throws

If validation fails (can be caught and wrapped in ARTError).
