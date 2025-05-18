[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / StateSavingStrategy

# Type Alias: StateSavingStrategy

> **StateSavingStrategy** = `"explicit"` \| `"implicit"`

Defined in: [src/types/index.ts:602](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L602)

Defines the strategy for saving AgentState.
- 'explicit': AgentState is only saved when `StateManager.setAgentState()` is explicitly called by the agent.
              `StateManager.saveStateIfModified()` will be a no-op for AgentState persistence.
- 'implicit': AgentState is loaded by `StateManager.loadThreadContext()`, and if modified by the agent,
              `StateManager.saveStateIfModified()` will attempt to automatically persist these changes
              by comparing the current state with a snapshot taken at load time.
              `StateManager.setAgentState()` will still work for explicit saves.
