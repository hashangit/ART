import { ProviderAdapter } from '../core/interfaces';

export { ProviderAdapter };

/** Entry defining an available provider adapter */
export interface AvailableProviderEntry {
    name: string; // Unique key, e.g., 'openai', 'anthropic', 'ollama_local'
    adapter: new (options: any) => ProviderAdapter; // The adapter class
    baseOptions?: any; // Optional base config (rarely needed if options are per-call)
    isLocal?: boolean; // Default: false. Determines singleton vs. pooling behavior.
}
/** Configuration for the ProviderManager passed during ART initialization */
export interface ProviderManagerConfig {
    availableProviders: AvailableProviderEntry[];
    /** Max concurrent ACTIVE instances per API-based provider NAME. Default: 5 */
    maxParallelApiInstancesPerProvider?: number;
    /** Time in seconds an API adapter instance can be idle before being eligible for removal. Default: 300 */
    apiInstanceIdleTimeoutSeconds?: number;
}
/** Configuration passed AT RUNTIME for a specific LLM call */
export interface RuntimeProviderConfig {
    providerName: string; // Must match a name in AvailableProviderEntry
    modelId: string; // Specific model identifier (e.g., 'gpt-4o', 'llama3:latest')
    adapterOptions: any; // Specific options for THIS instance (apiKey, temperature, contextSize, baseUrl, etc.)
    // modelName?: string; // Optional user-friendly name for logging
}
/** Object returned by ProviderManager granting access to an adapter instance */
export interface ManagedAdapterAccessor {
    adapter: ProviderAdapter; // The ready-to-use adapter instance
    /** Signals that the current call using this adapter instance is finished. */
    release: () => void;
}
/** Interface for the ProviderManager */
export interface IProviderManager {
    /** Returns identifiers for all registered potential providers */
    getAvailableProviders(): string[];

    /**
     * Gets a managed adapter instance based on the runtime config.
     * Handles instance creation, caching, pooling limits, and singleton constraints.
     * May queue requests or throw errors based on concurrency limits.
     */
    getAdapter(config: RuntimeProviderConfig): Promise<ManagedAdapterAccessor>;

    /** Optional: Gracefully shuts down managed instances */
    // shutdown?(): Promise<void>;
}