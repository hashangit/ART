[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StateSavingStrategy

# Type Alias: StateSavingStrategy

> **StateSavingStrategy** = `"explicit"` \| `"implicit"`

Defined in: [src/types/index.ts:1126](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1126)

Defines the strategy for saving AgentState.

## Remarks

- 'explicit': AgentState is only saved when `StateManager.setAgentState()` is explicitly called by the agent.
              `StateManager.saveStateIfModified()` will be a no-op for AgentState persistence.
- 'implicit': AgentState is loaded by `StateManager.loadThreadContext()`, and if modified by the agent,
              `StateManager.saveStateIfModified()` will attempt to automatically persist these changes
              by comparing the current state with a snapshot taken at load time.
              `StateManager.setAgentState()` will still work for explicit saves.
