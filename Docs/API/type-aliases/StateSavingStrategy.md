[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / StateSavingStrategy

# Type Alias: StateSavingStrategy

> **StateSavingStrategy** = `"explicit"` \| `"implicit"`

Defined in: [src/types/index.ts:598](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L598)

Defines the strategy for saving AgentState.
- 'explicit': AgentState is only saved when `StateManager.setAgentState()` is explicitly called by the agent.
              `StateManager.saveStateIfModified()` will be a no-op for AgentState persistence.
- 'implicit': AgentState is loaded by `StateManager.loadThreadContext()`, and if modified by the agent,
              `StateManager.saveStateIfModified()` will attempt to automatically persist these changes
              by comparing the current state with a snapshot taken at load time.
              `StateManager.setAgentState()` will still work for explicit saves.
