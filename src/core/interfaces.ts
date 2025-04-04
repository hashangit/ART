// src/core/interfaces.ts
import {
  AgentFinalResponse,
  AgentProps,
  CallOptions,
  ConversationMessage,
  ExecutionContext,
  FilterOptions,
  FormattedPrompt,
  MessageOptions,
  MessageRole, // Added import
  Observation,
  ObservationFilter,
  ObservationType,
  ParsedToolCall,
  ThreadConfig,
  ThreadContext,
  ToolResult,
  ToolSchema,
  AgentState // Added import
} from '../types'; // Assuming types are exported from src/types/index.ts

/**
 * Interface for the central agent orchestrator.
 */
export interface IAgentCore {
  process(props: AgentProps): Promise<AgentFinalResponse>;
}

/**
 * Interface for the component responsible for interacting with LLMs.
 */
export interface ReasoningEngine {
  /**
   * Calls the underlying LLM provider.
   * @param prompt The formatted prompt for the provider.
   * @param options Call-specific options, including threadId and callbacks.
   * @returns The raw string response from the LLM.
   */
  call(prompt: FormattedPrompt, options: CallOptions): Promise<string>;
}

/**
 * Interface for managing and constructing prompts for the LLM.
 */
export interface PromptManager {
  /**
   * Creates the prompt for the planning phase.
   * @param query User query.
   * @param history Conversation history.
   * @param systemPrompt System prompt string.
   * @param availableTools Schemas of available tools.
   * @param threadContext Current thread context.
   * @returns Formatted prompt suitable for the ReasoningEngine.
   */
  createPlanningPrompt(
    query: string,
    history: ConversationMessage[],
    systemPrompt: string | undefined,
    availableTools: ToolSchema[],
    threadContext: ThreadContext
  ): Promise<FormattedPrompt>;

  /**
   * Creates the prompt for the synthesis phase.
   * @param query User query.
   * @param intent Parsed intent from planning.
   * @param plan Parsed plan from planning.
   * @param toolResults Results from tool execution.
   * @param history Conversation history.
   * @param systemPrompt System prompt string.
   * @param threadContext Current thread context.
   * @returns Formatted prompt suitable for the ReasoningEngine.
   */
  createSynthesisPrompt(
    query: string,
    intent: string | undefined, // Or a structured intent object
    plan: string | undefined, // Or a structured plan object
    toolResults: ToolResult[],
    history: ConversationMessage[],
    systemPrompt: string | undefined,
    threadContext: ThreadContext
  ): Promise<FormattedPrompt>;
}

/**
 * Interface for parsing structured output from LLM responses.
 */
export interface OutputParser {
  /**
   * Parses the output of the planning LLM call.
   * @param output Raw LLM output string.
   * @returns Structured planning data (intent, plan, tool calls).
   */
  parsePlanningOutput(output: string): Promise<{
    intent?: string;
    plan?: string;
    toolCalls?: ParsedToolCall[];
  }>;

  /**
   * Parses the output of the synthesis LLM call.
   * @param output Raw LLM output string.
   * @returns The final synthesized response content.
   */
  parseSynthesisOutput(output: string): Promise<string>; // Returns final response content
}

/**
 * Base interface for LLM Provider Adapters, extending the core ReasoningEngine.
 * Implementations will handle provider-specific API calls, authentication, etc.
 */
export interface ProviderAdapter extends ReasoningEngine {
  // Provider-specific methods or properties might be added here if needed.
  // The 'call' method implementation will be provider-specific.
  readonly providerName: string; // e.g., 'openai', 'anthropic'
}

/**
 * Interface for the executable logic of a tool.
 */
export interface IToolExecutor {
  /** The schema definition for this tool. */
  readonly schema: ToolSchema;

  /**
   * Executes the tool's logic.
   * @param input Validated input arguments matching the tool's inputSchema.
   * @param context Execution context containing threadId, traceId, etc.
   * @returns A promise resolving to the structured tool result.
   */
  execute(input: any, context: ExecutionContext): Promise<ToolResult>;
}

/**
 * Interface for managing the registration and retrieval of tools.
 */
export interface ToolRegistry {
  /**
   * Registers a tool executor.
   * @param executor The tool executor instance.
   */
  registerTool(executor: IToolExecutor): Promise<void>;

  /**
   * Retrieves a tool executor by its name.
   * @param toolName The unique name of the tool.
   * @returns The executor instance or undefined if not found.
   */
  getToolExecutor(toolName: string): Promise<IToolExecutor | undefined>;

  /**
   * Retrieves the schemas of all registered tools, potentially filtered.
   * @param filter Optional criteria (e.g., only enabled tools for a thread).
   * @returns An array of tool schemas.
   */
  getAvailableTools(filter?: { enabledForThreadId?: string }): Promise<ToolSchema[]>;
}

/**
 * Interface for the system responsible for orchestrating tool execution.
 */
export interface ToolSystem {
  /**
   * Executes a list of parsed tool calls.
   * @param toolCalls Array of tool calls requested by the LLM.
   * @param threadId The current thread ID for context and permissions.
   * @param traceId Optional trace ID.
   * @returns A promise resolving to an array of tool results.
   */
  executeTools(
    toolCalls: ParsedToolCall[],
    threadId: string,
    traceId?: string
  ): Promise<ToolResult[]>;
}

/**
 * Interface for managing thread-specific configuration and state.
 */
export interface StateManager {
  /**
   * Loads the full context (config + state) for a given thread.
   * @param threadId The ID of the thread.
   * @param userId Optional user ID for access control.
   * @returns The thread context.
   */
  loadThreadContext(threadId: string, userId?: string): Promise<ThreadContext>;

  /**
   * Checks if a specific tool is enabled for the given thread based on its config.
   * @param threadId The ID of the thread.
   * @param toolName The name of the tool.
   * @returns True if the tool is enabled, false otherwise.
   */
  isToolEnabled(threadId: string, toolName: string): Promise<boolean>;

  /**
   * Retrieves a specific configuration value for the thread.
   * @param threadId The ID of the thread.
   * @param key The configuration key (potentially nested, e.g., 'reasoning.model').
   * @returns The configuration value or undefined.
   */
  getThreadConfigValue<T>(threadId: string, key: string): Promise<T | undefined>;

  /**
   * Saves the thread's state if it has been modified during execution.
   * Implementations should track changes to avoid unnecessary writes.
   * @param threadId The ID of the thread.
   */
  saveStateIfModified(threadId: string): Promise<void>;

  /**
   * Sets or updates the configuration for a specific thread.
   * @param threadId The ID of the thread.
   * @param config The complete configuration object to set.
   */
  setThreadConfig(threadId: string, config: ThreadConfig): Promise<void>; // Add this method

  // Potentially add methods to update config/state if needed during runtime,
  // though v0.2.4 focuses on loading existing config.
  // updateAgentState(threadId: string, updates: Partial<AgentState>): Promise<void>;
}

/**
 * Interface for managing conversation history.
 */
export interface ConversationManager {
  /**
   * Adds one or more messages to a thread's history.
   * @param threadId The ID of the thread.
   * @param messages An array of messages to add.
   */
  addMessages(threadId: string, messages: ConversationMessage[]): Promise<void>;

  /**
   * Retrieves messages from a thread's history.
   * @param threadId The ID of the thread.
   * @param options Filtering and pagination options.
   * @returns An array of conversation messages.
   */
  getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]>;

  // Optional: Method to clear history or prune based on limits might be useful.
  // clearHistory(threadId: string): Promise<void>;
}

/**
 * Interface for managing the recording and retrieval of observations.
 */
export interface ObservationManager {
  /**
   * Records a new observation. Automatically assigns ID, timestamp, and potentially title.
   * Notifies the ObservationSocket.
   * @param observationData Data for the observation (excluding id, timestamp, title).
   */
  record(observationData: Omit<Observation, 'id' | 'timestamp' | 'title'>): Promise<void>;

  /**
   * Retrieves observations for a specific thread, with optional filtering.
   * @param threadId The ID of the thread.
   * @param filter Optional filtering criteria.
   * @returns An array of observations.
   */
  getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]>;
}

/**
 * Generic interface for a typed publish/subscribe socket.
 */
export interface TypedSocket<DataType, FilterType = any> {
  /**
   * Subscribes a callback function to receive data updates.
   * @param callback The function to call with new data.
   * @param filter Optional filter criteria specific to the socket type.
   * @param options Optional configuration like target threadId.
   * @returns An unsubscribe function.
   */
  subscribe(
    callback: (data: DataType) => void,
    filter?: FilterType,
    options?: { threadId?: string }
  ): () => void; // Returns unsubscribe function

  /**
   * Notifies subscribers of new data.
   * @param data The data payload.
   * @param options Optional targeting information (e.g., specific thread).
   */
  notify(
    data: DataType,
    options?: { targetThreadId?: string; targetSessionId?: string }
  ): void;

  /**
   * Optional method to retrieve historical data from the socket's source.
   * @param filter Optional filter criteria.
   * @param options Optional configuration like threadId and limit.
   */
  getHistory?(
    filter?: FilterType,
    options?: { threadId?: string; limit?: number }
  ): Promise<DataType[]>;
}

/**
 * TypedSocket specifically for Observation data.
 * FilterType is ObservationType or array of ObservationType.
 */
export interface ObservationSocket extends TypedSocket<Observation, ObservationType | ObservationType[]> {}

/**
 * TypedSocket specifically for ConversationMessage data.
 * FilterType is MessageRole or array of MessageRole.
 */
export interface ConversationSocket extends TypedSocket<ConversationMessage, MessageRole | MessageRole[]> {}

// Import concrete socket classes for use in the UISystem interface return types
import { ObservationSocket as ObservationSocketImpl } from '../systems/ui/observation-socket';
import { ConversationSocket as ConversationSocketImpl } from '../systems/ui/conversation-socket';

/**
 * Interface for the system providing access to UI communication sockets.
 */
export interface UISystem {
  getObservationSocket(): ObservationSocketImpl; // Use concrete class type
  getConversationSocket(): ConversationSocketImpl; // Use concrete class type
  // Potentially add getStateSocket(): StateSocket; in the future
}

/**
 * Interface for a storage adapter, providing a generic persistence layer.
 */
export interface StorageAdapter {
  /** Optional initialization method (e.g., connecting to DB). */
  init?(config?: any): Promise<void>;

  /**
   * Retrieves a single item from a collection by its ID.
   * @param collection The name of the data collection (e.g., 'conversations', 'observations').
   * @param id The unique ID of the item.
   * @returns The item or null if not found.
   */
  get<T>(collection: string, id: string): Promise<T | null>;

  /**
   * Saves (creates or updates) an item in a collection.
   * @param collection The name of the collection.
   * @param id The unique ID of the item.
   * @param data The data to save.
   */
  set<T>(collection: string, id: string, data: T): Promise<void>;

  /**
   * Deletes an item from a collection by its ID.
   * @param collection The name of the collection.
   * @param id The unique ID of the item.
   */
  delete(collection: string, id: string): Promise<void>;

  /**
   * Queries items in a collection based on filter options.
   * @param collection The name of the collection.
   * @param filterOptions Filtering, sorting, and pagination options.
   * @returns An array of matching items.
   */
  query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>;

  /** Optional: Clears all items from a specific collection. */
  clearCollection?(collection: string): Promise<void>;

  /** Optional: Clears all data managed by the adapter. Use with caution! */
  clearAll?(): Promise<void>;
}

// --- Repository Interfaces ---
// These interfaces define how specific data types are managed, using a StorageAdapter internally.

/** Repository for managing ConversationMessages. */
export interface IConversationRepository {
  addMessages(threadId: string, messages: ConversationMessage[]): Promise<void>;
  getMessages(threadId: string, options?: MessageOptions): Promise<ConversationMessage[]>;
  // Potentially add deleteMessage, updateMessage if needed
}

/** Repository for managing Observations. */
export interface IObservationRepository {
  addObservation(observation: Observation): Promise<void>;
  getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]>;
}

/** Repository for managing ThreadConfig and AgentState. */
export interface IStateRepository {
  getThreadConfig(threadId: string): Promise<ThreadConfig | null>;
  setThreadConfig(threadId: string, config: ThreadConfig): Promise<void>;
  getAgentState(threadId: string): Promise<AgentState | null>;
  setAgentState(threadId: string, state: AgentState): Promise<void>;
  // Potentially combine get/set into a single get/set ThreadContext method
  getThreadContext(threadId: string): Promise<ThreadContext | null>;
  setThreadContext(threadId: string, context: ThreadContext): Promise<void>;
}

/**
 * Represents the initialized ART instance returned by the factory function.
 */
export interface ArtInstance {
    process: IAgentCore['process']; // The main agent processing method
    uiSystem: UISystem; // Access to UI sockets
    stateManager: StateManager; // Access to State Manager
    conversationManager: ConversationManager; // Access to Conversation Manager
    toolRegistry: ToolRegistry; // Access to Tool Registry
    observationManager: ObservationManager; // Access to Observation Manager
    // Add other components if direct access is commonly needed
}