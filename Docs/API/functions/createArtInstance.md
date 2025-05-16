[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / createArtInstance

# Function: createArtInstance()

> **createArtInstance**(`config`): `Promise`\<[`ArtInstance`](../interfaces/ArtInstance.md)\>

Defined in: [core/agent-factory.ts:275](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/agent-factory.ts#L275)

High-level factory function to create and initialize a complete ART framework instance.
This simplifies the setup process by handling the instantiation and wiring of all
necessary components based on the provided configuration.

## Parameters

### config

`AgentFactoryConfig`

The configuration object specifying storage, reasoning, tools, etc.

## Returns

`Promise`\<[`ArtInstance`](../interfaces/ArtInstance.md)\>

A promise that resolves to a ready-to-use `ArtInstance` object, providing access to the core `process` method and essential managers/systems.

## Throws

If initialization fails (e.g., invalid config, storage connection error).

## Example

```ts
const art = await createArtInstance({
  storage: { type: 'indexedDB', dbName: 'myAgentDb' },
  reasoning: { provider: 'openai', apiKey: '...' },
  tools: [new CalculatorTool()]
});
const response = await art.process({ query: "Calculate 5*5", threadId: "thread1" });
```
