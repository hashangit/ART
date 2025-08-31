[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ArtInstanceConfig

# Interface: ArtInstanceConfig

Defined in: [src/types/index.ts:1138](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1138)

Configuration for creating an ART instance.

 ArtInstanceConfig

## Properties

### a2aConfig?

> `optional` **a2aConfig**: `object`

Defined in: [src/types/index.ts:1222](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1222)

Optional: Configuration for A2A services.

#### callbackUrl?

> `optional` **callbackUrl**: `string`

The callback URL for receiving A2A task updates.

#### discoveryEndpoint?

> `optional` **discoveryEndpoint**: `string`

The endpoint for discovering A2A agents.

***

### agentCore()?

> `optional` **agentCore**: (`dependencies`) => [`IAgentCore`](IAgentCore.md)

Defined in: [src/types/index.ts:1162](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1162)

The agent core implementation class to use.
Defaults to `PESAgent` if not provided.

#### Parameters

##### dependencies

`any`

#### Returns

[`IAgentCore`](IAgentCore.md)

#### Example

```ts
MyCustomAgentClass
```

***

### authConfig?

> `optional` **authConfig**: `object`

Defined in: [src/types/index.ts:1206](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1206)

Optional configuration for authentication strategies.
Used for secure connections to external services and MCP servers.

#### enabled?

> `optional` **enabled**: `boolean`

Whether to enable authentication manager. Defaults to false.

#### strategies?

> `optional` **strategies**: `object`[]

Pre-configured authentication strategies to register at startup.

***

### defaultSystemPrompt?

> `optional` **defaultSystemPrompt**: `string`

Defined in: [src/types/index.ts:1194](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1194)

Optional default system prompt string to be used for the entire ART instance.
This can be overridden at the thread level or at the individual call level.

***

### logger?

> `optional` **logger**: `object`

Defined in: [src/types/index.ts:1185](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1185)

Optional configuration for the framework's logger.

#### level?

> `optional` **level**: [`LogLevel`](../enumerations/LogLevel.md)

Minimum log level to output. Defaults to 'info'.

***

### mcpConfig?

> `optional` **mcpConfig**: [`McpManagerConfig`](McpManagerConfig.md)

Defined in: [src/types/index.ts:1200](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1200)

Optional configuration for MCP (Model Context Protocol) manager.
Enables connection to external MCP servers for dynamic tool loading.

***

### providers

> **providers**: [`ProviderManagerConfig`](ProviderManagerConfig.md)

Defined in: [src/types/index.ts:1153](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1153)

Configuration for the ProviderManager, defining available LLM provider adapters.

***

### stateSavingStrategy?

> `optional` **stateSavingStrategy**: [`StateSavingStrategy`](../type-aliases/StateSavingStrategy.md)

Defined in: [src/types/index.ts:1180](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1180)

Defines the strategy for saving `AgentState`. Defaults to 'explicit'.

#### Remarks

- 'explicit': `AgentState` is only saved when `StateManager.setAgentState()` is explicitly called by the agent.
              `StateManager.saveStateIfModified()` will be a no-op for `AgentState` persistence.
- 'implicit': `AgentState` is loaded by `StateManager.loadThreadContext()`. If modified by the agent,
              `StateManager.saveStateIfModified()` will attempt to automatically persist these changes.
              `StateManager.setAgentState()` will still work for explicit saves in this mode.

***

### storage

> **storage**: [`StorageAdapter`](StorageAdapter.md) \| \{ `dbName?`: `string`; `objectStores?`: `any`[]; `type`: `"memory"` \| `"indexedDB"`; `version?`: `number`; \}

Defined in: [src/types/index.ts:1148](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1148)

Configuration for the storage adapter.
Can be a pre-configured `StorageAdapter` instance,
or an object specifying the type and options for a built-in adapter.

#### Example

```ts
{ type: 'indexedDB', dbName: 'MyArtDB' }
```

***

### tools?

> `optional` **tools**: [`IToolExecutor`](IToolExecutor.md)[]

Defined in: [src/types/index.ts:1167](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1167)

An optional array of tool executor instances to register at initialization.
