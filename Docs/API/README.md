**ART Framework API Reference**

***

# ART Framework API Reference

## Enumerations

- [LogLevel](enumerations/LogLevel.md)
- [MessageRole](enumerations/MessageRole.md)
- [ModelCapability](enumerations/ModelCapability.md)
- [ObservationType](enumerations/ObservationType.md)

## Classes

- [AnthropicAdapter](classes/AnthropicAdapter.md)
- [CalculatorTool](classes/CalculatorTool.md)
- [DeepSeekAdapter](classes/DeepSeekAdapter.md)
- [GeminiAdapter](classes/GeminiAdapter.md)
- [IndexedDBStorageAdapter](classes/IndexedDBStorageAdapter.md)
- [InMemoryStorageAdapter](classes/InMemoryStorageAdapter.md)
- [Logger](classes/Logger.md)
- [OpenAIAdapter](classes/OpenAIAdapter.md)
- [OpenRouterAdapter](classes/OpenRouterAdapter.md)
- [PESAgent](classes/PESAgent.md)

## Interfaces

- [AgentFinalResponse](interfaces/AgentFinalResponse.md)
- [AgentOptions](interfaces/AgentOptions.md)
- [AgentProps](interfaces/AgentProps.md)
- [AgentState](interfaces/AgentState.md)
- [ArtInstance](interfaces/ArtInstance.md)
- [ArtStandardMessage](interfaces/ArtStandardMessage.md)
- [AvailableProviderEntry](interfaces/AvailableProviderEntry.md)
- [CallOptions](interfaces/CallOptions.md)
- [ConversationManager](interfaces/ConversationManager.md)
- [ConversationMessage](interfaces/ConversationMessage.md)
- [ConversationSocket](interfaces/ConversationSocket.md)
- [ExecutionContext](interfaces/ExecutionContext.md)
- [ExecutionMetadata](interfaces/ExecutionMetadata.md)
- [FilterOptions](interfaces/FilterOptions.md)
- [IAgentCore](interfaces/IAgentCore.md)
- [IConversationRepository](interfaces/IConversationRepository.md)
- [IObservationRepository](interfaces/IObservationRepository.md)
- [IProviderManager](interfaces/IProviderManager.md)
- [IStateRepository](interfaces/IStateRepository.md)
- [IToolExecutor](interfaces/IToolExecutor.md)
- [JsonObjectSchema](interfaces/JsonObjectSchema.md)
- [LLMMetadata](interfaces/LLMMetadata.md)
- [ManagedAdapterAccessor](interfaces/ManagedAdapterAccessor.md)
- [MessageOptions](interfaces/MessageOptions.md)
- [Observation](interfaces/Observation.md)
- [ObservationFilter](interfaces/ObservationFilter.md)
- [ObservationManager](interfaces/ObservationManager.md)
- [ObservationSocket](interfaces/ObservationSocket.md)
- [OutputParser](interfaces/OutputParser.md)
- [ParsedToolCall](interfaces/ParsedToolCall.md)
- [PromptContext](interfaces/PromptContext.md)
- [PromptManager](interfaces/PromptManager.md)
- [ProviderAdapter](interfaces/ProviderAdapter.md)
- [ProviderManagerConfig](interfaces/ProviderManagerConfig.md)
- [ReasoningEngine](interfaces/ReasoningEngine.md)
- [RuntimeProviderConfig](interfaces/RuntimeProviderConfig.md)
- [StateManager](interfaces/StateManager.md)
- [StorageAdapter](interfaces/StorageAdapter.md)
- [StreamEvent](interfaces/StreamEvent.md)
- [ThreadConfig](interfaces/ThreadConfig.md)
- [ThreadContext](interfaces/ThreadContext.md)
- [ToolRegistry](interfaces/ToolRegistry.md)
- [ToolResult](interfaces/ToolResult.md)
- [ToolSchema](interfaces/ToolSchema.md)
- [ToolSystem](interfaces/ToolSystem.md)
- [TypedSocket](interfaces/TypedSocket.md)
- [UISystem](interfaces/UISystem.md)

## Type Aliases

- [ArtStandardMessageRole](type-aliases/ArtStandardMessageRole.md)
- [ArtStandardPrompt](type-aliases/ArtStandardPrompt.md)
- [~~FormattedPrompt~~](type-aliases/FormattedPrompt.md)
- [JsonSchema](type-aliases/JsonSchema.md)

## Variables

- [VERSION](variables/VERSION.md)

## Functions

- [createArtInstance](functions/createArtInstance.md)
- [generateUUID](functions/generateUUID.md)
