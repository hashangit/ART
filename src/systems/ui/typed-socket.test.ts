// src/systems/ui/typed-socket.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TypedSocket } from './typed-socket';
import { Logger } from '../../utils/logger';

// Mock Logger to prevent console output during tests and verify calls
vi.mock('../../utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        configure: vi.fn(), // Ensure all static methods used are mocked
    }
}));

describe('TypedSocket', () => {
    it('should subscribe a callback and return an unsubscribe function', () => {
        const socket = new TypedSocket<string>();
        const callback = vi.fn();
        const unsubscribe = socket.subscribe(callback);

        expect(typeof unsubscribe).toBe('function');
        // @ts-expect-error - Accessing protected member for test verification
        expect(socket.subscriptions.size).toBe(1);
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('New subscription added'));

        unsubscribe();
        // @ts-expect-error - Accessing protected member for test verification
        expect(socket.subscriptions.size).toBe(0);
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Subscription removed'));
    });

    it('should notify a subscribed callback', () => {
        const socket = new TypedSocket<string>();
        const callback = vi.fn();
        socket.subscribe(callback);
        const data = 'test data';

        socket.notify(data);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(data);
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Notifying 1 subscribers'));
    });

    it('should not notify an unsubscribed callback', () => {
        const socket = new TypedSocket<string>();
        const callback = vi.fn();
        const unsubscribe = socket.subscribe(callback);
        const data = 'test data';

        unsubscribe();
        socket.notify(data);

        expect(callback).not.toHaveBeenCalled();
    });

    it('should notify multiple subscribers', () => {
        const socket = new TypedSocket<number>();
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        socket.subscribe(callback1);
        socket.subscribe(callback2);
        const data = 123;

        socket.notify(data);

        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback1).toHaveBeenCalledWith(data);
        expect(callback2).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledWith(data);
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Notifying 2 subscribers'));
    });

    it('should handle errors in callback without affecting other subscribers', () => {
        const socket = new TypedSocket<string>();
        const errorCallback = vi.fn(() => { throw new Error('Callback failed'); });
        const successCallback = vi.fn();

        socket.subscribe(errorCallback);
        socket.subscribe(successCallback);
        const data = 'important data';

        socket.notify(data);

        expect(errorCallback).toHaveBeenCalledTimes(1);
        expect(successCallback).toHaveBeenCalledTimes(1);
        expect(successCallback).toHaveBeenCalledWith(data);
        // Verify error logging
        expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining('Error executing subscription callback'), expect.any(Error));
    });

    it('should clear all subscriptions', () => {
        const socket = new TypedSocket<number>();
        socket.subscribe(vi.fn());
        socket.subscribe(vi.fn());
        // @ts-expect-error - Accessing protected member for test verification
        expect(socket.subscriptions.size).toBe(2);

        socket.clearAllSubscriptions();
        // @ts-expect-error - Accessing protected member for test verification
        expect(socket.subscriptions.size).toBe(0);
        expect(Logger.debug).toHaveBeenCalledWith('All subscriptions cleared.');
    });

    // --- Filtering Tests ---

    it('should notify only subscribers matching the threadId option', () => {
        const socket = new TypedSocket<string>();
        const callbackAll = vi.fn();
        const callbackThread1 = vi.fn();
        const callbackThread2 = vi.fn();

        socket.subscribe(callbackAll); // No thread filter
        socket.subscribe(callbackThread1, undefined, { threadId: 'thread-1' });
        socket.subscribe(callbackThread2, undefined, { threadId: 'thread-2' });

        const data = 'data for thread 1';
        socket.notify(data, { targetThreadId: 'thread-1' });

        expect(callbackAll).toHaveBeenCalledTimes(1); // Called because it has no thread filter
        expect(callbackAll).toHaveBeenCalledWith(data);
        expect(callbackThread1).toHaveBeenCalledTimes(1); // Called because threadId matches
        expect(callbackThread1).toHaveBeenCalledWith(data);
        expect(callbackThread2).not.toHaveBeenCalled(); // Not called because threadId doesn't match
    });

    it('should notify subscribers matching the filter', () => {
        type DataType = { type: 'A' | 'B', value: number };
        const socket = new TypedSocket<DataType, 'A' | 'B'>();
        const callbackAll = vi.fn();
        const callbackA = vi.fn();
        const callbackB = vi.fn();

        const filterCheck = (data: DataType, filter?: 'A' | 'B') => data.type === filter;

        socket.subscribe(callbackAll); // No filter
        socket.subscribe(callbackA, 'A');
        socket.subscribe(callbackB, 'B');

        const dataA: DataType = { type: 'A', value: 1 };
        socket.notify(dataA, undefined, filterCheck);

        expect(callbackAll).toHaveBeenCalledTimes(1); // Called because no filter
        expect(callbackAll).toHaveBeenCalledWith(dataA);
        expect(callbackA).toHaveBeenCalledTimes(1); // Called because filter matches
        expect(callbackA).toHaveBeenCalledWith(dataA);
        expect(callbackB).not.toHaveBeenCalled(); // Not called because filter doesn't match

        vi.clearAllMocks(); // Reset mocks for next notification

        const dataB: DataType = { type: 'B', value: 2 };
        socket.notify(dataB, undefined, filterCheck);

        expect(callbackAll).toHaveBeenCalledTimes(1); // Called because no filter
        expect(callbackAll).toHaveBeenCalledWith(dataB);
        expect(callbackA).not.toHaveBeenCalled(); // Not called because filter doesn't match
        expect(callbackB).toHaveBeenCalledTimes(1); // Called because filter matches
        expect(callbackB).toHaveBeenCalledWith(dataB);
    });

     it('should notify subscribers matching both threadId and filter', () => {
        type DataType = { type: 'A' | 'B', value: number };
        const socket = new TypedSocket<DataType, 'A' | 'B'>();
        const callbackA_T1 = vi.fn();
        const callbackB_T1 = vi.fn();
        const callbackA_T2 = vi.fn();

        const filterCheck = (data: DataType, filter?: 'A' | 'B') => data.type === filter;

        socket.subscribe(callbackA_T1, 'A', { threadId: 'thread-1' });
        socket.subscribe(callbackB_T1, 'B', { threadId: 'thread-1' });
        socket.subscribe(callbackA_T2, 'A', { threadId: 'thread-2' });

        const dataA_T1: DataType = { type: 'A', value: 1 };
        // Notify for thread-1 with type A data
        socket.notify(dataA_T1, { targetThreadId: 'thread-1' }, filterCheck);

        expect(callbackA_T1).toHaveBeenCalledTimes(1); // Matches thread and filter
        expect(callbackA_T1).toHaveBeenCalledWith(dataA_T1);
        expect(callbackB_T1).not.toHaveBeenCalled(); // Matches thread but not filter
        expect(callbackA_T2).not.toHaveBeenCalled(); // Matches filter but not thread
    });

    it('getHistory should warn and return empty array by default', async () => {
        const socket = new TypedSocket<string>();
        // The getHistory method is optional, so accessing it with ?. is valid TS
        const history = await socket.getHistory?.();
        expect(history).toEqual([]);
        expect(Logger.warn).toHaveBeenCalledWith('getHistory is not implemented in the base TypedSocket.');
    });
});