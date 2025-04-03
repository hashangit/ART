import { describe, it, expect, beforeEach } from 'vitest';
import { ObservationRepository } from './ObservationRepository';
import { InMemoryStorageAdapter } from '../../../adapters/storage/inMemory';
import { Observation, ObservationType, ObservationFilter } from '../../../types';
import { IObservationRepository } from '../../../core/interfaces';

// Helper to create observations
const createObservation = (id: string, threadId: string, timestamp: number, type: ObservationType, title: string, content: any): Observation => ({
  id: id,
  threadId: threadId,
  timestamp: timestamp,
  type: type,
  title: title,
  content: content,
});

describe('ObservationRepository', () => {
  let mockAdapter: InMemoryStorageAdapter;
  let repository: IObservationRepository; // Use interface type
  const threadId1 = 'obs-thread-1';
  const threadId2 = 'obs-thread-2';

  beforeEach(() => {
    mockAdapter = new InMemoryStorageAdapter();
    repository = new ObservationRepository(mockAdapter);
  });

  describe('addObservation', () => {
    it('should add a single observation to the correct collection', async () => {
      const now = Date.now();
      const observation = createObservation('obs-1', threadId1, now, ObservationType.INTENT, 'User Intent', { text: 'find flights' });
      await repository.addObservation(observation);

      // Verify using the adapter directly
      const stored = await mockAdapter.get<Observation>('observations', 'obs-1');
      expect(stored).toBeDefined();
      expect(stored?.id).toBe('obs-1');
      expect(stored?.threadId).toBe(threadId1);
      expect(stored?.type).toBe(ObservationType.INTENT);
      expect(stored?.content).toEqual({ text: 'find flights' });
    });

     it('should reject adding an observation without an id', async () => {
        const observation = {
            // id: 'missing', // ID is missing
            threadId: threadId1,
            timestamp: Date.now(),
            type: ObservationType.ERROR,
            title: 'Error Occurred',
            content: { message: 'Something failed' }
        } as any; // Cast to bypass compile-time check
         await expect(repository.addObservation(observation)).rejects.toThrow(/Observation must have an 'id' property/);
    });

    it('should overwrite an existing observation with the same id', async () => {
      const now = Date.now();
      const obs1 = createObservation('obs-overwrite', threadId1, now, ObservationType.PLAN, 'Initial Plan', { steps: 1 });
      const obs2 = createObservation('obs-overwrite', threadId1, now + 10, ObservationType.PLAN, 'Updated Plan', { steps: 2 }); // Same ID

      await repository.addObservation(obs1);
      await repository.addObservation(obs2); // Should overwrite

      const stored = await mockAdapter.get<Observation>('observations', 'obs-overwrite');
      expect(stored).toBeDefined();
      expect(stored?.title).toBe('Updated Plan');
      expect(stored?.content).toEqual({ steps: 2 });
      expect(stored?.timestamp).toBe(now + 10);
    });
  });

  describe('getObservations', () => {
    const now = Date.now();
    const observationsT1 = [
      createObservation('t1-obs1', threadId1, now - 200, ObservationType.INTENT, 'Intent 1', {}), // Oldest
      createObservation('t1-obs2', threadId1, now - 100, ObservationType.PLAN, 'Plan 1', {}),
      createObservation('t1-obs3', threadId1, now, ObservationType.TOOL_CALL, 'Tool Call 1', {}),       // Newest
    ];
    const observationT2 = createObservation('t2-obs1', threadId2, now - 50, ObservationType.INTENT, 'Intent 2', {});

    beforeEach(async () => {
      // Seed observations using the repository's add method
      for (const obs of observationsT1) {
        await repository.addObservation(obs);
      }
      await repository.addObservation(observationT2);
    });

    it('should retrieve all observations for a specific thread, sorted by timestamp ascending', async () => {
      const retrieved = await repository.getObservations(threadId1);
      expect(retrieved).toHaveLength(3);
      expect(retrieved.map(o => o.id)).toEqual(['t1-obs1', 't1-obs2', 't1-obs3']);
    });

    it('should return empty array for a thread with no observations', async () => {
      const retrieved = await repository.getObservations('nonexistent-thread');
      expect(retrieved).toHaveLength(0);
    });

    it('should filter observations by type', async () => {
      const filter: ObservationFilter = { types: [ObservationType.INTENT] };
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('t1-obs1');
      expect(retrieved[0].type).toBe(ObservationType.INTENT);
    });

    it('should filter observations by multiple types', async () => {
      const filter: ObservationFilter = { types: [ObservationType.PLAN, ObservationType.TOOL_CALL] };
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map(o => o.id)).toEqual(['t1-obs2', 't1-obs3']); // Sorted by timestamp
      expect(retrieved.map(o => o.type)).toEqual(expect.arrayContaining([ObservationType.PLAN, ObservationType.TOOL_CALL]));
    });

     it('should return empty array if filter types match no observations', async () => {
      const filter: ObservationFilter = { types: [ObservationType.ERROR] };
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(0);
    });

     it('should ignore empty type filter array', async () => {
      const filter: ObservationFilter = { types: [] };
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(3); // Should return all
    });

    it('should retrieve observations before a specific timestamp', async () => {
      const filter: ObservationFilter = { beforeTimestamp: now - 50 }; // Before t1-obs2 and t1-obs3
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('t1-obs1');
    });

    it('should retrieve observations after a specific timestamp', async () => {
      const filter: ObservationFilter = { afterTimestamp: now - 150 }; // After t1-obs1
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map(o => o.id)).toEqual(['t1-obs2', 't1-obs3']);
    });

    it('should retrieve observations between two timestamps', async () => {
      const filter: ObservationFilter = {
        afterTimestamp: now - 250, // After t1-obs1
        beforeTimestamp: now - 50,  // Before t1-obs3
      };
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('t1-obs2');
    });

    it('should apply type and timestamp filters together', async () => {
      const filter: ObservationFilter = {
        types: [ObservationType.PLAN, ObservationType.TOOL_CALL], // t1-obs2, t1-obs3
        afterTimestamp: now - 150, // After t1-obs1 (doesn't change selection)
        beforeTimestamp: now,       // Before t1-obs3
      };
      const retrieved = await repository.getObservations(threadId1, filter);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('t1-obs2'); // Only PLAN matches both filters
      expect(retrieved[0].type).toBe(ObservationType.PLAN);
    });
  });
});