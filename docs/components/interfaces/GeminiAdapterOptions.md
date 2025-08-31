[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / GeminiAdapterOptions

# Interface: GeminiAdapterOptions

Defined in: [src/integrations/reasoning/gemini.ts:21](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/reasoning/gemini.ts#L21)

Configuration options required for the `GeminiAdapter`.

## Properties

### apiBaseUrl?

> `optional` **apiBaseUrl**: `string`

Defined in: [src/integrations/reasoning/gemini.ts:27](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/reasoning/gemini.ts#L27)

Optional: Override the base URL for the Google Generative AI API.

***

### apiKey

> **apiKey**: `string`

Defined in: [src/integrations/reasoning/gemini.ts:23](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/reasoning/gemini.ts#L23)

Your Google AI API key (e.g., from Google AI Studio). Handle securely.

***

### apiVersion?

> `optional` **apiVersion**: `string`

Defined in: [src/integrations/reasoning/gemini.ts:29](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/reasoning/gemini.ts#L29)

Optional: Specify the API version to use (e.g., 'v1beta'). Defaults to 'v1beta'.

***

### model?

> `optional` **model**: `string`

Defined in: [src/integrations/reasoning/gemini.ts:25](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/reasoning/gemini.ts#L25)

The default Gemini model ID to use (e.g., 'gemini-1.5-flash-latest', 'gemini-pro'). Defaults to 'gemini-1.5-flash-latest' if not provided.
