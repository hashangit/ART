import { IObservationRepository, StorageAdapter } from '../../../core/interfaces';
import { Observation, ObservationFilter } from '../../../types';

// Observation already has an 'id' field, so no need for a separate Stored type usually.
// However, ensure the StorageAdapter expects 'id' as the keyPath for the 'observations' store.

/**
 * Repository for managing Observations using a StorageAdapter.
 */
export class ObservationRepository implements IObservationRepository {
  private adapter: StorageAdapter;
  private readonly collectionName = 'observations'; // Define the collection name

  constructor(storageAdapter: StorageAdapter) {
    this.adapter = storageAdapter;
    // Initialization of the adapter should ideally happen at application setup.
  }

  /**
   * Adds a single observation to the storage.
   * @param observation The Observation object to add.
   */
  async addObservation(observation: Observation): Promise<void> {
    // The observation object already has an 'id' property, which should match the keyPath.
    if (typeof observation.id === 'undefined') {
        return Promise.reject(new Error(`ObservationRepository: Observation must have an 'id' property.`));
    }
    await this.adapter.set<Observation>(this.collectionName, observation.id, observation);
  }

  /**
   * Retrieves observations for a specific thread, with optional filtering.
   * Note: Filtering by type and timestamp is currently handled client-side.
   * @param threadId The ID of the thread to retrieve observations for.
   * @param filter Optional filtering criteria like types and timestamps.
   * @returns A promise resolving to an array of Observations.
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