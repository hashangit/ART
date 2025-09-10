import { ProviderAdapter } from '@/core/interfaces';

export type { ProviderAdapter };

/**
 * Entry defining an available provider adapter.
 *
 * @interface AvailableProviderEntry
 */
export interface AvailableProviderEntry {
    /**
     * Unique key, e.g., 'openai', 'anthropic', 'ollama_local'.
     * @property {string} name
     */
    name: string;
    /**
     * The adapter class.
     * @property {new (options: any) => ProviderAdapter} adapter
     */
    adapter: new (options: any) => ProviderAdapter;
    /**
     * Optional base config (rarely needed if options are per-call).
     * @property {any} [baseOptions]
     */
    baseOptions?: any;
    /**
     * Default: false. Determines singleton vs. pooling behavior.
     * @property {boolean} [isLocal]
     */
    isLocal?: boolean;
}
/**
 * Configuration for the ProviderManager passed during ART initialization.
 *
 * @interface ProviderManagerConfig
 */
export interface ProviderManagerConfig {
    /**
     * @property {AvailableProviderEntry[]} availableProviders
     */
    availableProviders: AvailableProviderEntry[];
    /**
     * Max concurrent ACTIVE instances per API-based provider NAME. Default: 5.
     * @property {number} [maxParallelApiInstancesPerProvider]
     */
    maxParallelApiInstancesPerProvider?: number;
    /**
     * Time in seconds an API adapter instance can be idle before being eligible for removal. Default: 300.
     * @property {number} [apiInstanceIdleTimeoutSeconds]
     */
    apiInstanceIdleTimeoutSeconds?: number;
}
/**
 * Configuration passed AT RUNTIME for a specific LLM call.
 *
 * @interface RuntimeProviderConfig
 */
export interface RuntimeProviderConfig {
    /**
     * Must match a name in AvailableProviderEntry.
     * @property {string} providerName
     */
    providerName: string;
    /**
     * Specific model identifier (e.g., 'gpt-4o', 'llama3:latest').
     * @property {string} modelId
     */
    modelId: string;
    /**
     * Specific options for THIS instance (apiKey, temperature, contextSize, baseUrl, etc.).
     * @property {any} adapterOptions
     */
    adapterOptions: any;
    // modelName?: string; // Optional user-friendly name for logging
}
/**
 * Object returned by ProviderManager granting access to an adapter instance.
 *
 * @interface ManagedAdapterAccessor
 */
export interface ManagedAdapterAccessor {
    /**
     * The ready-to-use adapter instance.
     * @property {ProviderAdapter} adapter
     */
    adapter: ProviderAdapter;
    /**
     * Signals that the current call using this adapter instance is finished.
     * @property {() => void} release
     */
    release: () => void;
}
/**
 * Interface for the ProviderManager.
 *
 * @interface IProviderManager
 */
export interface IProviderManager {
    /**
     * Returns identifiers for all registered potential providers.
     * @returns {string[]}
     */
    getAvailableProviders(): string[];

    /**
     * Gets a managed adapter instance based on the runtime config.
     *
     * @remarks
     * Handles instance creation, caching, pooling limits, and singleton constraints.
     * May queue requests or throw errors based on concurrency limits.
     *
     * @param {RuntimeProviderConfig} config
     * @returns {Promise<ManagedAdapterAccessor>}
     */
    getAdapter(config: RuntimeProviderConfig): Promise<ManagedAdapterAccessor>;

    /** Optional: Gracefully shuts down managed instances */
    // shutdown?(): Promise<void>;
}