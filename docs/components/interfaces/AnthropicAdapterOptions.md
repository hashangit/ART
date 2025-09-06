[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AnthropicAdapterOptions

# Interface: AnthropicAdapterOptions

Defined in: [src/integrations/reasoning/anthropic.ts:25](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L25)

Configuration options required for the `AnthropicAdapter`.

## Properties

### apiBaseUrl?

> `optional` **apiBaseUrl**: `string`

Defined in: [src/integrations/reasoning/anthropic.ts:31](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L31)

Optional: Override the base URL for the Anthropic API.

***

### apiKey

> **apiKey**: `string`

Defined in: [src/integrations/reasoning/anthropic.ts:27](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L27)

Your Anthropic API key. Handle securely.

***

### defaultMaxTokens?

> `optional` **defaultMaxTokens**: `number`

Defined in: [src/integrations/reasoning/anthropic.ts:33](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L33)

Optional: Default maximum tokens for responses.

***

### defaultTemperature?

> `optional` **defaultTemperature**: `number`

Defined in: [src/integrations/reasoning/anthropic.ts:35](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L35)

Optional: Default temperature for responses.

***

### model?

> `optional` **model**: `string`

Defined in: [src/integrations/reasoning/anthropic.ts:29](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/integrations/reasoning/anthropic.ts#L29)

The default Anthropic model ID to use (e.g., 'claude-3-opus-20240229', 'claude-3-5-sonnet-20240620').
