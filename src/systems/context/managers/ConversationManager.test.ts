import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationManager } from './ConversationManager';
import { IConversationRepository } from '../../../core/interfaces';
import { ConversationMessage, MessageOptions, MessageRole } from '../../../types';

// Helper to create messages
const createMessage = (id: number, threadId: string, timestamp: number, role: MessageRole, content: string): ConversationMessage => ({
  messageId: `msg-${id}`,
  threadId: threadId,
  timestamp: timestamp,
  role: role,
  content: content,
});

// Create a mock repository
const createMockRepository = (): IConversationRepository => ({
  addMessages: vi.fn().mockResolvedValue(undefined),
  getMessages: vi.fn().mockResolvedValue([]), // Default to empty array
});

describe('ConversationManager', () => {
  let mockRepository: IConversationRepository;
  let manager: ConversationManager;
  const threadId = 'conv-mgr-thread-1';

  beforeEach(() => {
    mockRepository = createMockRepository();
    manager = new ConversationManager(mockRepository);
  });

  describe('addMessages', () => {
    it('should call repository.addMessages with correct arguments', async () => {
      const messages = [
        createMessage(1, threadId, Date.now(), MessageRole.USER, 'Hello'),
        createMessage(2, threadId, Date.now() + 1, MessageRole.AI, 'Hi there'),
      ];
      await manager.addMessages(threadId, messages);

      expect(mockRepository.addMessages).toHaveBeenCalledOnce();
      expect(mockRepository.addMessages).toHaveBeenCalledWith(threadId, messages);
    });

    it('should resolve successfully even if repository throws (depends on desired behavior - current impl lets repo handle errors)', async () => {
       // Mock repository to throw an error
       const repoError = new Error("Repo failed");
       mockRepository.addMessages = vi.fn().mockRejectedValue(repoError);
       const messages = [createMessage(1, threadId, Date.now(), MessageRole.USER, 'Test')];

       // The manager currently doesn't catch errors from the repository addMessages
       await expect(manager.addMessages(threadId, messages)).rejects.toThrow(repoError);
       expect(mockRepository.addMessages).toHaveBeenCalledWith(threadId, messages);
    });


    it('should not call repository if messages array is empty', async () => {
      await manager.addMessages(threadId, []);
      expect(mockRepository.addMessages).not.toHaveBeenCalled();
    });

     it('should not call repository if messages array is null or undefined', async () => {
      await manager.addMessages(threadId, null as any);
      expect(mockRepository.addMessages).not.toHaveBeenCalled();
       await manager.addMessages(threadId, undefined as any);
       expect(mockRepository.addMessages).not.toHaveBeenCalled();
    });

    it('should reject if threadId is empty', async () => {
      const messages = [createMessage(1, '', Date.now(), MessageRole.USER, 'Test')];
      await expect(manager.addMessages('', messages)).rejects.toThrow('threadId cannot be empty');
      expect(mockRepository.addMessages).not.toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('should call repository.getMessages with correct threadId and default options', async () => {
      const expectedMessages = [createMessage(1, threadId, Date.now(), MessageRole.USER, 'Retrieved')];
      mockRepository.getMessages = vi.fn().mockResolvedValue(expectedMessages);

      const retrieved = await manager.getMessages(threadId);

      expect(mockRepository.getMessages).toHaveBeenCalledOnce();
      expect(mockRepository.getMessages).toHaveBeenCalledWith(threadId, undefined); // No options passed
      expect(retrieved).toEqual(expectedMessages);
    });

    it('should call repository.getMessages with correct threadId and provided options', async () => {
      const options: MessageOptions = { limit: 10, beforeTimestamp: Date.now() };
      const expectedMessages = [createMessage(1, threadId, Date.now() - 100, MessageRole.USER, 'Limited')];
      mockRepository.getMessages = vi.fn().mockResolvedValue(expectedMessages);

      const retrieved = await manager.getMessages(threadId, options);

      expect(mockRepository.getMessages).toHaveBeenCalledOnce();
      expect(mockRepository.getMessages).toHaveBeenCalledWith(threadId, options);
      expect(retrieved).toEqual(expectedMessages);
    });

    it('should return the result from the repository', async () => {
      const expectedMessages = [
          createMessage(1, threadId, Date.now(), MessageRole.USER, 'Msg A'),
          createMessage(2, threadId, Date.now()+1, MessageRole.AI, 'Msg B')
      ];
      mockRepository.getMessages = vi.fn().mockResolvedValue(expectedMessages);

      const result = await manager.getMessages(threadId);
      expect(result).toBe(expectedMessages); // Check if it returns the exact array from repo
    });

    it('should reject if threadId is empty', async () => {
      await expect(manager.getMessages('')).rejects.toThrow('threadId cannot be empty');
      expect(mockRepository.getMessages).not.toHaveBeenCalled();
    });

     it('should propagate errors from the repository', async () => {
        const repoError = new Error("Repo read failed");
        mockRepository.getMessages = vi.fn().mockRejectedValue(repoError);

        await expect(manager.getMessages(threadId)).rejects.toThrow(repoError);
        expect(mockRepository.getMessages).toHaveBeenCalledWith(threadId, undefined);
    });
  });
});