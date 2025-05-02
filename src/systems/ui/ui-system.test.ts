// src/systems/ui/ui-system.test.ts
import { describe, it, expect, vi } from 'vitest';
import { UISystem } from './ui-system';
import { IObservationRepository, IConversationRepository } from '../../core/interfaces';
import { ObservationSocket } from './observation-socket';
import { ConversationSocket } from './conversation-socket';
import { LLMStreamSocket } from './llm-stream-socket';
import { Logger } from '../../utils/logger';

// Mock Logger
vi.mock('../../utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));

// Mock Sockets
vi.mock('./observation-socket');
vi.mock('./conversation-socket');
vi.mock('./llm-stream-socket');

// Mock Repositories (just need objects conforming to the interface)
const mockObservationRepository: IObservationRepository = {
    addObservation: vi.fn(),
    getObservations: vi.fn(),
};

const mockConversationRepository: IConversationRepository = {
    addMessages: vi.fn(),
    getMessages: vi.fn(),
};

describe('UISystem', () => {
    it('should initialize correctly and instantiate sockets', () => {
        const uiSystem = new UISystem(mockObservationRepository, mockConversationRepository);

        expect(uiSystem).toBeInstanceOf(UISystem);
        // Check if sockets were instantiated (using the mocks)
        expect(ObservationSocket).toHaveBeenCalledTimes(1);
        expect(ObservationSocket).toHaveBeenCalledWith(mockObservationRepository);
        expect(ConversationSocket).toHaveBeenCalledTimes(1);
        expect(ConversationSocket).toHaveBeenCalledWith(mockConversationRepository);
        expect(LLMStreamSocket).toHaveBeenCalledTimes(1);
        expect(LLMStreamSocket).toHaveBeenCalledWith();
        expect(Logger.debug).toHaveBeenCalledWith('UISystem initialized with Observation, Conversation, and LLM Stream sockets.');
    });

    it('getObservationSocket should return the ObservationSocket instance', () => {
        const uiSystem = new UISystem(mockObservationRepository, mockConversationRepository);
        const socket = uiSystem.getObservationSocket();
        // Since we mocked the constructor, the instance is also a mock
        // We expect it to be an instance of the mocked ObservationSocket
        expect(socket).toBeInstanceOf(ObservationSocket);
    });

    it('getConversationSocket should return the ConversationSocket instance', () => {
        const uiSystem = new UISystem(mockObservationRepository, mockConversationRepository);
        const socket = uiSystem.getConversationSocket();
        // Expect it to be an instance of the mocked ConversationSocket
        expect(socket).toBeInstanceOf(ConversationSocket);
    });

    it('should return the same socket instances on multiple calls', () => {
        const uiSystem = new UISystem(mockObservationRepository, mockConversationRepository);
        const socket1 = uiSystem.getObservationSocket();
        const socket2 = uiSystem.getObservationSocket();
        const convSocket1 = uiSystem.getConversationSocket();
        const convSocket2 = uiSystem.getConversationSocket();
        const streamSocket1 = uiSystem.getLLMStreamSocket();
        const streamSocket2 = uiSystem.getLLMStreamSocket();

        expect(socket1).toBe(socket2); // Should be the same instance
        expect(convSocket1).toBe(convSocket2); // Should be the same instance
        expect(streamSocket1).toBe(streamSocket2); // Should be the same instance
    });

    it('getLLMStreamSocket should return the LLMStreamSocket instance', () => {
        const uiSystem = new UISystem(mockObservationRepository, mockConversationRepository);
        const socket = uiSystem.getLLMStreamSocket();
        // Expect it to be an instance of the mocked LLMStreamSocket
        expect(socket).toBeInstanceOf(LLMStreamSocket);
    });
});