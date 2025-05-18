**ART Framework API Reference**

***

# ART Framework API Reference

## Enumerations

- [ErrorCode](enumerations/ErrorCode.md)
- [LogLevel](enumerations/LogLevel.md)
- [MessageRole](enumerations/MessageRole.md)
- [ModelCapability](enumerations/ModelCapability.md)
- [ObservationType](enumerations/ObservationType.md)

## Classes

- [AdapterInstantiationError](classes/AdapterInstantiationError.md)
- [AnthropicAdapter](classes/AnthropicAdapter.md)
- [ApiQueueTimeoutError](classes/ApiQueueTimeoutError.md)
- [ARTError](classes/ARTError.md)
- [CalculatorTool](classes/CalculatorTool.md)
- [DeepSeekAdapter](classes/DeepSeekAdapter.md)
- [GeminiAdapter](classes/GeminiAdapter.md)
- [IndexedDBStorageAdapter](classes/IndexedDBStorageAdapter.md)
- [InMemoryStorageAdapter](classes/InMemoryStorageAdapter.md)
- [LLMStreamSocket](classes/LLMStreamSocket.md)
- [LocalInstanceBusyError](classes/LocalInstanceBusyError.md)
- [LocalProviderConflictError](classes/LocalProviderConflictError.md)
- [Logger](classes/Logger.md)
- [OllamaAdapter](classes/OllamaAdapter.md)
- [OpenAIAdapter](classes/OpenAIAdapter.md)
- [OpenRouterAdapter](classes/OpenRouterAdapter.md)
- [PESAgent](classes/PESAgent.md)
- [TypedSocket](classes/TypedSocket.md)
- [UnknownProviderError](classes/UnknownProviderError.md)

## Interfaces

- [AgentFinalResponse](interfaces/AgentFinalResponse.md)
- [AgentOptions](interfaces/AgentOptions.md)
- [AgentProps](interfaces/AgentProps.md)
- [AgentState](interfaces/AgentState.md)
- [ArtInstance](interfaces/ArtInstance.md)
- [ArtInstanceConfig](interfaces/ArtInstanceConfig.md)
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
- [ITypedSocket](interfaces/ITypedSocket.md)
- [JsonObjectSchema](interfaces/JsonObjectSchema.md)
- [LLMMetadata](interfaces/LLMMetadata.md)
- [ManagedAdapterAccessor](interfaces/ManagedAdapterAccessor.md)
- [MessageOptions](interfaces/MessageOptions.md)
- [Observation](interfaces/Observation.md)
- [ObservationFilter](interfaces/ObservationFilter.md)
- [ObservationManager](interfaces/ObservationManager.md)
- [ObservationSocket](interfaces/ObservationSocket.md)
- [OllamaAdapterOptions](interfaces/OllamaAdapterOptions.md)
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
- [UISystem](interfaces/UISystem.md)

## Type Aliases

- [ArtStandardMessageRole](type-aliases/ArtStandardMessageRole.md)
- [ArtStandardPrompt](type-aliases/ArtStandardPrompt.md)
- [~~FormattedPrompt~~](type-aliases/FormattedPrompt.md)
- [JsonSchema](type-aliases/JsonSchema.md)
- [StateSavingStrategy](type-aliases/StateSavingStrategy.md)
- [UnsubscribeFunction](type-aliases/UnsubscribeFunction.md)

## Variables

- [ArtStandardMessageSchema](variables/ArtStandardMessageSchema.md)
- [ArtStandardPromptSchema](variables/ArtStandardPromptSchema.md)
- [VERSION](variables/VERSION.md)

## Functions

- [createArtInstance](functions/createArtInstance.md)
- [generateUUID](functions/generateUUID.md)
