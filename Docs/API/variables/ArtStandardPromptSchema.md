[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtStandardPromptSchema

# Variable: ArtStandardPromptSchema

> `const` **ArtStandardPromptSchema**: `ZodArray`\<`ZodEffects`\<`ZodObject`\<\{ `content`: `ZodUnion`\<\[`ZodString`, `ZodRecord`\<`ZodString`, `ZodAny`\>, `ZodNull`\]\>; `name`: `ZodOptional`\<`ZodString`\>; `role`: `ZodType`\<[`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md), `ZodTypeDef`, [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md)\>; `tool_call_id`: `ZodOptional`\<`ZodString`\>; `tool_calls`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `function`: `ZodObject`\<\{ `arguments`: `ZodString`; `name`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `arguments`: `string`; `name`: `string`; \}, \{ `arguments`: `string`; `name`: `string`; \}\>; `id`: `ZodString`; `type`: `ZodLiteral`\<`"function"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `function`: \{ `arguments`: `string`; `name`: `string`; \}; `id`: `string`; `type`: `"function"`; \}, \{ `function`: \{ `arguments`: `string`; `name`: `string`; \}; `id`: `string`; `type`: `"function"`; \}\>, `"many"`\>\>; \}, `"strict"`, `ZodTypeAny`, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id`: `string`; `tool_calls`: `object`[]; \}, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id`: `string`; `tool_calls`: `object`[]; \}\>, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id`: `string`; `tool_calls`: `object`[]; \}, \{ `content`: `null` \| `string` \| `Record`\<`string`, `any`\>; `name`: `string`; `role`: [`ArtStandardMessageRole`](../type-aliases/ArtStandardMessageRole.md); `tool_call_id`: `string`; `tool_calls`: `object`[]; \}\>, `"many"`\>

Defined in: [src/types/schemas.ts:54](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/schemas.ts#L54)

Zod schema for validating an entire ArtStandardPrompt (an array of messages).
