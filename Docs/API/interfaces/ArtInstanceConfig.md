[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ArtInstanceConfig

# Interface: ArtInstanceConfig

Defined in: [src/types/index.ts:606](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L606)

Configuration for creating an ART instance.

## Properties

### agentCore()?

> `optional` **agentCore**: (`dependencies`) => [`IAgentCore`](IAgentCore.md)

Defined in: [src/types/index.ts:621](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L621)

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

Defined in: [src/types/index.ts:634](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L634)

Optional configuration for the framework's logger.

#### level?

> `optional` **level**: [`LogLevel`](../enumerations/LogLevel.md)

Minimum log level to output. Defaults to 'info'.

***

### providers

> **providers**: [`ProviderManagerConfig`](ProviderManagerConfig.md)

Defined in: [src/types/index.ts:615](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L615)

Configuration for the ProviderManager, defining available LLM provider adapters.

***

### stateSavingStrategy?

> `optional` **stateSavingStrategy**: [`StateSavingStrategy`](../type-aliases/StateSavingStrategy.md)

Defined in: [src/types/index.ts:632](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L632)

Defines the strategy for saving `AgentState`. Defaults to 'explicit'.
- 'explicit': `AgentState` is only saved when `StateManager.setAgentState()` is explicitly called by the agent.
              `StateManager.saveStateIfModified()` will be a no-op for `AgentState` persistence.
- 'implicit': `AgentState` is loaded by `StateManager.loadThreadContext()`. If modified by the agent,
              `StateManager.saveStateIfModified()` will attempt to automatically persist these changes.
              `StateManager.setAgentState()` will still work for explicit saves in this mode.

***

### storage

> **storage**: [`StorageAdapter`](StorageAdapter.md) \| \{ `dbName`: `string`; `objectStores`: `any`[]; `type`: `"memory"` \| `"indexedDB"`; `version`: `number`; \}

Defined in: [src/types/index.ts:613](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L613)

Configuration for the storage adapter.
Can be a pre-configured `StorageAdapter` instance,
or an object specifying the type and options for a built-in adapter.
Example: `{ type: 'indexedDB', dbName: 'MyArtDB' }`

***

### tools?

> `optional` **tools**: [`IToolExecutor`](IToolExecutor.md)[]

Defined in: [src/types/index.ts:623](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L623)

An optional array of tool executor instances to register at initialization.
