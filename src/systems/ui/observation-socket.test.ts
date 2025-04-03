// src/systems/ui/observation-socket.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObservationSocket } from './observation-socket';
import { IObservationRepository } from '../../core/interfaces';
import { Observation, ObservationType } from '../../types';
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
const mockObservationRepository: IObservationRepository = {
    addObservation: vi.fn(),
    getObservations: vi.fn(),
};

const mockObservation: Observation = {
    id: 'obs-1',
    threadId: 'thread-1',
    timestamp: Date.now(),
    type: ObservationType.PLAN,
    title: 'Plan Recorded',
    content: { steps: ['step 1', 'step 2'] },
};

describe('ObservationSocket', () => {
    let socket: ObservationSocket;

    beforeEach(() => {
        vi.clearAllMocks(); // Clear mocks before each test
        // Instantiate with the mock repository
        socket = new ObservationSocket(mockObservationRepository);
    });

    it('should initialize correctly', () => {
        expect(socket).toBeInstanceOf(ObservationSocket);
        expect(Logger.debug).toHaveBeenCalledWith('ObservationSocket initialized.');
    });

    it('should notify subscribers on notifyObservation', () => {
        const callback = vi.fn();
        socket.subscribe(callback);
        socket.notifyObservation(mockObservation);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(mockObservation);
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining(`Notifying Observation: ${mockObservation.id}`));
    });

    it('should filter notifications by ObservationType (single)', () => {
        const callbackPlan = vi.fn();
        const callbackTool = vi.fn();
        socket.subscribe(callbackPlan, ObservationType.PLAN);
        socket.subscribe(callbackTool, ObservationType.TOOL_CALL);

        const planObservation: Observation = { ...mockObservation, type: ObservationType.PLAN };
        socket.notifyObservation(planObservation);

        expect(callbackPlan).toHaveBeenCalledTimes(1);
        expect(callbackPlan).toHaveBeenCalledWith(planObservation);
        expect(callbackTool).not.toHaveBeenCalled();
    });

     it('should filter notifications by ObservationType (array)', () => {
        const callbackPlanOrTool = vi.fn();
        const callbackError = vi.fn();
        socket.subscribe(callbackPlanOrTool, [ObservationType.PLAN, ObservationType.TOOL_CALL]);
        socket.subscribe(callbackError, ObservationType.ERROR);

        const planObservation: Observation = { ...mockObservation, type: ObservationType.PLAN };
        socket.notifyObservation(planObservation);

        expect(callbackPlanOrTool).toHaveBeenCalledTimes(1);
        expect(callbackPlanOrTool).toHaveBeenCalledWith(planObservation);
        expect(callbackError).not.toHaveBeenCalled();

        vi.clearAllMocks();

        const toolObservation: Observation = { ...mockObservation, id: 'obs-2', type: ObservationType.TOOL_CALL };
        socket.notifyObservation(toolObservation);

        expect(callbackPlanOrTool).toHaveBeenCalledTimes(1);
        expect(callbackPlanOrTool).toHaveBeenCalledWith(toolObservation);
        expect(callbackError).not.toHaveBeenCalled();
    });

    it('should filter notifications by threadId', () => {
        const callbackT1 = vi.fn();
        const callbackT2 = vi.fn();
        socket.subscribe(callbackT1, undefined, { threadId: 'thread-1' });
        socket.subscribe(callbackT2, undefined, { threadId: 'thread-2' });

        const observationT1: Observation = { ...mockObservation, threadId: 'thread-1' };
        socket.notifyObservation(observationT1);

        expect(callbackT1).toHaveBeenCalledTimes(1);
        expect(callbackT1).toHaveBeenCalledWith(observationT1);
        expect(callbackT2).not.toHaveBeenCalled();
    });

    it('should call repository getObservations on getHistory', async () => {
        const threadId = 'thread-hist-1';
        const filter = ObservationType.INTENT;
        const options = { threadId, limit: 10 };
        const mockHistory: Observation[] = [{ ...mockObservation, threadId, type: filter }];
        vi.mocked(mockObservationRepository.getObservations).mockResolvedValue(mockHistory);

        const history = await socket.getHistory(filter, options);

        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining(`Getting history for ObservationSocket: Thread ${threadId}`));
        expect(mockObservationRepository.getObservations).toHaveBeenCalledTimes(1);
        expect(mockObservationRepository.getObservations).toHaveBeenCalledWith(threadId, { types: [filter], limit: options.limit });
        expect(history).toEqual(mockHistory);
    });

     it('should call repository getObservations on getHistory with type array filter', async () => {
        const threadId = 'thread-hist-2';
        const filter = [ObservationType.INTENT, ObservationType.ERROR];
        const options = { threadId, limit: 5 };
        const mockHistory: Observation[] = [{ ...mockObservation, threadId, type: ObservationType.INTENT }];
        vi.mocked(mockObservationRepository.getObservations).mockResolvedValue(mockHistory);

        const history = await socket.getHistory(filter, options);

        expect(mockObservationRepository.getObservations).toHaveBeenCalledTimes(1);
        expect(mockObservationRepository.getObservations).toHaveBeenCalledWith(threadId, { types: filter, limit: options.limit });
        expect(history).toEqual(mockHistory);
    });

    it('getHistory should require threadId', async () => {
        const history = await socket.getHistory(ObservationType.PLAN, { limit: 10 }); // No threadId
        expect(history).toEqual([]);
        expect(mockObservationRepository.getObservations).not.toHaveBeenCalled();
        expect(Logger.warn).toHaveBeenCalledWith('Cannot getHistory for ObservationSocket: threadId is required.');
    });

    it('getHistory should handle repository errors', async () => {
        const threadId = 'thread-err-1';
        const error = new Error('DB failed');
        vi.mocked(mockObservationRepository.getObservations).mockRejectedValue(error);

        const history = await socket.getHistory(undefined, { threadId });

        expect(history).toEqual([]);
        expect(mockObservationRepository.getObservations).toHaveBeenCalledTimes(1);
        expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining(`Error fetching observation history for thread ${threadId}`), error);
    });

    it('getHistory should work without a repository configured (warn and return empty)', async () => {
        const socketWithoutRepo = new ObservationSocket(); // No repo provided
        const history = await socketWithoutRepo.getHistory(undefined, { threadId: 'thread-no-repo' });

        expect(history).toEqual([]);
        expect(Logger.warn).toHaveBeenCalledWith('Cannot getHistory for ObservationSocket: ObservationRepository not configured.');
    });
});