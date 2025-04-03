import { ObservationManager as ObservationManagerInterface, IObservationRepository } from '../../core/interfaces'; // Import the interface defined in core/interfaces
import { ObservationSocket } from '../ui/observation-socket'; // Import the class implementation
import { Observation, ObservationFilter } from '../../types'; // Kept ObservationType and Omit removed
import { generateUUID } from '../../utils/uuid'; // Assuming UUID utility exists as per Phase 0.9

/**
 * Manages the creation, retrieval, and notification of agent observations.
 * Implements the IObservationManager interface.
 */
export class ObservationManager implements ObservationManagerInterface { // Implement the imported interface
    private observationRepository: IObservationRepository;
    private observationSocket: ObservationSocket;

    /**
     * Creates an instance of ObservationManager.
     * @param observationRepository - The repository for persisting observations.
     * @param observationSocket - The socket for notifying UI about new observations.
     */
    constructor(observationRepository: IObservationRepository, observationSocket: ObservationSocket) {
        this.observationRepository = observationRepository;
        this.observationSocket = observationSocket;
    }

    /**
     * Records a new observation.
     * Generates an ID and timestamp, saves the observation using the repository,
     * and notifies listeners via the observation socket.
     * @param observationData - The data for the observation, excluding id, timestamp, and title.
     * @returns A promise that resolves when the observation is recorded and notified.
     */
    async record(observationData: Omit<Observation, 'id' | 'timestamp' | 'title'>): Promise<void> { // Corrected Omit and Promise syntax
        const observation: Observation = {
            ...observationData,
            id: generateUUID(),
            timestamp: Date.now(),
            // Generate a simple title based on the type for now
            title: `${observationData.type} Recorded`,
        };

        try {
            await this.observationRepository.addObservation(observation); // Assuming addObservation exists on IObservationRepository
            this.observationSocket.notifyObservation(observation); // Use the specific method
        } catch (error) {
            console.error("Error recording observation:", error);
            // Decide on error handling strategy - rethrow, log, or generate an ERROR observation?
            // For now, just logging. Consider adding an ERROR observation itself.
            throw error; // Rethrowing for now so the caller is aware
        }
    }

    /**
     * Retrieves observations for a specific thread, optionally filtered.
     * @param threadId - The ID of the thread to retrieve observations for.
     * @param filter - Optional filter criteria for observations.
     * @returns A promise that resolves with an array of matching observations.
     */
    async getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]> {
        try {
            // Assuming repository has a 'findObservations' method that accepts threadId and filter
            // Assuming repository has a method matching this signature
            return await this.observationRepository.getObservations(threadId, filter); // Assuming repository method is getObservations
        } catch (error) {
            console.error(`Error retrieving observations for thread ${threadId}:`, error);
            throw error; // Rethrowing for now
        }
    }
}