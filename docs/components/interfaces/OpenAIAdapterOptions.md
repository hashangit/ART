[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OpenAIAdapterOptions

# Interface: OpenAIAdapterOptions

Defined in: [src/integrations/reasoning/openai.ts:19](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/openai.ts#L19)

Configuration options required for the `OpenAIAdapter`.

## Properties

### apiBaseUrl?

> `optional` **apiBaseUrl**: `string`

Defined in: [src/integrations/reasoning/openai.ts:25](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/openai.ts#L25)

Optional: Override the base URL for the OpenAI API (e.g., for Azure OpenAI or custom proxies).

***

### apiKey

> **apiKey**: `string`

Defined in: [src/integrations/reasoning/openai.ts:21](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/openai.ts#L21)

Your OpenAI API key. Handle securely.

***

### model?

> `optional` **model**: `string`

Defined in: [src/integrations/reasoning/openai.ts:23](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/openai.ts#L23)

The default OpenAI model ID to use (e.g., 'gpt-4o', 'gpt-4o-mini'). Defaults to 'gpt-3.5-turbo' if not provided.
