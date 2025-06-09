import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from './StateManager';
import { IStateRepository } from '../../../core/interfaces';
import { ThreadContext, ThreadConfig, AgentState } from '../../../types'; // Need ThreadConfig/AgentState for test data

// Helper to create default config/state for tests
const createTestConfig = (tools: string[] = ['toolA']): ThreadConfig => ({
  reasoning: { provider: 'test', model: 'test-m' },
  enabledTools: tools,
  historyLimit: 5,
  systemPrompt: 'Test prompt',
});

const createTestState = (): AgentState => ({ preference: 'value' });

// Create a mock repository
const createMockRepository = (): IStateRepository => ({
  getThreadContext: vi.fn(),
  setThreadContext: vi.fn().mockResolvedValue(undefined),
  getThreadConfig: vi.fn(), // Not directly used by StateManager, but part of interface
  setThreadConfig: vi.fn().mockResolvedValue(undefined), // Not directly used by StateManager
  getAgentState: vi.fn(), // Not directly used by StateManager
  setAgentState: vi.fn().mockResolvedValue(undefined), // Not directly used by StateManager
});

describe('StateManager', () => {
  let mockRepository: IStateRepository;
  let manager: StateManager;
  const threadId = 'state-mgr-thread-1';

  beforeEach(() => {
    mockRepository = createMockRepository();
    manager = new StateManager(mockRepository);
  });

  describe('loadThreadContext', () => {
    it('should call repository.getThreadContext and return the context', async () => {
      const expectedContext: ThreadContext = { config: createTestConfig(), state: createTestState() };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(expectedContext);

      const context = await manager.loadThreadContext(threadId);

      expect(mockRepository.getThreadContext).toHaveBeenCalledOnce();
      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);
      expect(context).toEqual(expectedContext);
    });

    it('should throw an error if repository returns null', async () => {
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(null);

      await expect(manager.loadThreadContext(threadId))
        .rejects.toThrow(`Thread context not found for threadId '${threadId}'`);
      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);
    });

    it('should throw an error if repository throws an error', async () => {
      const repoError = new Error('Repo DB connection failed');
      mockRepository.getThreadContext = vi.fn().mockRejectedValue(repoError);

      await expect(manager.loadThreadContext(threadId)).rejects.toThrow(repoError);
      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);
    });

    it('should throw an error if threadId is empty', async () => {
      await expect(manager.loadThreadContext('')).rejects.toThrow('threadId cannot be empty');
      expect(mockRepository.getThreadContext).not.toHaveBeenCalled();
    });
  });

  describe('isToolEnabled', () => {
    it('should return true if tool is in enabledTools list', async () => {
      const config = createTestConfig(['toolA', 'toolB']);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.isToolEnabled(threadId, 'toolA');
      expect(result).toBe(true);
      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);
    });

    it('should return false if tool is not in enabledTools list', async () => {
      const config = createTestConfig(['toolA', 'toolB']);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.isToolEnabled(threadId, 'toolC');
      expect(result).toBe(false);
    });

    it('should return false if enabledTools array is empty', async () => {
      const config = createTestConfig([]);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.isToolEnabled(threadId, 'toolA');
      expect(result).toBe(false);
    });

    it('should return false if enabledTools property is missing', async () => {
      const config = { reasoning: { provider: 'p', model: 'm' }, historyLimit: 1 } as ThreadConfig; // Missing enabledTools
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.isToolEnabled(threadId, 'toolA');
      expect(result).toBe(false);
    });

    it('should return false if config is missing', async () => {
      const context: ThreadContext = { config: null as any, state: null }; // Config is null
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.isToolEnabled(threadId, 'toolA');
      expect(result).toBe(false);
    });

    it('should return false and warn if context loading fails', async () => {
       const consoleWarnSpy = vi.spyOn(console, 'warn');
       const repoError = new Error('Context load failed');
       mockRepository.getThreadContext = vi.fn().mockRejectedValue(repoError);

       const result = await manager.isToolEnabled(threadId, 'toolA');

       expect(result).toBe(false);
       expect(consoleWarnSpy).toHaveBeenCalledWith(
           expect.stringContaining(`Could not check if tool 'toolA' is enabled for thread '${threadId}' because context failed to load: ${repoError}`)
       );
       consoleWarnSpy.mockRestore();
    });
  });

  describe('getThreadConfigValue', () => {
    const config = createTestConfig(['toolA']);
    const context: ThreadContext = { config, state: null };

    beforeEach(() => {
        mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);
    });

    it('should return the value for an existing top-level key', async () => {
      const historyLimit = await manager.getThreadConfigValue<number>(threadId, 'historyLimit');
      expect(historyLimit).toBe(config.historyLimit); // Should be 5
      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);

      const systemPrompt = await manager.getThreadConfigValue<string>(threadId, 'systemPrompt');
      expect(systemPrompt).toBe(config.systemPrompt);
    });

     it('should return the array value for enabledTools key', async () => {
        const enabledTools = await manager.getThreadConfigValue<string[]>(threadId, 'enabledTools');
        expect(enabledTools).toEqual(config.enabledTools);
     });

      it('should return the object value for reasoning key', async () => {
        const reasoning = await manager.getThreadConfigValue<object>(threadId, 'reasoning');
        expect(reasoning).toEqual(config.reasoning);
     });


    it('should return undefined for a non-existent key', async () => {
      const nonExistent = await manager.getThreadConfigValue<any>(threadId, 'nonExistentKey');
      expect(nonExistent).toBeUndefined();
    });

    it('should return undefined if config object is null or missing', async () => {
       const contextNoConfig: ThreadContext = { config: null as any, state: null };
       mockRepository.getThreadContext = vi.fn().mockResolvedValue(contextNoConfig);
       const value = await manager.getThreadConfigValue<number>(threadId, 'historyLimit');
       expect(value).toBeUndefined();
    });

    it('should throw error if context loading fails', async () => {
        const repoError = new Error('Context load failed');
        mockRepository.getThreadContext = vi.fn().mockRejectedValue(repoError);
        await expect(manager.getThreadConfigValue(threadId, 'historyLimit')).rejects.toThrow(repoError);
    });

     // Note: The current implementation doesn't support deep keys like 'reasoning.provider'
     it('should return undefined for deep keys (not supported)', async () => {
        const deepValue = await manager.getThreadConfigValue<string>(threadId, 'reasoning.provider' as any);
        expect(deepValue).toBeUndefined(); // 'reasoning.provider' is not a direct key of ThreadConfig
     });
  });

  describe('saveStateIfModified', () => {
    it('should resolve and log a warning for explicit strategy (no-op)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      await expect(manager.saveStateIfModified(threadId)).resolves.toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`saveStateIfModified called for thread ${threadId}. AgentState must be saved explicitly`)
      );
      expect(mockRepository.setAgentState).not.toHaveBeenCalled(); // Ensure repo wasn't called
      consoleWarnSpy.mockRestore();
    });

     it('should reject if threadId is empty', async () => {
        await expect(manager.saveStateIfModified('')).rejects.toThrow('threadId cannot be empty');
    });
  });

  describe('enableToolsForThread', () => {
    it('should enable new tools by adding them to enabledTools', async () => {
      const config = createTestConfig(['existingTool']);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await manager.enableToolsForThread(threadId, ['newTool1', 'newTool2']);

      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);
      expect(mockRepository.setThreadConfig).toHaveBeenCalledWith(threadId, {
        ...config,
        enabledTools: ['existingTool', 'newTool1', 'newTool2']
      });
    });

    it('should handle duplicate tools without adding them twice', async () => {
      const config = createTestConfig(['tool1', 'tool2']);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await manager.enableToolsForThread(threadId, ['tool2', 'tool3']);

      expect(mockRepository.setThreadConfig).toHaveBeenCalledWith(threadId, {
        ...config,
        enabledTools: ['tool1', 'tool2', 'tool3']
      });
    });

    it('should handle empty enabledTools array', async () => {
      const config = createTestConfig([]);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await manager.enableToolsForThread(threadId, ['newTool']);

      expect(mockRepository.setThreadConfig).toHaveBeenCalledWith(threadId, {
        ...config,
        enabledTools: ['newTool']
      });
    });

    it('should throw error if threadId is empty', async () => {
      await expect(manager.enableToolsForThread('', ['tool']))
        .rejects.toThrow('threadId cannot be empty for enableToolsForThread');
    });

    it('should throw error if toolNames is empty', async () => {
      await expect(manager.enableToolsForThread(threadId, []))
        .rejects.toThrow('toolNames cannot be empty for enableToolsForThread');
    });

    it('should throw error if no ThreadConfig exists', async () => {
      const context: ThreadContext = { config: null as any, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await expect(manager.enableToolsForThread(threadId, ['tool']))
        .rejects.toThrow(`No ThreadConfig found for threadId '${threadId}'`);
    });
  });

  describe('disableToolsForThread', () => {
    it('should disable tools by removing them from enabledTools', async () => {
      const config = createTestConfig(['tool1', 'tool2', 'tool3']);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await manager.disableToolsForThread(threadId, ['tool1', 'tool3']);

      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);
      expect(mockRepository.setThreadConfig).toHaveBeenCalledWith(threadId, {
        ...config,
        enabledTools: ['tool2']
      });
    });

    it('should handle non-existent tools gracefully', async () => {
      const config = createTestConfig(['tool1', 'tool2']);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await manager.disableToolsForThread(threadId, ['nonexistent', 'tool1']);

      expect(mockRepository.setThreadConfig).toHaveBeenCalledWith(threadId, {
        ...config,
        enabledTools: ['tool2']
      });
    });

    it('should handle empty enabledTools array', async () => {
      const config = createTestConfig([]);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await manager.disableToolsForThread(threadId, ['tool']);

      expect(mockRepository.setThreadConfig).toHaveBeenCalledWith(threadId, {
        ...config,
        enabledTools: []
      });
    });

    it('should throw error if threadId is empty', async () => {
      await expect(manager.disableToolsForThread('', ['tool']))
        .rejects.toThrow('threadId cannot be empty for disableToolsForThread');
    });

    it('should throw error if toolNames is empty', async () => {
      await expect(manager.disableToolsForThread(threadId, []))
        .rejects.toThrow('toolNames cannot be empty for disableToolsForThread');
    });

    it('should throw error if no ThreadConfig exists', async () => {
      const context: ThreadContext = { config: null as any, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      await expect(manager.disableToolsForThread(threadId, ['tool']))
        .rejects.toThrow(`No ThreadConfig found for threadId '${threadId}'`);
    });
  });

  describe('getEnabledToolsForThread', () => {
    it('should return the enabledTools array from thread config', async () => {
      const config = createTestConfig(['tool1', 'tool2', 'tool3']);
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.getEnabledToolsForThread(threadId);

      expect(result).toEqual(['tool1', 'tool2', 'tool3']);
      expect(mockRepository.getThreadContext).toHaveBeenCalledWith(threadId);
    });

    it('should return empty array if enabledTools is undefined', async () => {
      const config = { reasoning: { provider: 'p', model: 'm' }, historyLimit: 1 } as ThreadConfig;
      const context: ThreadContext = { config, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.getEnabledToolsForThread(threadId);

      expect(result).toEqual([]);
    });

    it('should return empty array if config is null', async () => {
      const context: ThreadContext = { config: null as any, state: null };
      mockRepository.getThreadContext = vi.fn().mockResolvedValue(context);

      const result = await manager.getEnabledToolsForThread(threadId);

      expect(result).toEqual([]);
    });

    it('should throw error if threadId is empty', async () => {
      await expect(manager.getEnabledToolsForThread(''))
        .rejects.toThrow('threadId cannot be empty for getEnabledToolsForThread');
    });

    it('should throw error if context loading fails', async () => {
      const repoError = new Error('Context load failed');
      mockRepository.getThreadContext = vi.fn().mockRejectedValue(repoError);

      await expect(manager.getEnabledToolsForThread(threadId)).rejects.toThrow(repoError);
    });
  });
});