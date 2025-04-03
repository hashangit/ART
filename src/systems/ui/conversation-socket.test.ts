// src/systems/ui/conversation-socket.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationSocket } from './conversation-socket';
import { IConversationRepository } from '../../core/interfaces';
import { ConversationMessage, MessageRole } from '../../types';
import { Logger } from '../../utils/logger';

// Mock Logger
vi.mock('../../utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));

// Mock Repository
const mockConversationRepository: IConversationRepository = {
    addMessages: vi.fn(),
    getMessages: vi.fn(),
};

const mockMessage: ConversationMessage = {
    messageId: 'msg-1',
    threadId: 'thread-1',
    role: MessageRole.USER,
    content: 'Hello there',
    timestamp: Date.now(),
};

describe('ConversationSocket', () => {
    let socket: ConversationSocket;

    beforeEach(() => {
        vi.clearAllMocks(); // Clear mocks before each test
        // Instantiate with the mock repository
        socket = new ConversationSocket(mockConversationRepository);
    });

    it('should initialize correctly', () => {
        expect(socket).toBeInstanceOf(ConversationSocket);
        expect(Logger.debug).toHaveBeenCalledWith('ConversationSocket initialized.');
    });

    it('should notify subscribers on notifyMessage', () => {
        const callback = vi.fn();
        socket.subscribe(callback);
        socket.notifyMessage(mockMessage);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(mockMessage);
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining(`Notifying Message: ${mockMessage.messageId}`));
    });

    it('should filter notifications by MessageRole (single)', () => {
        const callbackUser = vi.fn();
        const callbackAI = vi.fn();
        socket.subscribe(callbackUser, MessageRole.USER);
        socket.subscribe(callbackAI, MessageRole.AI);

        const userMessage: ConversationMessage = { ...mockMessage, role: MessageRole.USER };
        socket.notifyMessage(userMessage);

        expect(callbackUser).toHaveBeenCalledTimes(1);
        expect(callbackUser).toHaveBeenCalledWith(userMessage);
        expect(callbackAI).not.toHaveBeenCalled();
    });

     it('should filter notifications by MessageRole (array)', () => {
        const callbackUserOrAI = vi.fn();
        const callbackSystem = vi.fn();
        socket.subscribe(callbackUserOrAI, [MessageRole.USER, MessageRole.AI]);
        socket.subscribe(callbackSystem, MessageRole.SYSTEM);

        const userMessage: ConversationMessage = { ...mockMessage, role: MessageRole.USER };
        socket.notifyMessage(userMessage);

        expect(callbackUserOrAI).toHaveBeenCalledTimes(1);
        expect(callbackUserOrAI).toHaveBeenCalledWith(userMessage);
        expect(callbackSystem).not.toHaveBeenCalled();

        vi.clearAllMocks();

        const aiMessage: ConversationMessage = { ...mockMessage, messageId: 'msg-2', role: MessageRole.AI };
        socket.notifyMessage(aiMessage);

        expect(callbackUserOrAI).toHaveBeenCalledTimes(1);
        expect(callbackUserOrAI).toHaveBeenCalledWith(aiMessage);
        expect(callbackSystem).not.toHaveBeenCalled();
    });

    it('should filter notifications by threadId', () => {
        const callbackT1 = vi.fn();
        const callbackT2 = vi.fn();
        socket.subscribe(callbackT1, undefined, { threadId: 'thread-1' });
        socket.subscribe(callbackT2, undefined, { threadId: 'thread-2' });

        const messageT1: ConversationMessage = { ...mockMessage, threadId: 'thread-1' };
        socket.notifyMessage(messageT1);

        expect(callbackT1).toHaveBeenCalledTimes(1);
        expect(callbackT1).toHaveBeenCalledWith(messageT1);
        expect(callbackT2).not.toHaveBeenCalled();
    });

    it('should call repository getMessages on getHistory', async () => {
        const threadId = 'thread-hist-1';
        const options = { threadId, limit: 10 };
        const mockHistory: ConversationMessage[] = [{ ...mockMessage, threadId }];
        vi.mocked(mockConversationRepository.getMessages).mockResolvedValue(mockHistory);

        const history = await socket.getHistory(undefined, options); // No role filter

        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining(`Getting history for ConversationSocket: Thread ${threadId}`));
        expect(mockConversationRepository.getMessages).toHaveBeenCalledTimes(1);
        expect(mockConversationRepository.getMessages).toHaveBeenCalledWith(threadId, { limit: options.limit });
        expect(history).toEqual(mockHistory);
    });

     it('should warn but still call repository getMessages when role filter is provided (as filtering is not implemented in repo)', async () => {
        const threadId = 'thread-hist-2';
        const filter = MessageRole.AI;
        const options = { threadId, limit: 5 };
        const mockHistory: ConversationMessage[] = [{ ...mockMessage, threadId, role: MessageRole.USER }]; // Repo returns all roles
        vi.mocked(mockConversationRepository.getMessages).mockResolvedValue(mockHistory);

        const history = await socket.getHistory(filter, options);

        expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('Role filtering requested for ConversationSocket.getHistory'));
        expect(mockConversationRepository.getMessages).toHaveBeenCalledTimes(1);
        expect(mockConversationRepository.getMessages).toHaveBeenCalledWith(threadId, { limit: options.limit });
        expect(history).toEqual(mockHistory); // Returns unfiltered history from repo
    });

    it('getHistory should require threadId', async () => {
        const history = await socket.getHistory(MessageRole.USER, { limit: 10 }); // No threadId
        expect(history).toEqual([]);
        expect(mockConversationRepository.getMessages).not.toHaveBeenCalled();
        expect(Logger.warn).toHaveBeenCalledWith('Cannot getHistory for ConversationSocket: threadId is required.');
    });

    it('getHistory should handle repository errors', async () => {
        const threadId = 'thread-err-1';
        const error = new Error('DB failed');
        vi.mocked(mockConversationRepository.getMessages).mockRejectedValue(error);

        const history = await socket.getHistory(undefined, { threadId });

        expect(history).toEqual([]);
        expect(mockConversationRepository.getMessages).toHaveBeenCalledTimes(1);
        expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error fetching message history for thread ${threadId}`), error);
    });

    it('getHistory should work without a repository configured (warn and return empty)', async () => {
        const socketWithoutRepo = new ConversationSocket(); // No repo provided
        const history = await socketWithoutRepo.getHistory(undefined, { threadId: 'thread-no-repo' });

        expect(history).toEqual([]);
        expect(Logger.warn).toHaveBeenCalledWith('Cannot getHistory for ConversationSocket: ConversationRepository not configured.');
    });
});