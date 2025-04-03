// src/types/index.ts

/**
 * Represents the role of a message sender in a conversation.
 */
export enum MessageRole {
  USER = 'USER',
  AI = 'AI',
  SYSTEM = 'SYSTEM', // Added for system prompts, though not explicitly in checklist message interface
  TOOL = 'TOOL',     // Added for tool results, though not explicitly in checklist message interface
}

/**
 * Represents a single message within a conversation thread.
 */
export interface ConversationMessage {
  messageId: string;
  threadId: string;
  role: MessageRole;
  content: string;
  timestamp: number; // Unix timestamp (milliseconds)
  metadata?: Record<string, any>; // For additional context, tool call IDs, etc.
}

/**
 * Represents the type of an observation record.
 */
export enum ObservationType {
  INTENT = 'INTENT',
  PLAN = 'PLAN',
  THOUGHTS = 'THOUGHTS',
  TOOL_CALL = 'TOOL_CALL', // Renamed from checklist for clarity
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  SYNTHESIS = 'SYNTHESIS', // Added for final synthesis step
  ERROR = 'ERROR',
  FINAL_RESPONSE = 'FINAL_RESPONSE', // Added for the final AI response message
  STATE_UPDATE = 'STATE_UPDATE', // Added for state changes
}

/**
 * Represents a recorded event during the agent's execution.
 */
export interface Observation {
  id: string; // Unique identifier for the observation
  threadId: string;
  traceId?: string; // Optional end-to-end trace identifier
  timestamp: number; // Unix timestamp (milliseconds)
  type: ObservationType;
  title: string; // Human-readable title for the observation type
  content: any; // Structured data specific to the observation type
  metadata?: Record<string, any>; // Additional context
}

/**
 * Defines the schema for a tool, including its input parameters.
 * Uses JSON Schema format for inputSchema.
 */
export interface ToolSchema {
  name: string; // Must be unique within the registry
  description: string;
  inputSchema: object; // JSON Schema object
  outputSchema?: object; // Optional JSON Schema for the output
  examples?: Array<{ input: any; output?: any; description?: string }>; // Optional examples
}

/**
 * Represents the structured result of a tool execution.
 */
export interface ToolResult {
  callId: string; // Identifier linking back to the specific tool call request
  toolName: string;
  status: 'success' | 'error';
  output?: any; // The data returned by the tool on success
  error?: string; // Error message on failure
  metadata?: Record<string, any>; // Execution time, cost, etc.
}

/**
 * Represents a parsed request from the LLM to call a specific tool.
 */
export interface ParsedToolCall {
  callId: string; // Unique ID generated for this specific call attempt
  toolName: string;
  arguments: any; // Parsed arguments object for the tool
}

/**
 * Configuration specific to a conversation thread.
 */
export interface ThreadConfig {
  reasoning: {
    provider: string; // Identifier for the LLM provider (e.g., 'openai')
    model: string; // Specific model name (e.g., 'gpt-4-turbo')
    parameters?: Record<string, any>; // Temperature, top_p, etc.
    // Potentially add prompt template overrides here
  };
  enabledTools: string[]; // List of tool names allowed for this thread
  historyLimit: number; // Max number of messages to keep in context
  systemPrompt?: string; // Overrides default system prompt
  // Other thread-specific settings
}

/**
 * Represents non-configuration state associated with an agent or thread.
 * Could include user preferences, accumulated knowledge, etc. (Less defined for v1.0)
 */
export interface AgentState {
  [key: string]: any; // Flexible structure for now
}

/**
 * Encapsulates the configuration and state for a specific thread.
 */
export interface ThreadContext {
  config: ThreadConfig;
  state: AgentState | null; // State might not always exist
}

/**
 * Properties required to initiate an agent processing cycle.
 */
export interface AgentProps {
  query: string; // The user's input/request
  threadId: string; // Mandatory identifier for the conversation thread
  sessionId?: string; // Optional session identifier
  userId?: string; // Optional user identifier
  traceId?: string; // Optional end-to-end trace identifier
  options?: AgentOptions; // Runtime overrides for configuration
  // Dependencies will be injected by the factory, not passed directly here in v1.0 design
}

/**
 * Options to override agent behavior at runtime.
 */
export interface AgentOptions {
  // Example: Override specific LLM parameters for this call
  llmParams?: Record<string, any>;
  // Example: Force use of specific tools for this call
  forceTools?: string[];
  // Add other potential overrides
}

/**
 * The final structured response returned by the agent core after processing.
 */
export interface AgentFinalResponse {
  response: ConversationMessage; // The final AI message added to the conversation
  metadata: ExecutionMetadata; // Metadata about the entire execution cycle
}

/**
 * Metadata summarizing an agent execution cycle.
 */
export interface ExecutionMetadata {
  threadId: string;
  traceId?: string;
  userId?: string;
  status: 'success' | 'error' | 'partial'; // Overall status
  totalDurationMs: number; // Total time taken for the process call
  llmCalls: number; // Count of LLM calls made
  toolCalls: number; // Count of tool calls made
  llmCost?: number; // Optional estimated cost
  error?: string; // Top-level error message if status is 'error' or 'partial'
}

/**
 * Context provided to a tool during its execution.
 */
export interface ExecutionContext {
  threadId: string;
  traceId?: string;
  userId?: string;
  // Potentially include access tokens or credentials if needed securely
  // Access to StateManager or other relevant context could be added if required
}

/**
 * Options for configuring an LLM call.
 */
export interface CallOptions {
  threadId: string; // Essential for context/config lookup
  traceId?: string;
  userId?: string;
  onThought?: (thought: string) => void; // Callback for streaming intermediate thoughts
  // Include LLM-specific parameters like temperature, max_tokens, stop_sequences, etc.
  // These might be nested under a provider-specific key or flattened
  [key: string]: any; // Allow arbitrary LLM parameters
}

/**
 * Represents the prompt data formatted for a specific LLM provider.
 * Can be a simple string or a complex object (e.g., for OpenAI Chat Completion API).
 */
export type FormattedPrompt = string | object | Array<object>;

/**
 * Options for filtering data retrieved from storage.
 * Structure depends heavily on the underlying adapter's capabilities.
 */
export interface FilterOptions {
  filter: Record<string, any>; // Key-value pairs for filtering (e.g., { type: 'PLAN', threadId: '...' })
  sort?: Record<string, 'asc' | 'desc'>; // Key-value pairs for sorting
  limit?: number; // Maximum number of results to return
  skip?: number; // Number of results to skip (for pagination)
  // Adapter-specific options might be needed
}

/**
 * Options for retrieving conversation messages.
 */
export interface MessageOptions {
  limit?: number; // Max number of messages
  beforeTimestamp?: number; // Retrieve messages before this timestamp
  afterTimestamp?: number; // Retrieve messages after this timestamp
  // Potentially filter by role
}

/**
 * Options for filtering observations.
 */
export interface ObservationFilter {
  types?: ObservationType[]; // Filter by specific observation types
  beforeTimestamp?: number;
  afterTimestamp?: number;
  // Add other potential criteria like content matching if needed
}