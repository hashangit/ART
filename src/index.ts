/**
 * Main entry point for the ART Framework library.
 * This file exports the primary factory function (`createArtInstance`),
 * core components, adapters, types, interfaces, and utilities needed
 * to build and run ART agents.
 */

// --- Core Factory Function ---
/**
 * The main function to create and initialize an ART instance.
 * @see {@link ./core/agent-factory.ts} for implementation details.
 */
export { createArtInstance } from './core/agent-factory';

// --- Agent Core Implementations ---
/**
 * The default Plan-Execute-Synthesize agent implementation.
 * @see {@link ./core/agents/pes-agent.ts}
 */
export { PESAgent } from './core/agents/pes-agent';
// export { ReActAgent } from './core/agents/react-agent'; // Example for future

// --- Storage Adapters (Implementations of `StorageAdapter`) ---
/** Stores data temporarily in memory. Useful for testing. */
export { InMemoryStorageAdapter } from './adapters/storage/inMemory';
/** Persists data in the browser's IndexedDB. Recommended for web apps. */
export { IndexedDBStorageAdapter } from './adapters/storage/indexedDB';

// --- Reasoning Provider Adapters (Implementations of `ProviderAdapter`) ---
/** Adapter for Google Gemini models. */
export { GeminiAdapter } from './adapters/reasoning/gemini';
/** Adapter for OpenAI models (GPT-3.5, GPT-4, etc.). */
export { OpenAIAdapter } from './adapters/reasoning/openai';
/** Adapter for Anthropic Claude models. */
export { AnthropicAdapter } from './adapters/reasoning/anthropic';
/** Adapter for OpenRouter, acting as a proxy to various models. */
export { OpenRouterAdapter } from './adapters/reasoning/openrouter';
/** Adapter for DeepSeek models. */
export { DeepSeekAdapter } from './adapters/reasoning/deepseek';
/** Adapter for Ollama models. */
export { OllamaAdapter } from './adapters/reasoning/ollama';
export type { OllamaAdapterOptions } from './adapters/reasoning/ollama';

// --- Built-in Tools (Implementations of `IToolExecutor`) ---
/** A basic tool for evaluating mathematical expressions. */
export { CalculatorTool } from './tools/CalculatorTool';
// export { WebSearchTool } from './tools/WebSearchTool'; // Example for future

// --- Core Types & Interfaces ---
/** Export all core data structures and type definitions. @see {@link ./types/index.ts} */
export * from './types';
export type { ArtInstanceConfig } from './types'; // Explicit export for clarity
/** Export all core system interfaces. @see {@link ./core/interfaces.ts} */
export * from './core/interfaces';
// Explicitly export Provider types from their source file
export type {
    ProviderManagerConfig,
    AvailableProviderEntry,
    RuntimeProviderConfig,
    ManagedAdapterAccessor,
    IProviderManager
} from './types/providers';

// --- Utility Functions & Classes ---
/** Basic logging utility with configurable levels. */
export { Logger, LogLevel } from './utils/logger';
/** Function to generate unique identifiers (UUID v4). */
export { generateUUID } from './utils/uuid';

// --- Framework Version ---
/** The current version of the ART Framework package. */
export const VERSION = '0.2.7';