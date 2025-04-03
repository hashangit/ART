import { describe, it, expect, beforeEach } from 'vitest';
import { StateRepository } from './StateRepository';
import { InMemoryStorageAdapter } from '../../../adapters/storage/inMemory';
import { ThreadContext, ThreadConfig, AgentState } from '../../../types';
import { IStateRepository } from '../../../core/interfaces';

// Helper to create default config/state
const createDefaultConfig = (provider = 'test-provider', model = 'test-model'): ThreadConfig => ({
  reasoning: { provider, model },
  enabledTools: ['tool1', 'tool2'],
  historyLimit: 10,
  systemPrompt: 'Test system prompt',
});

const createDefaultState = (prefs: Record<string, any> = { theme: 'dark' }): AgentState => ({
  userPreferences: prefs,
  lastInteraction: Date.now(),
});

describe('StateRepository', () => {
  let mockAdapter: InMemoryStorageAdapter;
  let repository: IStateRepository;
  const threadId1 = 'state-thread-1';
  // const threadId2 = 'state-thread-2'; // Removed unused variable
  const collectionName = 'state'; // Match the repository's internal collection name

  beforeEach(() => {
    mockAdapter = new InMemoryStorageAdapter();
    repository = new StateRepository(mockAdapter);
  });

  describe('setThreadContext / getThreadContext', () => {
    it('should set and get a full thread context', async () => {
      const config = createDefaultConfig();
      const state = createDefaultState();
      const context: ThreadContext = { config, state };

      await repository.setThreadContext(threadId1, context);

      const retrieved = await repository.getThreadContext(threadId1);
      expect(retrieved).toEqual(context);
      expect(retrieved).not.toHaveProperty('id'); // Ensure internal 'id' is removed
    });

    it('should set and get a context with null state', async () => {
      const config = createDefaultConfig();
      const context: ThreadContext = { config, state: null };

      await repository.setThreadContext(threadId1, context);

      const retrieved = await repository.getThreadContext(threadId1);
      expect(retrieved).toEqual(context);
      expect(retrieved?.state).toBeNull();
    });

    it('should overwrite existing context on setThreadContext', async () => {
      const initialContext: ThreadContext = { config: createDefaultConfig('p1', 'm1'), state: createDefaultState({ pref: 'a' }) };
      const updatedContext: ThreadContext = { config: createDefaultConfig('p2', 'm2'), state: createDefaultState({ pref: 'b' }) };

      await repository.setThreadContext(threadId1, initialContext);
      await repository.setThreadContext(threadId1, updatedContext);

      const retrieved = await repository.getThreadContext(threadId1);
      expect(retrieved).toEqual(updatedContext);
    });

    it('should return null when getting context for a non-existent thread', async () => {
      const retrieved = await repository.getThreadContext('nonexistent-thread');
      expect(retrieved).toBeNull();
    });

     it('should reject setting context if config is missing', async () => {
        const invalidContext = { state: createDefaultState() } as any; // Missing config
        await expect(repository.setThreadContext(threadId1, invalidContext))
            .rejects.toThrow(/must contain a 'config' property/);
    });

     it('should store the context under the threadId key in the adapter', async () => {
        const config = createDefaultConfig();
        const state = createDefaultState();
        const context: ThreadContext = { config, state };
        await repository.setThreadContext(threadId1, context);

        // Verify using adapter directly
        const storedRaw = await mockAdapter.get<ThreadContext & { id: string }>(collectionName, threadId1);
        expect(storedRaw).toBeDefined();
        expect(storedRaw?.id).toBe(threadId1);
        expect(storedRaw?.config).toEqual(config);
        expect(storedRaw?.state).toEqual(state);
     });
  });

  describe('setThreadConfig / getThreadConfig', () => {
    it('should set and get thread config when no context exists', async () => {
      const config = createDefaultConfig();
      await repository.setThreadConfig(threadId1, config);

      const retrievedConfig = await repository.getThreadConfig(threadId1);
      expect(retrievedConfig).toEqual(config);

      // Verify underlying context has null state
      const retrievedContext = await repository.getThreadContext(threadId1);
      expect(retrievedContext?.config).toEqual(config);
      expect(retrievedContext?.state).toBeNull();
    });

    it('should update config and preserve existing state', async () => {
      const initialConfig = createDefaultConfig('p1', 'm1');
      const initialState = createDefaultState({ pref: 'a' });
      const initialContext: ThreadContext = { config: initialConfig, state: initialState };
      await repository.setThreadContext(threadId1, initialContext);

      const updatedConfig = createDefaultConfig('p2', 'm2');
      await repository.setThreadConfig(threadId1, updatedConfig);

      const retrievedConfig = await repository.getThreadConfig(threadId1);
      expect(retrievedConfig).toEqual(updatedConfig);

      // Verify state was preserved
      const retrievedContext = await repository.getThreadContext(threadId1);
      expect(retrievedContext?.config).toEqual(updatedConfig);
      expect(retrievedContext?.state).toEqual(initialState);
    });

    it('should return null when getting config for a non-existent thread', async () => {
      const retrieved = await repository.getThreadConfig('nonexistent-thread');
      expect(retrieved).toBeNull();
    });
  });

  describe('setAgentState / getAgentState', () => {
    it('should reject setting state if no config exists for the thread', async () => {
      const state = createDefaultState();
      await expect(repository.setAgentState(threadId1, state))
        .rejects.toThrow(/Cannot set AgentState.*because no ThreadConfig exists/);
    });

    it('should set and get agent state when config exists', async () => {
      // First, set up config
      const config = createDefaultConfig();
      await repository.setThreadConfig(threadId1, config);

      // Now set state
      const state = createDefaultState({ pref: 'xyz' });
      await repository.setAgentState(threadId1, state);

      const retrievedState = await repository.getAgentState(threadId1);
      expect(retrievedState).toEqual(state);

      // Verify context integrity
      const retrievedContext = await repository.getThreadContext(threadId1);
      expect(retrievedContext?.config).toEqual(config);
      expect(retrievedContext?.state).toEqual(state);
    });

    it('should update existing state and preserve config', async () => {
      const initialConfig = createDefaultConfig();
      const initialState = createDefaultState({ pref: 'a' });
      await repository.setThreadContext(threadId1, { config: initialConfig, state: initialState });

      const updatedState = createDefaultState({ pref: 'b', other: true });
      await repository.setAgentState(threadId1, updatedState);

      const retrievedState = await repository.getAgentState(threadId1);
      expect(retrievedState).toEqual(updatedState);

      // Verify config was preserved
      const retrievedContext = await repository.getThreadContext(threadId1);
      expect(retrievedContext?.config).toEqual(initialConfig);
      expect(retrievedContext?.state).toEqual(updatedState);
    });

     it('should allow setting state to null', async () => {
        const config = createDefaultConfig();
        const initialState = createDefaultState();
        await repository.setThreadContext(threadId1, { config, state: initialState });

        await repository.setAgentState(threadId1, null as any); // Set state to null

        const retrievedState = await repository.getAgentState(threadId1);
        expect(retrievedState).toBeNull();

        const retrievedContext = await repository.getThreadContext(threadId1);
        expect(retrievedContext?.config).toEqual(config);
        expect(retrievedContext?.state).toBeNull();
     });


    it('should return null when getting state for a thread with config but null state', async () => {
      const config = createDefaultConfig();
      await repository.setThreadConfig(threadId1, config); // Context has null state initially

      const retrieved = await repository.getAgentState(threadId1);
      expect(retrieved).toBeNull();
    });

    it('should return null when getting state for a non-existent thread', async () => {
      const retrieved = await repository.getAgentState('nonexistent-thread');
      expect(retrieved).toBeNull();
    });
  });
});