[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtInstanceConfig

# Interface: ArtInstanceConfig

Defined in: [types/index.ts:588](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L588)

Configuration for creating an ART instance.

## Properties

### agentCore()?

> `optional` **agentCore**: (`dependencies`) => [`IAgentCore`](IAgentCore.md)

Defined in: [types/index.ts:603](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L603)

The agent core implementation class to use.
Defaults to `PESAgent` if not provided.
Example: `MyCustomAgentClass`

#### Parameters

##### dependencies

`any`

#### Returns

[`IAgentCore`](IAgentCore.md)

***

### logger?

> `optional` **logger**: `object`

Defined in: [types/index.ts:616](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L616)

Optional configuration for the framework's logger.

#### level?

> `optional` **level**: [`LogLevel`](../enumerations/LogLevel.md)

Minimum log level to output. Defaults to 'info'.

***

### providers

> **providers**: [`ProviderManagerConfig`](ProviderManagerConfig.md)

Defined in: [types/index.ts:597](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L597)

Configuration for the ProviderManager, defining available LLM provider adapters.

***

### stateSavingStrategy?

> `optional` **stateSavingStrategy**: [`StateSavingStrategy`](../type-aliases/StateSavingStrategy.md)

Defined in: [types/index.ts:614](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L614)

Defines the strategy for saving `AgentState`. Defaults to 'explicit'.
- 'explicit': `AgentState` is only saved when `StateManager.setAgentState()` is explicitly called by the agent.
              `StateManager.saveStateIfModified()` will be a no-op for `AgentState` persistence.
- 'implicit': `AgentState` is loaded by `StateManager.loadThreadContext()`. If modified by the agent,
              `StateManager.saveStateIfModified()` will attempt to automatically persist these changes.
              `StateManager.setAgentState()` will still work for explicit saves in this mode.

***

### storage

> **storage**: [`StorageAdapter`](StorageAdapter.md) \| \{ `dbName`: `string`; `objectStores`: `any`[]; `type`: `"memory"` \| `"indexedDB"`; `version`: `number`; \}

Defined in: [types/index.ts:595](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L595)

Configuration for the storage adapter.
Can be a pre-configured `StorageAdapter` instance,
or an object specifying the type and options for a built-in adapter.
Example: `{ type: 'indexedDB', dbName: 'MyArtDB' }`

***

### tools?

> `optional` **tools**: [`IToolExecutor`](IToolExecutor.md)[]

Defined in: [types/index.ts:605](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L605)

An optional array of tool executor instances to register at initialization.
