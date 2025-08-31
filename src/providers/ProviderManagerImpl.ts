import {
    IProviderManager,
    ProviderManagerConfig,
    RuntimeProviderConfig,
    ManagedAdapterAccessor,
    AvailableProviderEntry,
} from '@/types/providers';
import { ProviderAdapter } from '@/core/interfaces';
import {
    UnknownProviderError,
    LocalProviderConflictError,
    LocalInstanceBusyError,
    AdapterInstantiationError, // Will need this later
} from '@/errors';

/** Internal type to track managed adapter instances */
interface ManagedInstance {
    adapter: ProviderAdapter;
    configSignature: string;
    state: 'idle' | 'active';
    lastUsedTimestamp?: number; // For API instance idle eviction
    idleTimer?: NodeJS.Timeout; // Timer reference for idle timeout
}

/** Internal type for queued requests */
interface QueuedRequest {
    config: RuntimeProviderConfig;
    resolve: (value: ManagedAdapterAccessor | PromiseLike<ManagedAdapterAccessor>) => void;
    reject: (reason?: any) => void;
}

/**
 * Manages the lifecycle and access to multiple ProviderAdapter implementations.
 */
export class ProviderManagerImpl implements IProviderManager {
    private availableProviders: Map<string, AvailableProviderEntry>;
    private maxParallelApiInstancesPerProvider: number;
    private apiInstanceIdleTimeoutMs: number;
    private managedInstances: Map<string, ManagedInstance>;
    private requestQueue: QueuedRequest[]; // Use the refined queue item type

    constructor(config: ProviderManagerConfig) {
        this.availableProviders = new Map(config.availableProviders.map(p => [p.name, p]));
        this.maxParallelApiInstancesPerProvider = config.maxParallelApiInstancesPerProvider ?? 5;
        this.apiInstanceIdleTimeoutMs = (config.apiInstanceIdleTimeoutSeconds ?? 300) * 1000;
        this.managedInstances = new Map();
        this.requestQueue = [];
    }

    /**
     * Generates a stable configuration signature for caching.
     * @param config The runtime provider configuration.
     * @returns A string signature.
     */
    private _getConfigSignature(config: RuntimeProviderConfig): string {
        const sortedAdapterOptions = config.adapterOptions
            ? Object.keys(config.adapterOptions).sort().reduce((obj: any, key) => {
                  // Never include secrets in signature logs; signature remains internal only
                  obj[key] = key.toLowerCase().includes('key') ? '***' : config.adapterOptions[key];
                  return obj;
              }, {})
            : {};
        return JSON.stringify({
            providerName: config.providerName,
            modelId: config.modelId,
            adapterOptions: sortedAdapterOptions,
        });
    }

    getAvailableProviders(): string[] {
        return Array.from(this.availableProviders.keys());
    }

    async getAdapter(config: RuntimeProviderConfig): Promise<ManagedAdapterAccessor> {
        const configSignature = this._getConfigSignature(config);

        // 1. Check cache for existing instance
        const existingInstance = this.managedInstances.get(configSignature);

        if (existingInstance && existingInstance.state === 'idle') {
            // Reuse idle instance
            existingInstance.state = 'active';
            // Clear idle timer when reusing
            if (existingInstance.idleTimer) {
                clearTimeout(existingInstance.idleTimer);
                existingInstance.idleTimer = undefined;
            }

            const release = () => this._releaseAdapter(configSignature);
            return { adapter: existingInstance.adapter, release };
        }

        // 2. Check local provider constraints
        const providerEntry = this.availableProviders.get(config.providerName);
        if (!providerEntry) {
            throw new UnknownProviderError(config.providerName);
        }

        if (providerEntry.isLocal) {
            let idleLocalProviderDifferentSignature: ManagedInstance | undefined = undefined;

            for (const [sig, instance] of this.managedInstances.entries()) {
                const entry = this.availableProviders.get(instance.configSignature.split('"providerName":"')[1].split('"')[0]);
                 if (entry?.isLocal) {
                    if (instance.state === 'active') {
                        if (sig !== configSignature) {
                            throw new LocalProviderConflictError(config.providerName, entry.name);
                        } else {
                            throw new LocalInstanceBusyError(config.providerName, config.modelId);
                        }
                    } else if (instance.state === 'idle' && sig !== configSignature) {
                         idleLocalProviderDifferentSignature = instance;
                    }
                 }
            }

            if (idleLocalProviderDifferentSignature) {
                await this._evictInstance(idleLocalProviderDifferentSignature.configSignature);
            }
        }

        // 3. Check API provider concurrency limits
        if (!providerEntry.isLocal) {
            const activeApiInstancesCount = Array.from(this.managedInstances.values()).filter(
                instance => {
                    const entry = this.availableProviders.get(instance.configSignature.split('"providerName":"')[1].split('"')[0]);
                    return entry && !entry.isLocal && instance.state === 'active' && entry.name === config.providerName;
                }
            ).length;

            if (activeApiInstancesCount >= this.maxParallelApiInstancesPerProvider) {
                return new Promise<ManagedAdapterAccessor>((resolve, reject) => {
                    this.requestQueue.push({ config, resolve, reject });
                });
            }
        }

        // 4. Create new instance
        let adapterInstance: ProviderAdapter;
        try {
            const adapterOptions = { 
                ...config.adapterOptions, 
                providerName: config.providerName 
            };
            adapterInstance = new providerEntry.adapter(adapterOptions);
        } catch (error: any) {
            throw new AdapterInstantiationError(config.providerName, error);
        }

        // 5. Store new instance
        const newManagedInstance: ManagedInstance = {
            adapter: adapterInstance,
            configSignature: configSignature,
            state: 'active',
        };
        this.managedInstances.set(configSignature, newManagedInstance);

        // 6. Return accessor
        const release = () => this._releaseAdapter(configSignature);
        return { adapter: newManagedInstance.adapter, release };
    }

    /**
     * Internal method to release an adapter instance back to the manager.
     * @param configSignature The signature of the instance to release.
     */
    private _releaseAdapter(configSignature: string): void {
        const instance = this.managedInstances.get(configSignature);
        if (!instance) {
            return;
        }

        instance.state = 'idle';
        instance.lastUsedTimestamp = Date.now();

        const providerEntry = this.availableProviders.get(instance.configSignature.split('"providerName":"')[1].split('"')[0]);

        // Start idle timer for API instances
        if (providerEntry && !providerEntry.isLocal) {
            if (instance.idleTimer) {
                clearTimeout(instance.idleTimer);
            }
            instance.idleTimer = setTimeout(() => {
                this._evictInstance(configSignature);
            }, this.apiInstanceIdleTimeoutMs);
        }

        // Check request queue
        if (this.requestQueue.length > 0) {
            const nextRequest = this.requestQueue.shift();
            if (nextRequest) {
                 this.getAdapter(nextRequest.config)
                     .then(nextRequest.resolve)
                     .catch(nextRequest.reject);
            }
        }
    }

    /**
     * Internal method to evict an instance from the manager.
     * @param configSignature The signature of the instance to evict.
     */
    private async _evictInstance(configSignature: string): Promise<void> {
        const instance = this.managedInstances.get(configSignature);

        if (instance && instance.state === 'idle') {
            if (instance.adapter.shutdown) {
                try {
                    await instance.adapter.shutdown();
                } catch (_error) {
                    // swallow adapter shutdown errors
                }
            }

            this.managedInstances.delete(configSignature);
            if (instance.idleTimer) {
                clearTimeout(instance.idleTimer);
                instance.idleTimer = undefined;
            }
        }
    }
}