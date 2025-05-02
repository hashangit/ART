import { IObservationRepository, StorageAdapter } from '../../../core/interfaces';
import { Observation, ObservationFilter } from '../../../types';

// Observation already has an 'id' field, so no need for a separate Stored type usually.
// However, ensure the StorageAdapter expects 'id' as the keyPath for the 'observations' store.

/**
 * Implements the `IObservationRepository` interface, providing methods to
 * manage `Observation` objects using an underlying `StorageAdapter`.
 * Handles adding and retrieving observations for specific threads.
 *
 * @implements {IObservationRepository}
 */
export class ObservationRepository implements IObservationRepository {
  private adapter: StorageAdapter;
  private readonly collectionName = 'observations'; // Define the collection name

  /**
   * Creates an instance of ObservationRepository.
   * @param storageAdapter - The configured `StorageAdapter` instance that will be used for persistence.
   */
  constructor(storageAdapter: StorageAdapter) {
     if (!storageAdapter) {
      throw new Error("ObservationRepository requires a valid StorageAdapter instance.");
    }
    this.adapter = storageAdapter;
    // Note: Initialization of the adapter (adapter.init()) should be handled
    // at the application setup level (e.g., within AgentFactory or createArtInstance)
    // before the repository is used.
  }

  /**
   * Adds a single `Observation` object to the storage using its `id` as the key.
   * @param observation - The `Observation` object to add. Must have a valid `id`.
   * @returns A promise that resolves when the observation has been saved.
   * @throws {Error} If the observation is missing an `id` or if the storage adapter fails.
   */
  async addObservation(observation: Observation): Promise<void> {
    // The observation object already has an 'id' property, which should match the keyPath.
    if (typeof observation.id === 'undefined') {
        return Promise.reject(new Error(`ObservationRepository: Observation must have an 'id' property.`));
    }
    await this.adapter.set<Observation>(this.collectionName, observation.id, observation);
  }

  /**
   * Retrieves observations for a specific thread from the storage adapter.
   * This implementation fetches all observations for the thread and then applies
   * client-side filtering (by type, timestamp) and sorting (by timestamp).
   * For performance with many observations, adapter-level querying/indexing would be preferable.
   * @param threadId - The ID of the thread whose observations are to be retrieved.
   * @param filter - Optional `ObservationFilter` criteria (e.g., `types`, `beforeTimestamp`, `afterTimestamp`).
   * @returns A promise resolving to an array of `Observation` objects matching the criteria, sorted chronologically (ascending timestamp).
   * @throws {Error} Propagates errors from the storage adapter's `query` method.
   */
  async getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]> {
    // Query the adapter for all observations matching the threadId
    const queryResults = await this.adapter.query<Observation>(this.collectionName, {
      filter: { threadId: threadId },
      // Add sorting by timestamp at the adapter level if supported, otherwise sort client-side
      // sort: { timestamp: 'asc' }
    });

    // Client-side filtering and sorting
    let filteredObservations = queryResults;

    // Sort by timestamp (ascending) - useful for chronological view
    filteredObservations.sort((a, b) => a.timestamp - b.timestamp);

    // Apply type filter client-side
    if (filter?.types && filter.types.length > 0) {
      const typeSet = new Set(filter.types);
      filteredObservations = filteredObservations.filter(obs => typeSet.has(obs.type));
    }

    // Apply timestamp filters client-side
    if (filter?.beforeTimestamp !== undefined) {
      filteredObservations = filteredObservations.filter(obs => obs.timestamp < filter.beforeTimestamp!);
    }
    if (filter?.afterTimestamp !== undefined) {
      filteredObservations = filteredObservations.filter(obs => obs.timestamp > filter.afterTimestamp!);
    }

    // Note: Limit/Skip are not part of ObservationFilter in the current types,
    // but could be added if needed and handled here similarly to ConversationRepository.

    // Observations retrieved from storage should already match the Observation interface.
    // No need to remove 'id' like in ConversationRepository.
    return filteredObservations;
  }
}