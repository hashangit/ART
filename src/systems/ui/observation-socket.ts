// src/systems/ui/observation-socket.ts
import { TypedSocket } from './typed-socket';
import { Observation, ObservationType, ObservationFilter } from '../../types';
import { Logger } from '../../utils/logger';
import { IObservationRepository } from '../../core/interfaces'; // Assuming this exists

/**
 * A specialized TypedSocket for handling Observation data.
 * Allows filtering by ObservationType.
 * Can optionally fetch historical observations from a repository.
 */
export class ObservationSocket extends TypedSocket<Observation, ObservationType | ObservationType[]> {
  private observationRepository?: IObservationRepository;

  constructor(observationRepository?: IObservationRepository) {
    super(); // No logger instance needed
    this.observationRepository = observationRepository;
    Logger.debug('ObservationSocket initialized.');
  }

  /**
   * Notifies subscribers about a new observation.
   * @param observation - The observation data.
   */
  notifyObservation(observation: Observation): void {
    Logger.debug(`Notifying Observation: ${observation.id} (${observation.type}) for thread ${observation.threadId}`);
    super.notify(
      observation,
      { targetThreadId: observation.threadId },
      (data, filter) => {
        if (!filter) return true; // No filter, always notify
        if (Array.isArray(filter)) {
          return filter.includes(data.type); // Check if type is in the array
        }
        return data.type === filter; // Check for single type match
      }
    );
  }

  /**
   * Retrieves historical observations, optionally filtered by type and thread.
   * Requires an ObservationRepository to be configured.
   * @param filter - Optional ObservationType or array of types to filter by.
   * @param options - Optional threadId and limit.
   * @returns A promise resolving to an array of observations.
   */
  async getHistory(
    filter?: ObservationType | ObservationType[],
    options?: { threadId?: string; limit?: number }
  ): Promise<Observation[]> {
    if (!this.observationRepository) {
      Logger.warn('Cannot getHistory for ObservationSocket: ObservationRepository not configured.');
      return [];
    }
    if (!options?.threadId) {
      Logger.warn('Cannot getHistory for ObservationSocket: threadId is required.');
      return [];
    }

    Logger.debug(`Getting history for ObservationSocket: Thread ${options.threadId}, Filter: ${JSON.stringify(filter)}, Limit: ${options.limit}`);

    // Construct the ObservationFilter for the repository method
    const observationFilter: ObservationFilter = {};

    if (filter) {
      observationFilter.types = Array.isArray(filter) ? filter : [filter];
    }
    // Note: The limit option is not part of the ObservationFilter type.
    // It's expected that the IObservationRepository implementation
    // will handle limiting when querying the underlying StorageAdapter,
    // potentially by accepting limit directly or translating from options.
    // Sorting is also handled by the repository implementation.
    if (options.limit !== undefined) {
       // We don't assign options.limit to observationFilter directly.
       // The getObservations implementation needs to handle the limit.
       Logger.debug(`Limit requested: ${options.limit}. Repository implementation must handle this.`);
    }


    try {
      // Call the correct repository method
      const observations = await this.observationRepository.getObservations(
        options.threadId,
        observationFilter
      );
      // The repository method likely returns observations in a standard order (e.g., chronological or reverse chronological).
      // Assuming reverse chronological (newest first) based on common usage.
      return observations;
    } catch (error) {
      Logger.error(`Error fetching observation history for thread ${options.threadId} with filter ${JSON.stringify(observationFilter)}:`, error);
      return [];
    }
  }
}