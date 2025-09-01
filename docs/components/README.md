**ART Framework Component Reference**

***

# ART Framework Component Reference

ART (Agentic Reasoning & Tool-use) Framework - Main Entry Point
-----------------------------------------------------------------

Welcome to the ART framework! This file is the primary public API surface for the library.
It's structured to provide a clear and intuitive experience for developers,
whether you're just getting started or building advanced, custom agentic systems.

--- Quick Start ---
For most use cases, you'll only need `createArtInstance` and the associated types.

Example:
```ts
import { createArtInstance } from 'art-framework';
import type { ArtInstanceConfig } from 'art-framework';

const config: ArtInstanceConfig = {
  storage: { type: 'memory' },
  providers: {
    openai: { adapter: 'openai', apiKey: '...' }
  },
  tools: [new CalculatorTool()],
  persona: {
    name: 'MyAgent',
    prompts: {
      synthesis: 'You are MyAgent. Always answer in rhyme.'
    }
  }
};

const art = await createArtInstance(config);
const response = await art.process({ query: "Hello, world!" });
```

--- API Structure ---
1.  **Core Factory**: The main function to create an ART instance.
2.  **Primary Interfaces & Types**: Essential types for configuration and interaction.
3.  **Built-in Components**: Concrete implementations of adapters, tools, and agents.
4.  **Advanced Systems & Managers**: Lower-level components for building custom logic.
5.  **Utilities**: Helper functions and classes.

## Enumerations

- [A2ATaskPriority](enumerations/A2ATaskPriority.md)
- [A2ATaskStatus](enumerations/A2ATaskStatus.md)
- [ErrorCode](enumerations/ErrorCode.md)
- [LogLevel](enumerations/LogLevel.md)
- [MessageRole](enumerations/MessageRole.md)
- [ModelCapability](enumerations/ModelCapability.md)
- [ObservationType](enumerations/ObservationType.md)

## Classes

- [A2ATaskSocket](classes/A2ATaskSocket.md)
- [AdapterInstantiationError](classes/AdapterInstantiationError.md)
- [AgentDiscoveryService](classes/AgentDiscoveryService.md)
- [AnthropicAdapter](classes/AnthropicAdapter.md)
- [ApiQueueTimeoutError](classes/ApiQueueTimeoutError.md)
- [ARTError](classes/ARTError.md)
- [AuthManager](classes/AuthManager.md)
- [CalculatorTool](classes/CalculatorTool.md)
- [ConversationSocket](classes/ConversationSocket.md)
- [DeepSeekAdapter](classes/DeepSeekAdapter.md)
- [GeminiAdapter](classes/GeminiAdapter.md)
- [IndexedDBStorageAdapter](classes/IndexedDBStorageAdapter.md)
- [InMemoryStorageAdapter](classes/InMemoryStorageAdapter.md)
- [LLMStreamSocket](classes/LLMStreamSocket.md)
- [LocalInstanceBusyError](classes/LocalInstanceBusyError.md)
- [LocalProviderConflictError](classes/LocalProviderConflictError.md)
- [Logger](classes/Logger.md)
- [McpClientController](classes/McpClientController.md)
- [McpManager](classes/McpManager.md)
- [McpProxyTool](classes/McpProxyTool.md)
- [ObservationSocket](classes/ObservationSocket.md)
- [OllamaAdapter](classes/OllamaAdapter.md)
- [OpenAIAdapter](classes/OpenAIAdapter.md)
- [OpenRouterAdapter](classes/OpenRouterAdapter.md)
- [PESAgent](classes/PESAgent.md)
- [PKCEOAuthStrategy](classes/PKCEOAuthStrategy.md)
- [SupabaseStorageAdapter](classes/SupabaseStorageAdapter.md)
- [TaskDelegationService](classes/TaskDelegationService.md)
- [TypedSocket](classes/TypedSocket.md)
- [UnknownProviderError](classes/UnknownProviderError.md)

## Interfaces

- [A2AAgentInfo](interfaces/A2AAgentInfo.md)
- [A2ATask](interfaces/A2ATask.md)
- [A2ATaskEvent](interfaces/A2ATaskEvent.md)
- [A2ATaskFilter](interfaces/A2ATaskFilter.md)
- [A2ATaskMetadata](interfaces/A2ATaskMetadata.md)
- [A2ATaskResult](interfaces/A2ATaskResult.md)
- [AgentDiscoveryConfig](interfaces/AgentDiscoveryConfig.md)
- [AgentFinalResponse](interfaces/AgentFinalResponse.md)
- [AgentOptions](interfaces/AgentOptions.md)
- [AgentPersona](interfaces/AgentPersona.md)
- [AgentProps](interfaces/AgentProps.md)
- [AgentState](interfaces/AgentState.md)
- [AnthropicAdapterOptions](interfaces/AnthropicAdapterOptions.md)
- [ArtInstance](interfaces/ArtInstance.md)
- [ArtInstanceConfig](interfaces/ArtInstanceConfig.md)
- [ArtStandardMessage](interfaces/ArtStandardMessage.md)
- [AvailableProviderEntry](interfaces/AvailableProviderEntry.md)
- [CallOptions](interfaces/CallOptions.md)
- [ConversationManager](interfaces/ConversationManager.md)
- [ConversationMessage](interfaces/ConversationMessage.md)
- [CreateA2ATaskRequest](interfaces/CreateA2ATaskRequest.md)
- [DeepSeekAdapterOptions](interfaces/DeepSeekAdapterOptions.md)
- [ExecutionContext](interfaces/ExecutionContext.md)
- [ExecutionMetadata](interfaces/ExecutionMetadata.md)
- [FilterOptions](interfaces/FilterOptions.md)
- [GeminiAdapterOptions](interfaces/GeminiAdapterOptions.md)
- [IA2ATaskRepository](interfaces/IA2ATaskRepository.md)
- [IAgentCore](interfaces/IAgentCore.md)
- [IAuthStrategy](interfaces/IAuthStrategy.md)
- [IConversationRepository](interfaces/IConversationRepository.md)
- [IObservationRepository](interfaces/IObservationRepository.md)
- [IProviderManager](interfaces/IProviderManager.md)
- [IStateRepository](interfaces/IStateRepository.md)
- [IToolExecutor](interfaces/IToolExecutor.md)
- [ITypedSocket](interfaces/ITypedSocket.md)
- [JsonObjectSchema](interfaces/JsonObjectSchema.md)
- [LLMMetadata](interfaces/LLMMetadata.md)
- [LoggerConfig](interfaces/LoggerConfig.md)
- [ManagedAdapterAccessor](interfaces/ManagedAdapterAccessor.md)
- [McpManagerConfig](interfaces/McpManagerConfig.md)
- [McpResource](interfaces/McpResource.md)
- [McpResourceTemplate](interfaces/McpResourceTemplate.md)
- [McpServerStatus](interfaces/McpServerStatus.md)
- [McpToolDefinition](interfaces/McpToolDefinition.md)
- [MessageOptions](interfaces/MessageOptions.md)
- [Observation](interfaces/Observation.md)
- [ObservationFilter](interfaces/ObservationFilter.md)
- [ObservationManager](interfaces/ObservationManager.md)
- [OllamaAdapterOptions](interfaces/OllamaAdapterOptions.md)
- [OpenAIAdapterOptions](interfaces/OpenAIAdapterOptions.md)
- [OpenRouterAdapterOptions](interfaces/OpenRouterAdapterOptions.md)
- [OutputParser](interfaces/OutputParser.md)
- [ParsedToolCall](interfaces/ParsedToolCall.md)
- [PKCEOAuthConfig](interfaces/PKCEOAuthConfig.md)
- [PromptBlueprint](interfaces/PromptBlueprint.md)
- [PromptContext](interfaces/PromptContext.md)
- [PromptManager](interfaces/PromptManager.md)
- [ProviderAdapter](interfaces/ProviderAdapter.md)
- [ProviderManagerConfig](interfaces/ProviderManagerConfig.md)
- [ReasoningEngine](interfaces/ReasoningEngine.md)
- [RuntimeProviderConfig](interfaces/RuntimeProviderConfig.md)
- [StageSpecificPrompts](interfaces/StageSpecificPrompts.md)
- [StateManager](interfaces/StateManager.md)
- [StorageAdapter](interfaces/StorageAdapter.md)
- [StreamEvent](interfaces/StreamEvent.md)
- [SystemPromptOverride](interfaces/SystemPromptOverride.md)
- [SystemPromptResolver](interfaces/SystemPromptResolver.md)
- [SystemPromptSpec](interfaces/SystemPromptSpec.md)
- [SystemPromptsRegistry](interfaces/SystemPromptsRegistry.md)
- [TaskDelegationConfig](interfaces/TaskDelegationConfig.md)
- [TaskStatusResponse](interfaces/TaskStatusResponse.md)
- [ThreadConfig](interfaces/ThreadConfig.md)
- [ThreadContext](interfaces/ThreadContext.md)
- [ToolRegistry](interfaces/ToolRegistry.md)
- [ToolResult](interfaces/ToolResult.md)
- [ToolSchema](interfaces/ToolSchema.md)
- [ToolSystem](interfaces/ToolSystem.md)
- [UISystem](interfaces/UISystem.md)
- [UpdateA2ATaskRequest](interfaces/UpdateA2ATaskRequest.md)

## Type Aliases

- [ArtStandardMessageRole](type-aliases/ArtStandardMessageRole.md)
- [ArtStandardPrompt](type-aliases/ArtStandardPrompt.md)
- [~~FormattedPrompt~~](type-aliases/FormattedPrompt.md)
- [JsonSchema](type-aliases/JsonSchema.md)
- [McpServerConfig](type-aliases/McpServerConfig.md)
- [StateSavingStrategy](type-aliases/StateSavingStrategy.md)
- [StreamEventTypeFilter](type-aliases/StreamEventTypeFilter.md)
- [SystemPromptMergeStrategy](type-aliases/SystemPromptMergeStrategy.md)
- [UnsubscribeFunction](type-aliases/UnsubscribeFunction.md)

## Variables

- [ArtStandardMessageSchema](variables/ArtStandardMessageSchema.md)
- [ArtStandardPromptSchema](variables/ArtStandardPromptSchema.md)
- [VERSION](variables/VERSION.md)

## Functions

- [createArtInstance](functions/createArtInstance.md)
- [generateUUID](functions/generateUUID.md)
