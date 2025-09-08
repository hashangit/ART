[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OpenRouterAdapterOptions

# Interface: OpenRouterAdapterOptions

Defined in: [src/integrations/reasoning/openrouter.ts:19](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L19)

Configuration options required for the `OpenRouterAdapter`.

## Properties

### apiBaseUrl?

> `optional` **apiBaseUrl**: `string`

Defined in: [src/integrations/reasoning/openrouter.ts:25](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L25)

Optional: Override the base URL for the OpenRouter API. Defaults to 'https://openrouter.ai/api/v1'.

***

### apiKey

> **apiKey**: `string`

Defined in: [src/integrations/reasoning/openrouter.ts:21](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L21)

Your OpenRouter API key. Handle securely.

***

### appName?

> `optional` **appName**: `string`

Defined in: [src/integrations/reasoning/openrouter.ts:29](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L29)

Optional: Your application's name, sent as the 'X-Title' header (recommended by OpenRouter).

***

### model

> **model**: `string`

Defined in: [src/integrations/reasoning/openrouter.ts:23](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L23)

The required OpenRouter model identifier string (e.g., 'google/gemini-pro', 'anthropic/claude-3-haiku', 'openai/gpt-4o'). This specifies which underlying model OpenRouter should use.

***

### siteUrl?

> `optional` **siteUrl**: `string`

Defined in: [src/integrations/reasoning/openrouter.ts:27](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/reasoning/openrouter.ts#L27)

Optional: Your application's site URL, sent as the 'HTTP-Referer' header (recommended by OpenRouter).
