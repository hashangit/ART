[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtStandardPromptSchema

# Variable: ArtStandardPromptSchema

> `const` **ArtStandardPromptSchema**: `ZodArray`\<`ZodEffects`\<`ZodObject`\<\{ `content`: `ZodUnion`\<\[`ZodString`, `ZodRecord`\<`ZodString`, `ZodAny`\>, `ZodNull`\]\>; `name`: `ZodOptional`\<`ZodString`\>; `role`: `ZodType`\<[`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md), `ZodTypeDef`, [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md)\>; `tool_call_id`: `ZodOptional`\<`ZodString`\>; `tool_calls`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `function`: `ZodObject`\<\{ `arguments`: `ZodString`; `name`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `arguments`: `string`; `name`: `string`; \}, \{ `arguments`: `string`; `name`: `string`; \}\>; `id`: `ZodString`; `type`: `ZodLiteral`\<`"function"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `function`: \{ `arguments`: `string`; `name`: `string`; \}; `id`: `string`; `type`: `"function"`; \}, \{ `function`: \{ `arguments`: `string`; `name`: `string`; \}; `id`: `string`; `type`: `"function"`; \}\>, `"many"`\>\>; \}, `"strict"`, `ZodTypeAny`, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}\>, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name?`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}\>, `"many"`\>

Defined in: [src/types/schemas.ts:71](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/schemas.ts#L71)

Zod schema for validating an entire [ArtStandardPrompt](../type-aliases/ArtStandardPrompt.md) (an array of messages).

## Remarks

This is a straightforward array schema that applies the [ArtStandardMessageSchema](ArtStandardMessageSchema.md) to each element,
ensuring that every message in the prompt conforms to the required structure.
