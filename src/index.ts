/**
 * ART (Agentic Reasoning & Tool-use) Framework - Main Entry Point
 * -----------------------------------------------------------------
 *
 * Welcome to the ART framework! This file is the primary public API surface for the library.
 * It's structured to provide a clear and intuitive experience for developers,
 * whether you're just getting started or building advanced, custom agentic systems.
 *
 * --- Quick Start ---
 * For most use cases, you'll only need `createArtInstance` and the associated types.
 *
 * Example:
 * ```ts
 * import { createArtInstance } from 'art-framework';
 * import type { ArtInstanceConfig } from 'art-framework';
 *
 * const config: ArtInstanceConfig = {
 *   storage: { type: 'memory' },
 *   providers: {
 *     openai: { adapter: 'openai', apiKey: '...' }
 *   },
 *   tools: [new CalculatorTool()],
 *   persona: {
 *     name: 'MyAgent',
 *     prompts: {
 *       synthesis: 'You are MyAgent. Always answer in rhyme.'
 *     }
 *   }
 * };
 *
 * const art = await createArtInstance(config);
 * const response = await art.process({ query: "Hello, world!" });
 * ```
 *
 * --- API Structure ---
 * 1.  **Core Factory**: The main function to create an ART instance.
 * 2.  **Primary Interfaces & Types**: Essential types for configuration and interaction.
 * 3.  **Built-in Components**: Concrete implementations of adapters, tools, and agents.
 * 4.  **Advanced Systems & Managers**: Lower-level components for building custom logic.
 * 5.  **Utilities**: Helper functions and classes.
 *
 * @module ART
 */

// --- 1. Core Factory ---

/**
 * The main factory function to create and initialize a complete ART framework instance.
 * This is the recommended starting point for all users. It simplifies setup by
 * assembling all necessary components based on the provided configuration.
 * @param {ArtInstanceConfig} config - The configuration object for the ART instance.
 * @returns {Promise<ArtInstance>} A promise that resolves to a ready-to-use ART instance.
 * @see {@link ArtInstanceConfig} for configuration options.
 */
export { createArtInstance } from '@/core/agent-factory';

// --- 2. Primary Interfaces & Types ---

/**
 * Core interfaces that define the contracts for key components of the ART framework.
 * Use these to build your own custom components (e.g., agents, tools, storage adapters).
 */
export * from '@/core/interfaces';

/**
 * Core data structures, enums, and type definitions used throughout the framework.
 * This includes types for messages, observations, agent state, and more.
 */
export * from '@/types';

/**
 * The main configuration object for creating an ART instance.
 * Explicitly exported for clarity and ease of use.
 */
export type { ArtInstanceConfig, AgentPersona } from '@/types';

/**
 * Types related to LLM Provider management.
 * Useful for advanced scenarios, such as dynamically configuring providers at runtime.
 */
export type {
  ProviderManagerConfig,
  AvailableProviderEntry,
  RuntimeProviderConfig,
  ManagedAdapterAccessor,
  IProviderManager,
} from '@/types/providers';

// --- 3. Built-in Components ---

// --- Agent Implementations ---

/**
 * The default agent core implementation based on the Plan-Execute-Synthesize model.
 * It's suitable for a wide range of general-purpose tasks.
 * When to use: As the default reasoning engine unless you have a specific need for a different agent architecture.
 */
export { PESAgent } from '@/core/agents/pes-agent';

// --- Storage Adapters ---

/**
 * A non-persistent storage adapter that keeps all data in memory.
 * When to use: Ideal for testing, short-lived scripts, or scenarios
 * where data persistence across sessions is not required.
 */
export { InMemoryStorageAdapter } from '@/integrations/storage/inMemory';

/**
 * A persistent storage adapter that uses the browser's IndexedDB.
 * When to use: The recommended choice for web-based applications to persist
 * conversation history and agent state on the client-side.
 */
export { IndexedDBStorageAdapter } from '@/integrations/storage/indexedDB';

/**
 * A persistent storage adapter for connecting to a Supabase (Postgres) database.
 * When to use: Suitable for server-side environments, or for applications
 * requiring data to be shared or persisted in the cloud.
 */
export { SupabaseStorageAdapter } from '@/integrations/storage/supabase';

// --- Reasoning Provider Adapters ---

/**
 * Adapter for Google's Gemini models.
 */
export { GeminiAdapter } from '@/integrations/reasoning/gemini';
export type { GeminiAdapterOptions } from '@/integrations/reasoning/gemini';

/**
 * Adapter for OpenAI's models (e.g., GPT-3.5, GPT-4).
 */
export { OpenAIAdapter } from '@/integrations/reasoning/openai';
export type { OpenAIAdapterOptions } from '@/integrations/reasoning/openai';

/**
 * Adapter for Anthropic's Claude models.
 */
export { AnthropicAdapter } from '@/integrations/reasoning/anthropic';
export type { AnthropicAdapterOptions } from '@/integrations/reasoning/anthropic';

/**
 * Adapter for OpenRouter, which acts as a proxy to a wide variety of models.
 */
export { OpenRouterAdapter } from '@/integrations/reasoning/openrouter';
export type { OpenRouterAdapterOptions } from '@/integrations/reasoning/openrouter';

/**
 * Adapter for DeepSeek models.
 */
export { DeepSeekAdapter } from '@/integrations/reasoning/deepseek';
export type { DeepSeekAdapterOptions } from '@/integrations/reasoning/deepseek';

/**
 * Adapter for running local LLMs through the Ollama service.
 */
export { OllamaAdapter } from '@/integrations/reasoning/ollama';
export type { OllamaAdapterOptions } from '@/integrations/reasoning/ollama';

// --- Built-in Tools ---

/**
 * A basic tool that allows the agent to evaluate mathematical expressions.
 */
export { CalculatorTool } from '@/tools/CalculatorTool';

// --- 4. Advanced Systems & Managers ---
// For developers who need to directly interact with or extend ART's internal systems.

// --- UI & Sockets ---
/**
 * Provides a real-time connection to an agent's conversation history.
 * When to use: For building custom UI components that display the back-and-forth
 * interaction between a user and the agent.
 */
export { ConversationSocket } from '@/systems/ui/conversation-socket';

/**
 * Provides a real-time stream of agent observations (e.g., tool calls, state changes).
 * When to use: For building developer tools, debug panels, or UIs that visualize
 * the agent's internal thought process.
 */
export { ObservationSocket } from '@/systems/ui/observation-socket';
export type { StreamEventTypeFilter } from '@/systems/ui/llm-stream-socket';
/**
 * Provides a real-time stream of raw token output from the LLM as it's generated.
 * When to use: For building UIs with a typewriter effect and fine-grained stream control.
 */
export { LLMStreamSocket } from '@/systems/ui/llm-stream-socket';
/**
 * Provides real-time updates for A2A task lifecycle events.
 * When to use: For dashboards/monitors tracking delegated task progress.
 */
export { A2ATaskSocket } from '@/systems/ui/a2a-task-socket';
/**
 * Facade providing access to all UI sockets.
 */
export { UISystem } from '@/systems/ui/ui-system';

// --- Authentication ---
/**
 * Manages authentication strategies and token lifecycle for external services.
 * When to use: When your tools or providers require secure authentication (e.g., OAuth2).
 * You can register different strategies with this manager.
 */
export { AuthManager } from '@/systems/auth/AuthManager';

/**
 * An implementation of the PKCE (Proof Key for Code Exchange) OAuth2 flow.
 * When to use: As a strategy in the `AuthManager` for services that support
 * the PKCE flow, common in public clients and SPAs.
 */
export { PKCEOAuthStrategy } from '@/auth/PKCEOAuthStrategy';
export type { PKCEOAuthConfig } from '@/auth/PKCEOAuthStrategy';
/**
 * Simple API key authentication strategy and generic OAuth strategy variants.
 */
export { ApiKeyStrategy } from '@/auth/ApiKeyStrategy';
export { GenericOAuthStrategy } from '@/auth/GenericOAuthStrategy';
export type { OAuthConfig } from '@/auth/GenericOAuthStrategy';
export { ZyntopiaOAuthStrategy } from '@/auth/ZyntopiaOAuthStrategy';
export type { ZyntopiaOAuthConfig } from '@/auth/ZyntopiaOAuthStrategy';

// --- MCP (Model Context Protocol) ---
/**
 * The core manager for handling connections to MCP servers.
 * When to use: When integrating ART with an MCP server to dynamically load tools and resources.
 */
export { McpManager } from '@/systems/mcp';
export type { McpManagerConfig } from '@/systems/mcp/types';

/**
 * A special tool that acts as a proxy for all tools provided by an MCP server.
 * When to use: This is typically registered automatically when MCP is configured,
 * but can be used manually for advanced MCP integrations.
 */
export { McpProxyTool } from '@/systems/mcp';

/**
 * Client controller for making direct requests to an MCP server.
 * When to use: If you need to interact with an MCP server's resources outside
 * of the standard agent tool-use loop.
 */
export { McpClientController } from '@/systems/mcp';
export type {
  McpServerConfig,
  McpToolDefinition,
  McpResource,
  McpResourceTemplate,
  McpServerStatus,
} from '@/systems/mcp/types';

// --- A2A (Agent-to-Agent Communication) ---
/**
 * Service for discovering other agents available on an A2A network.
 * When to use: When building collaborative agent systems where one agent
 * needs to find and delegate tasks to another.
 */
export { AgentDiscoveryService } from '@/systems/a2a/AgentDiscoveryService';
export type { AgentDiscoveryConfig } from '@/systems/a2a/AgentDiscoveryService';

/**
 * Service for delegating tasks to other agents and monitoring their status.
 * When to use: After discovering an agent, use this service to assign it a task
 * and receive updates on its progress.
 */
export { TaskDelegationService } from '@/systems/a2a/TaskDelegationService';
export type { TaskDelegationConfig, TaskStatusResponse } from '@/systems/a2a/TaskDelegationService';
export type { A2ATaskEvent, A2ATaskFilter } from '@/systems/ui/a2a-task-socket';


// --- 5. Utilities ---

// --- Managers & Registries (advanced) ---
/**
 * State manager for thread config/state with explicit/implicit save strategies.
 */
export { StateManager } from '@/systems/context/managers/StateManager';
/**
 * In-memory tool registry for registering and querying tool executors.
 */
export { ToolRegistry } from '@/systems/tool/ToolRegistry';
/**
 * Provider manager implementation controlling adapter lifecycles and concurrency.
 */
export { ProviderManagerImpl } from '@/systems/reasoning/ProviderManagerImpl';

/**
 * A simple logging utility with configurable levels.
 * When to use: For adding consistent logging throughout your custom components.
 * An instance is available on `ArtInstance.logger`.
 */
export { Logger, LogLevel } from '@/utils/logger';
export type { LoggerConfig } from '@/utils/logger';

/**
 * A function to generate RFC4122 v4 compliant UUIDs.
 * When to use: For creating unique identifiers for threads, messages, or other entities.
 */
export { generateUUID } from '@/utils/uuid';

// --- Framework Version ---
/**
 * The current version of the ART Framework package.
 */
export const VERSION = '0.3.8';