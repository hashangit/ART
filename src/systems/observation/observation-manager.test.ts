// src/systems/observation/observation-manager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObservationManager } from './observation-manager';
import { IObservationRepository, ObservationSocket } from '../../core/interfaces';
import { Observation, ObservationFilter } from '../../types';
import { generateUUID } from '../../utils/uuid';

// Mock dependencies
vi.mock('../../utils/uuid');

const mockObservationRepository: IObservationRepository = {
    addObservation: vi.fn(),
    getObservations: vi.fn(),
    // Mock other methods if the interface requires them
};

const mockObservationSocket: ObservationSocket = {
    subscribe: vi.fn(),
    notify: vi.fn(),
    getHistory: vi.fn(),
};

describe('ObservationManager', () => {
    let observationManager: ObservationManager;
    const mockThreadId = 'thread-123';
    const mockTraceId = 'trace-abc';
    const mockObservationData: Omit<Observation, 'id' | 'timestamp' | 'title'> = {
        threadId: mockThreadId,
        traceId: mockTraceId,
        type: 'INTENT' as any, // Cast as any if ObservationType enum isn't imported/used
        content: { text: 'User intent' },
        metadata: { source: 'test' },
    };
    const mockGeneratedUUID = 'mock-uuid-456';
    const mockTimestamp = 1678886400000; // Example timestamp

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock generateUUID before creating the manager instance
        vi.mocked(generateUUID).mockReturnValue(mockGeneratedUUID);
        // Mock Date.now()
        vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

        observationManager = new ObservationManager(mockObservationRepository, mockObservationSocket);
    });

    describe('record', () => {
        it('should generate id and timestamp, create title, save observation via repository, and notify via socket', async () => {
            const expectedObservation: Observation = {
                ...mockObservationData,
                id: mockGeneratedUUID,
                timestamp: mockTimestamp,
                title: `${mockObservationData.type} Recorded`,
            };

            await observationManager.record(mockObservationData);

            // Check repository call
            expect(mockObservationRepository.addObservation).toHaveBeenCalledTimes(1);
            expect(mockObservationRepository.addObservation).toHaveBeenCalledWith(expectedObservation);

            // Check socket notification
            expect(mockObservationSocket.notify).toHaveBeenCalledTimes(1);
            expect(mockObservationSocket.notify).toHaveBeenCalledWith(expectedObservation, { targetThreadId: mockThreadId });
        });

        it('should rethrow error if repository fails', async () => {
            const repoError = new Error('Repository failed');
            vi.mocked(mockObservationRepository.addObservation).mockRejectedValueOnce(repoError);

            await expect(observationManager.record(mockObservationData)).rejects.toThrow(repoError);

            // Ensure socket notify was not called
            expect(mockObservationSocket.notify).not.toHaveBeenCalled();
        });

        it('should rethrow error if socket notification fails (after successful save)', async () => {
            const socketError = new Error('Socket failed');
            vi.mocked(mockObservationSocket.notify).mockImplementationOnce(() => { throw socketError; });

            // Note: Depending on desired behavior, you might want the record to succeed even if notification fails.
            // Here we assume notification failure should also cause the record operation to throw.
            await expect(observationManager.record(mockObservationData)).rejects.toThrow(socketError);

            // Ensure repository save was still called
            expect(mockObservationRepository.addObservation).toHaveBeenCalledTimes(1);
        });
    });

    describe('getObservations', () => {
        it('should call repository getObservations with threadId and filter', async () => {
            const filter: ObservationFilter = { types: ['PLAN' as any] };
            const mockObservations: Observation[] = [
                { id: 'obs-1', threadId: mockThreadId, type: 'PLAN' as any, title: 'Plan 1', content: {}, timestamp: Date.now() },
            ];
            vi.mocked(mockObservationRepository.getObservations).mockResolvedValueOnce(mockObservations);

            const result = await observationManager.getObservations(mockThreadId, filter);

            expect(mockObservationRepository.getObservations).toHaveBeenCalledTimes(1);
            expect(mockObservationRepository.getObservations).toHaveBeenCalledWith(mockThreadId, filter);
            expect(result).toEqual(mockObservations);
        });

        it('should call repository getObservations with threadId only if no filter provided', async () => {
            const mockObservations: Observation[] = [];
            vi.mocked(mockObservationRepository.getObservations).mockResolvedValueOnce(mockObservations);

            const result = await observationManager.getObservations(mockThreadId);

            expect(mockObservationRepository.getObservations).toHaveBeenCalledTimes(1);
            expect(mockObservationRepository.getObservations).toHaveBeenCalledWith(mockThreadId, undefined);
            expect(result).toEqual(mockObservations);
        });

        it('should rethrow error if repository fails', async () => {
            const repoError = new Error('Repository failed');
            vi.mocked(mockObservationRepository.getObservations).mockRejectedValueOnce(repoError);
            const filter: ObservationFilter = { types: ['PLAN' as any] };

            await expect(observationManager.getObservations(mockThreadId, filter)).rejects.toThrow(repoError);
        });
    });
});