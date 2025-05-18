[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / OllamaAdapterOptions

# Interface: OllamaAdapterOptions

Defined in: [src/adapters/reasoning/ollama.ts:21](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/ollama.ts#L21)

Configuration options required for the `OllamaAdapter`.

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/adapters/reasoning/ollama.ts:36](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/ollama.ts#L36)

API key for Ollama (if secured). Defaults to "ollama" as commonly used.

***

### defaultModel?

> `optional` **defaultModel**: `string`

Defined in: [src/adapters/reasoning/ollama.ts:32](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/ollama.ts#L32)

The default Ollama model ID to use (e.g., 'llama3', 'mistral').
This can be overridden by `RuntimeProviderConfig.modelId` or `CallOptions.model`.
It's recommended to set this if you primarily use one model with Ollama.

***

### ollamaBaseUrl?

> `optional` **ollamaBaseUrl**: `string`

Defined in: [src/adapters/reasoning/ollama.ts:26](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/adapters/reasoning/ollama.ts#L26)

The base URL for the Ollama API. Defaults to 'http://localhost:11434'.
The '/v1' suffix for OpenAI compatibility will be added automatically.
