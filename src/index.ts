/**
 * Main entry point for the ART Framework library.
 * This file exports the primary factory function (`createArtInstance`),
 * core components, adapters, types, interfaces, and utilities needed
 * to build and run ART agents.
 * 
 * @module ART
 */

// --- Core Factory Function ---
/**
 * The main function to create and initialize an ART instance.
 * @see {@link ./core/agent-factory.ts} for implementation details.
 */
export { createArtInstance } from '@/core/agent-factory';

// --- Agent Core Implementations ---
/**
 * The default Plan-Execute-Synthesize agent implementation.
 * @see {@link ./core/agents/pes-agent.ts}
 */
export { PESAgent } from '@/core/agents/pes-agent';
// export { ReActAgent } from './core/agents/react-agent'; // Example for future

// --- Storage Integrations (Implementations of `StorageAdapter`) ---
/** Stores data temporarily in memory. Useful for testing. */
export { InMemoryStorageAdapter } from '@/integrations/storage/inMemory';
/** Persists data in the browser's IndexedDB. Recommended for web apps. */
export { IndexedDBStorageAdapter } from '@/integrations/storage/indexedDB';
/** Persists data in Supabase (Postgres). Useful for cloud or server-side environments. */
export { SupabaseStorageAdapter } from '@/integrations/storage/supabase';

// --- Reasoning Provider Integrations (Implementations of `ProviderAdapter`) ---
/** Adapter for Google Gemini models. */
export { GeminiAdapter } from '@/integrations/reasoning/gemini';
/** Adapter for OpenAI models (GPT-3.5, GPT-4, etc.). */
export { OpenAIAdapter } from '@/integrations/reasoning/openai';
/** Adapter for Anthropic Claude models. */
export { AnthropicAdapter } from '@/integrations/reasoning/anthropic';
/** Adapter for OpenRouter, acting as a proxy to various models. */
export { OpenRouterAdapter } from '@/integrations/reasoning/openrouter';
/** Adapter for DeepSeek models. */
export { DeepSeekAdapter } from '@/integrations/reasoning/deepseek';
/** 
 * Adapter for running local models via Ollama.
 * @see {@link ./integrations/reasoning/ollama/index.ts}
 */
export { OllamaAdapter } from '@/integrations/reasoning/ollama';
export type { OllamaAdapterOptions } from '@/integrations/reasoning/ollama';

// --- Built-in Tools (Implementations of `IToolExecutor`) ---
/** A basic tool for evaluating mathematical expressions. */
export { CalculatorTool } from '@/tools/CalculatorTool';
// export { WebSearchTool } from './tools/WebSearchTool'; // Example for future

// --- Prompt Utilities ---
/** Provides access to prompt fragments and validation. */
export { PromptManager } from '@/systems/reasoning/PromptManager';

// --- Authentication Components ---
/** Manages authentication strategies and token lifecycle. */
export { AuthManager } from '@/systems/auth/AuthManager';
/** Implements the PKCE (Proof Key for Code Exchange) OAuth2 flow. */
export { PKCEOAuthStrategy } from '@/auth/PKCEOAuthStrategy';

// --- Core Types & Interfaces ---
/** 
 * Export all core data structures and type definitions.
 * @see {@link ./types/index.ts}
 */
export * from '@/types';
export type { ArtInstanceConfig } from '@/types'; // Explicit export for clarity
/** 
 * Export all core system interfaces.
 * @see {@link ./core/interfaces.ts}
 */
export * from '@/core/interfaces';
// Explicitly export Provider types from their source file
export type {
    ProviderManagerConfig,
    AvailableProviderEntry,
    RuntimeProviderConfig,
    ManagedAdapterAccessor,
    IProviderManager
} from '@/types/providers';

// --- Utility Functions & Classes ---
/** Basic logging utility with configurable levels. */
export { Logger, LogLevel } from '@/utils/logger';
/** Function to generate unique identifiers (UUID v4). */
export { generateUUID } from '@/utils/uuid';

// --- Framework Version ---
/** The current version of the ART Framework package. */
export const VERSION = '0.2.8';

// --- MCP Runtime Exports ---
/**
 * Exports for the Multi-Capability Provider (MCP) system.
 * These are used for runtime integration with MCP servers.
 */
export {
  McpManager,
  McpProxyTool,
  ConfigManager,
} from '@/systems/mcp';
export type {
  ArtMcpConfig,
  McpServerConfig,
  StreamableHttpConnection,
  McpToolDefinition,
  McpResource,
  McpResourceTemplate,
  McpServerStatus,
} from '@/systems/mcp';
export { McpClientController as McpClient } from '@/systems/mcp/McpClient';