import {
    IProviderManager,
    ProviderManagerConfig,
    RuntimeProviderConfig,
    ManagedAdapterAccessor,
    AvailableProviderEntry,
} from '../types/providers';
import { ProviderAdapter } from '../core/interfaces';
import {
    UnknownProviderError,
    LocalProviderConflictError,
    LocalInstanceBusyError,
    AdapterInstantiationError, // Will need this later
} from '../errors';

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
                  obj[key] = config.adapterOptions[key];
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
            // Clear idle timer when reusing (checklist item 12 part of 95)
            if (existingInstance.idleTimer) {
                clearTimeout(existingInstance.idleTimer);
                existingInstance.idleTimer = undefined;
            }
            console.log(`Reusing idle instance for signature: ${configSignature}`); // Temporary log

            const release = () => this._releaseAdapter(configSignature);
            return { adapter: existingInstance.adapter, release };
        }

        // 2. Check local provider constraints (checklist item 12 part of 97-102)
        const providerEntry = this.availableProviders.get(config.providerName);
        if (!providerEntry) {
            throw new UnknownProviderError(config.providerName);
        }

        if (providerEntry.isLocal) {
            let idleLocalProviderDifferentSignature: ManagedInstance | undefined = undefined;

            for (const [sig, instance] of this.managedInstances.entries()) {
                const entry = this.availableProviders.get(instance.configSignature.split('"providerName":"')[1].split('"')[0]); // Extract providerName from signature - TODO: Better way?
                 if (entry?.isLocal) {
                    if (instance.state === 'active') {
                        if (sig !== configSignature) {
                            // Another local provider is active
                            throw new LocalProviderConflictError(config.providerName, entry.name);
                        } else {
                            // The same local instance is busy
                            throw new LocalInstanceBusyError(config.providerName, config.modelId);
                        }
                    } else if (instance.state === 'idle' && sig !== configSignature) {
                         // Found an idle local provider with a different signature
                         idleLocalProviderDifferentSignature = instance;
                    }
                 }
            }

            // If a different idle local provider exists, evict it
            if (idleLocalProviderDifferentSignature) {
                console.log(`Evicting idle local instance with different signature: ${idleLocalProviderDifferentSignature.configSignature}`); // Temporary log
                await this._evictInstance(idleLocalProviderDifferentSignature.configSignature);
            }
        }

        // 3. Check API provider concurrency limits (checklist item 12 part of 89-90)
        if (!providerEntry.isLocal) {
            const activeApiInstancesCount = Array.from(this.managedInstances.values()).filter(
                instance => {
                    const entry = this.availableProviders.get(instance.configSignature.split('"providerName":"')[1].split('"')[0]); // Extract providerName - TODO: Better way?
                    return entry && !entry.isLocal && instance.state === 'active' && entry.name === config.providerName;
                }
            ).length;

            if (activeApiInstancesCount >= this.maxParallelApiInstancesPerProvider) {
                console.log(`API limit reached for ${config.providerName}. Queueing request.`); // Temporary log
                // 4. If limits reached, queue request (checklist item 12 part of 90)
                return new Promise<ManagedAdapterAccessor>((resolve, reject) => {
                    // Store config, resolve, and reject in the queue
                    this.requestQueue.push({ config, resolve, reject });
                });
            }
        }

        // 5. If no limits, create new instance (checklist item 12 part of 360)
        let adapterInstance: ProviderAdapter;
        try {
            adapterInstance = new providerEntry.adapter(config.adapterOptions);
        } catch (error: any) {
            throw new AdapterInstantiationError(config.providerName, error);
        }


        // 6. Store new instance (checklist item 12 part of 361)
        const newManagedInstance: ManagedInstance = {
            adapter: adapterInstance,
            configSignature: configSignature,
            state: 'active',
        };
        this.managedInstances.set(configSignature, newManagedInstance);
        console.log(`Created new instance for signature: ${configSignature}`); // Temporary log


        // 7. Return ManagedAdapterAccessor for new instance (checklist item 12 part of 362)
        const release = () => this._releaseAdapter(configSignature);
        return { adapter: newManagedInstance.adapter, release };
    }

    /**
     * Internal method to release an adapter instance back to the manager.
     * @param configSignature The signature of the instance to release.
     */
    private _releaseAdapter(configSignature: string): void {
        console.log(`Release called for signature: ${configSignature}`); // Temporary log
        const instance = this.managedInstances.get(configSignature);
        if (!instance) {
            console.warn(`Attempted to release unknown instance with signature: ${configSignature}`);
            return;
        }

        instance.state = 'idle';
        instance.lastUsedTimestamp = Date.now();

        const providerEntry = this.availableProviders.get(instance.configSignature.split('"providerName":"')[1].split('"')[0]); // Extract providerName - TODO: Better way?

        // Start idle timer for API instances (checklist item 13 part of 366)
        if (providerEntry && !providerEntry.isLocal) {
            if (instance.idleTimer) {
                clearTimeout(instance.idleTimer);
            }
            instance.idleTimer = setTimeout(() => {
                this._evictInstance(configSignature);
            }, this.apiInstanceIdleTimeoutMs);
        }

        // Check request queue (checklist item 13 part of 367)
        if (this.requestQueue.length > 0) {
            // Dequeue the oldest request
            const nextRequest = this.requestQueue.shift();
            if (nextRequest) {
                 console.log(`Dequeuing request for provider: ${nextRequest.config.providerName}`); // Temporary log
                 // Attempt to fulfill the dequeued request by recursively calling getAdapter
                 // This will either find an idle instance (potentially the one just released)
                 // or create a new one if allowed, or re-queue if limits are still hit.
                 this.getAdapter(nextRequest.config)
                     .then(nextRequest.resolve) // Resolve the original promise with the obtained accessor
                     .catch(nextRequest.reject); // Reject the original promise if getting the adapter fails
            }
        }
    }

    /**
     * Internal method to evict an instance from the manager.
     * @param configSignature The signature of the instance to evict.
     */
    private async _evictInstance(configSignature: string): Promise<void> {
        console.log(`Attempting to evict instance with signature: ${configSignature}`); // Temporary log
        const instance = this.managedInstances.get(configSignature);

        // Only evict if the instance exists and is currently idle
        if (instance && instance.state === 'idle') {
            console.log(`Evicting idle instance with signature: ${configSignature}`); // Temporary log
            // Call adapter.shutdown?.() (checklist item 14 part of 371)
            if (instance.adapter.shutdown) {
                try {
                    await instance.adapter.shutdown();
                    console.log(`Adapter shutdown successful for ${configSignature}`);
                } catch (error) {
                    console.error(`Error during adapter shutdown for ${configSignature}:`, error);
                }
            }

            this.managedInstances.delete(configSignature);
            // Clear timer reference if it exists (checklist item 14 part of 373)
            if (instance.idleTimer) {
                clearTimeout(instance.idleTimer);
                instance.idleTimer = undefined;
            }
        } else if (instance && instance.state === 'active') {
             console.log(`Instance with signature ${configSignature} is active, not evicting.`); // Temporary log
        } else {
             console.log(`Instance with signature ${configSignature} not found, cannot evict.`); // Temporary log
        }
    }

    // Note: Queue processing is handled in _releaseAdapter. Idle eviction is handled by timers set in _releaseAdapter calling _evictInstance.
}