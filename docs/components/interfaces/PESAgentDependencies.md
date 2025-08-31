[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PESAgentDependencies

# Interface: PESAgentDependencies

Defined in: [src/core/agents/pes-agent.ts:51](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L51)

## Properties

### a2aTaskRepository

> **a2aTaskRepository**: [`IA2ATaskRepository`](IA2ATaskRepository.md)

Defined in: [src/core/agents/pes-agent.ts:77](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L77)

Repository for A2A tasks.

***

### agentDiscoveryService?

> `optional` **agentDiscoveryService**: `null` \| [`AgentDiscoveryService`](../classes/AgentDiscoveryService.md)

Defined in: [src/core/agents/pes-agent.ts:79](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L79)

Service for discovering A2A agents.

***

### conversationManager

> **conversationManager**: [`ConversationManager`](ConversationManager.md)

Defined in: [src/core/agents/pes-agent.ts:61](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L61)

Manages conversation history.

***

### instanceDefaultCustomSystemPrompt?

> `optional` **instanceDefaultCustomSystemPrompt**: `string`

Defined in: [src/core/agents/pes-agent.ts:59](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L59)

Optional default system prompt string provided at the ART instance level.
This serves as a custom prompt part if no thread-specific or call-specific
system prompt is provided. It's appended to the agent's base system prompt.

***

### observationManager

> **observationManager**: [`ObservationManager`](ObservationManager.md)

Defined in: [src/core/agents/pes-agent.ts:71](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L71)

Records agent execution observations.

***

### outputParser

> **outputParser**: [`OutputParser`](OutputParser.md)

Defined in: [src/core/agents/pes-agent.ts:69](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L69)

Parses LLM responses.

***

### reasoningEngine

> **reasoningEngine**: [`ReasoningEngine`](ReasoningEngine.md)

Defined in: [src/core/agents/pes-agent.ts:67](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L67)

Handles interaction with the LLM provider.

***

### stateManager

> **stateManager**: [`StateManager`](StateManager.md)

Defined in: [src/core/agents/pes-agent.ts:53](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L53)

Manages thread configuration and state.

***

### systemPromptResolver

> **systemPromptResolver**: [`SystemPromptResolver`](SystemPromptResolver.md)

Defined in: [src/core/agents/pes-agent.ts:83](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L83)

Resolver for standardized system prompt composition.

***

### taskDelegationService?

> `optional` **taskDelegationService**: `null` \| [`TaskDelegationService`](../classes/TaskDelegationService.md)

Defined in: [src/core/agents/pes-agent.ts:81](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L81)

Service for delegating A2A tasks.

***

### toolRegistry

> **toolRegistry**: [`ToolRegistry`](ToolRegistry.md)

Defined in: [src/core/agents/pes-agent.ts:63](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L63)

Registry for available tools.

***

### toolSystem

> **toolSystem**: [`ToolSystem`](ToolSystem.md)

Defined in: [src/core/agents/pes-agent.ts:73](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L73)

Orchestrates tool execution.

***

### uiSystem

> **uiSystem**: [`UISystem`](UISystem.md)

Defined in: [src/core/agents/pes-agent.ts:75](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/agents/pes-agent.ts#L75)

Provides access to UI communication sockets.
