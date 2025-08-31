// src/systems/ui/ui-system.ts
import {
    UISystem as IUISystem,
    IObservationRepository,
    IConversationRepository,
    IA2ATaskRepository
} from '@/core/interfaces';
import { ObservationSocket } from './observation-socket';
import { ConversationSocket } from './conversation-socket';
import { LLMStreamSocket } from './llm-stream-socket'; // Import the new socket
import { A2ATaskSocket } from './a2a-task-socket';
import { Logger } from '@/utils/logger';

/**
 * Provides access to the UI communication sockets (Observation, Conversation, LLM Stream, and A2A Task).
 * Instantiates the sockets with their required dependencies.
 */
export class UISystem implements IUISystem {
    private observationSocketInstance: ObservationSocket;
    private conversationSocketInstance: ConversationSocket;
    private llmStreamSocketInstance: LLMStreamSocket; // Add the new socket instance
    private a2aTaskSocketInstance: A2ATaskSocket;

    /**
     * Creates an instance of UISystem.
     * @param observationRepository - Repository for observation data, passed to ObservationSocket.
     * @param conversationRepository - Repository for conversation data, passed to ConversationSocket.
     * @param a2aTaskRepository - Optional repository for A2A task data, passed to A2ATaskSocket.
     */
    constructor(
        observationRepository: IObservationRepository,
        conversationRepository: IConversationRepository,
        a2aTaskRepository?: IA2ATaskRepository
    ) {
        this.observationSocketInstance = new ObservationSocket(observationRepository);
        this.conversationSocketInstance = new ConversationSocket(conversationRepository);
        this.llmStreamSocketInstance = new LLMStreamSocket(); // Instantiate the new socket
        this.a2aTaskSocketInstance = new A2ATaskSocket(a2aTaskRepository);
        Logger.debug('UISystem initialized with Observation, Conversation, LLM Stream, and A2A Task sockets.');
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

    /**
     * Gets the singleton instance of the LLMStreamSocket.
     * @returns The LLMStreamSocket instance.
     */
    getLLMStreamSocket(): LLMStreamSocket {
        return this.llmStreamSocketInstance;
    }

    /**
     * Gets the singleton instance of the A2ATaskSocket.
     * @returns The A2ATaskSocket instance.
     */
    getA2ATaskSocket(): A2ATaskSocket {
        return this.a2aTaskSocketInstance;
    }
}