[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / PromptManager

# Interface: PromptManager

Defined in: [core/interfaces.ts:92](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L92)

Interface for the stateless prompt assembler.
Uses a blueprint (template) and context provided by Agent Logic
to create a standardized prompt format (`ArtStandardPrompt`).

## Methods

### getFragment()

> **getFragment**(`name`, `context`?): `string`

Defined in: [core/interfaces.ts:102](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L102)

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

Defined in: [core/interfaces.ts:111](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/core/interfaces.ts#L111)

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
