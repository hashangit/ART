[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtStandardMessageSchema

# Variable: ArtStandardMessageSchema

> `const` **ArtStandardMessageSchema**: `ZodEffects`\<`ZodObject`\<\{ `content`: `ZodUnion`\<\[`ZodString`, `ZodRecord`\<`ZodString`, `ZodAny`\>, `ZodNull`\]\>; `name`: `ZodOptional`\<`ZodString`\>; `role`: `ZodType`\<[`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md), `ZodTypeDef`, [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md)\>; `tool_call_id`: `ZodOptional`\<`ZodString`\>; `tool_calls`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `function`: `ZodObject`\<\{ `arguments`: `ZodString`; `name`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `arguments`: `string`; `name`: `string`; \}, \{ `arguments`: `string`; `name`: `string`; \}\>; `id`: `ZodString`; `type`: `ZodLiteral`\<`"function"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `function`: \{ `arguments`: `string`; `name`: `string`; \}; `id`: `string`; `type`: `"function"`; \}, \{ `function`: \{ `arguments`: `string`; `name`: `string`; \}; `id`: `string`; `type`: `"function"`; \}\>, `"many"`\>\>; \}, `"strict"`, `ZodTypeAny`, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}\>, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}\>

Defined in: [src/types/schemas.ts:21](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/schemas.ts#L21)

Zod schema for validating a single [ArtStandardMessage](../interfaces/ArtStandardMessage.md) object.

## Remarks

This schema enforces the structural and type requirements for each message, including:
- A valid `role` from the [ArtStandardMessageRole](../type-aliases/ArtStandardMessageRole.md) enum.
- `content` that matches the expected type for a given role (e.g., string for 'user', string or null for 'assistant').
- The presence of `tool_call_id` for 'tool' or 'tool_result' roles.
- The structure of `tool_calls` when present in an 'assistant' message.

It uses a `.refine()` method to implement context-aware validation based on the message's `role`.
