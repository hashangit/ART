// src/systems/ui/ui-system.ts
import {
    UISystem as IUISystem,
    IObservationRepository,
    IConversationRepository
} from '../../core/interfaces';
import { ObservationSocket } from './observation-socket';
import { ConversationSocket } from './conversation-socket';
import { Logger } from '../../utils/logger';

/**
 * Provides access to the UI communication sockets (Observation and Conversation).
 * Instantiates the sockets with their required repository dependencies.
 */
export class UISystem implements IUISystem {
    private observationSocketInstance: ObservationSocket;
    private conversationSocketInstance: ConversationSocket;

    /**
     * Creates an instance of UISystem.
     * @param observationRepository - Repository for observation data, passed to ObservationSocket.
     * @param conversationRepository - Repository for conversation data, passed to ConversationSocket.
     */
    constructor(
        observationRepository: IObservationRepository,
        conversationRepository: IConversationRepository
    ) {
        this.observationSocketInstance = new ObservationSocket(observationRepository);
        this.conversationSocketInstance = new ConversationSocket(conversationRepository);
        Logger.debug('UISystem initialized with Observation and Conversation sockets.');
    }

    /**
     * Gets the singleton instance of the ObservationSocket.
     * @returns The ObservationSocket instance.
     */
    getObservationSocket(): ObservationSocket {
        return this.observationSocketInstance;
    }

    /**
     * Gets the singleton instance of the ConversationSocket.
     * @returns The ConversationSocket instance.
     */
    getConversationSocket(): ConversationSocket {
        return this.conversationSocketInstance;
    }
}