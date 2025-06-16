import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { A2ATaskSocket, A2ATaskEvent, A2ATaskFilter } from './a2a-task-socket';
import { A2ATask, A2ATaskStatus, A2ATaskPriority } from '../../types';
import { IA2ATaskRepository } from '../../core/interfaces';
import { Logger } from '../../utils/logger';

// Mock the Logger
vi.mock('../../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('A2ATaskSocket', () => {
  let socket: A2ATaskSocket;
  let mockRepository: vi.Mocked<IA2ATaskRepository>;
  let mockCallback: vi.Mock;

  // Sample A2A task for testing
  const sampleTask: A2ATask = {
    taskId: 'task-123',
    status: A2ATaskStatus.PENDING,
    payload: {
      taskType: 'analyze',
      input: { data: 'test data' },
      instructions: 'Test instructions',
      parameters: { param1: 'value1' }
    },
    sourceAgent: {
      agentId: 'source-agent-1',
      agentName: 'Source Agent',
      endpoint: 'http://localhost:3000'
    },
    priority: A2ATaskPriority.MEDIUM,
    metadata: {
      createdAt: 1000,
      updatedAt: 1000,
      correlationId: 'thread-123',
      initiatedBy: 'test-user',
      retryCount: 0,
      maxRetries: 3,
      timeoutMs: 30000,
      tags: ['test']
    }
  };

  const sampleTaskWithTarget: A2ATask = {
    ...sampleTask,
    taskId: 'task-456',
    status: A2ATaskStatus.IN_PROGRESS,
    targetAgent: {
      agentId: 'target-agent-1',
      agentName: 'Target Agent',
      endpoint: 'http://localhost:4000'
    },
    metadata: {
      ...sampleTask.metadata,
      updatedAt: 2000,
      startedAt: 1500,
      delegatedAt: 1200
    }
  };

  beforeEach(() => {
    mockRepository = {
      createTask: vi.fn(),
      getTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      getTasksByThread: vi.fn(),
      getTasksByAgent: vi.fn(),
      getTasksByStatus: vi.fn()
    };

    mockCallback = vi.fn();
    socket = new A2ATaskSocket(mockRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize without repository', () => {
      const socketWithoutRepo = new A2ATaskSocket();
      expect(socketWithoutRepo).toBeInstanceOf(A2ATaskSocket);
      expect(Logger.debug).toHaveBeenCalledWith('A2ATaskSocket initialized.');
    });

    it('should initialize with repository', () => {
      expect(socket).toBeInstanceOf(A2ATaskSocket);
      expect(Logger.debug).toHaveBeenCalledWith('A2ATaskSocket initialized.');
    });
  });

  describe('subscription and notification', () => {
    it('should allow subscription and receive notifications', () => {
      const unsubscribe = socket.subscribe(mockCallback);

      const event: A2ATaskEvent = {
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      };

      socket.notifyTaskEvent(event);

      expect(mockCallback).toHaveBeenCalledWith(event);
      expect(Logger.debug).toHaveBeenCalledWith(
        `Notifying A2A Task Event: ${event.task.taskId} (${event.eventType}) status: ${event.task.status}`
      );

      unsubscribe();
    });

    it('should filter notifications by status', () => {
      const filter: A2ATaskFilter = { status: A2ATaskStatus.COMPLETED };
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should not receive notification (task is PENDING, filter is COMPLETED)
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();

      // Should receive notification (task is COMPLETED, matches filter)
      const completedTask = { ...sampleTask, status: A2ATaskStatus.COMPLETED };
      socket.notifyTaskEvent({
        task: completedTask,
        eventType: 'completed',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: expect.objectContaining({ status: A2ATaskStatus.COMPLETED })
        })
      );

      unsubscribe();
    });

    it('should filter notifications by multiple statuses', () => {
      const filter: A2ATaskFilter = { 
        status: [A2ATaskStatus.PENDING, A2ATaskStatus.IN_PROGRESS] 
      };
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should receive notification (task is PENDING, in filter array)
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Should receive notification (task is IN_PROGRESS, in filter array)
      const inProgressTask = { ...sampleTask, status: A2ATaskStatus.IN_PROGRESS };
      socket.notifyTaskEvent({
        task: inProgressTask,
        eventType: 'updated',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(2);

      // Should not receive notification (task is COMPLETED, not in filter array)
      const completedTask = { ...sampleTask, status: A2ATaskStatus.COMPLETED };
      socket.notifyTaskEvent({
        task: completedTask,
        eventType: 'completed',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('should filter notifications by task type', () => {
      const filter: A2ATaskFilter = { taskType: 'synthesize' };
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should not receive notification (task type is 'analyze', filter is 'synthesize')
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();

      // Should receive notification (task type is 'synthesize', matches filter)
      const synthesizeTask = {
        ...sampleTask,
        payload: { ...sampleTask.payload, taskType: 'synthesize' }
      };
      socket.notifyTaskEvent({
        task: synthesizeTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: expect.objectContaining({
            payload: expect.objectContaining({ taskType: 'synthesize' })
          })
        })
      );

      unsubscribe();
    });

    it('should filter notifications by source agent ID', () => {
      const filter: A2ATaskFilter = { sourceAgentId: 'different-agent' };
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should not receive notification (source agent doesn't match)
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should filter notifications by target agent ID', () => {
      const filter: A2ATaskFilter = { targetAgentId: 'target-agent-1' };
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should not receive notification (no target agent)
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).not.toHaveBeenCalled();

      // Should receive notification (has matching target agent)
      socket.notifyTaskEvent({
        task: sampleTaskWithTarget,
        eventType: 'delegated',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: expect.objectContaining({
            targetAgent: expect.objectContaining({ agentId: 'target-agent-1' })
          })
        })
      );

      unsubscribe();
    });

    it('should filter notifications by thread ID (correlationId)', () => {
      const filter: A2ATaskFilter = { threadId: 'thread-123' };
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should receive notification (correlationId matches threadId filter)
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Should not receive notification (different correlationId)
      const differentThreadTask = {
        ...sampleTask,
        metadata: { ...sampleTask.metadata, correlationId: 'thread-456' }
      };
      socket.notifyTaskEvent({
        task: differentThreadTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });

  describe('convenience notification methods', () => {
    beforeEach(() => {
      socket.subscribe(mockCallback);
    });

    it('should notify task created', () => {
      const metadata = { automatic: false, source: 'test' };
      socket.notifyTaskCreated(sampleTask, metadata);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: sampleTask,
          eventType: 'created',
          timestamp: expect.any(Number),
          metadata
        })
      );
    });

    it('should notify task updated with status change', () => {
      const updatedTask = { ...sampleTask, status: A2ATaskStatus.COMPLETED };
      const metadata = { automatic: true, source: 'system' };
      
      socket.notifyTaskUpdated(updatedTask, A2ATaskStatus.PENDING, metadata);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: updatedTask,
          eventType: 'completed',
          timestamp: expect.any(Number),
          previousStatus: A2ATaskStatus.PENDING,
          metadata
        })
      );
    });

    it('should notify task updated with delegation', () => {
      const delegatedTask = { 
        ...sampleTask, 
        status: A2ATaskStatus.IN_PROGRESS,
        targetAgent: sampleTaskWithTarget.targetAgent
      };
      
      socket.notifyTaskUpdated(delegatedTask, A2ATaskStatus.PENDING);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: delegatedTask,
          eventType: 'delegated',
          timestamp: expect.any(Number),
          previousStatus: A2ATaskStatus.PENDING
        })
      );
    });

    it('should notify task updated as failed', () => {
      const failedTask = { ...sampleTask, status: A2ATaskStatus.FAILED };
      
      socket.notifyTaskUpdated(failedTask, A2ATaskStatus.IN_PROGRESS);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: failedTask,
          eventType: 'failed',
          timestamp: expect.any(Number),
          previousStatus: A2ATaskStatus.IN_PROGRESS
        })
      );
    });

    it('should notify task updated as cancelled', () => {
      const cancelledTask = { ...sampleTask, status: A2ATaskStatus.CANCELLED };
      
      socket.notifyTaskUpdated(cancelledTask, A2ATaskStatus.PENDING);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: cancelledTask,
          eventType: 'cancelled',
          timestamp: expect.any(Number),
          previousStatus: A2ATaskStatus.PENDING
        })
      );
    });

    it('should notify task delegated', () => {
      socket.notifyTaskDelegated(sampleTaskWithTarget);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: sampleTaskWithTarget,
          eventType: 'delegated',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should notify task completed', () => {
      const completedTask = { ...sampleTask, status: A2ATaskStatus.COMPLETED };
      socket.notifyTaskCompleted(completedTask);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: completedTask,
          eventType: 'completed',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should notify task failed', () => {
      const failedTask = { ...sampleTask, status: A2ATaskStatus.FAILED };
      socket.notifyTaskFailed(failedTask);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          task: failedTask,
          eventType: 'failed',
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('getHistory', () => {
    it('should return empty array when no repository configured', async () => {
      const socketWithoutRepo = new A2ATaskSocket();
      const result = await socketWithoutRepo.getHistory();

      expect(result).toEqual([]);
      expect(Logger.warn).toHaveBeenCalledWith(
        'Cannot getHistory for A2ATaskSocket: IA2ATaskRepository not configured.'
      );
    });

    it('should fetch tasks by thread ID', async () => {
      const tasks = [sampleTask, sampleTaskWithTarget];
      mockRepository.getTasksByThread.mockResolvedValue(tasks);

      const result = await socket.getHistory(undefined, { threadId: 'thread-123' });

      expect(mockRepository.getTasksByThread).toHaveBeenCalledWith('thread-123');
      expect(result).toHaveLength(2);
      expect(result[0].task).toEqual(sampleTaskWithTarget); // Should be first (newer timestamp)
      expect(result[1].task).toEqual(sampleTask);
    });

    it('should fetch tasks by status', async () => {
      const tasks = [sampleTask];
      mockRepository.getTasksByStatus.mockResolvedValue(tasks);

      const filter: A2ATaskFilter = { status: A2ATaskStatus.PENDING };
      const result = await socket.getHistory(filter, { limit: 10 });

      expect(mockRepository.getTasksByStatus).toHaveBeenCalledWith(
        A2ATaskStatus.PENDING,
        { limit: 10 }
      );
      expect(result).toHaveLength(1);
      expect(result[0].task).toEqual(sampleTask);
    });

    it('should fetch all tasks when no specific filter', async () => {
      const tasks = [sampleTask, sampleTaskWithTarget];
      mockRepository.getTasksByStatus.mockResolvedValue(tasks);

      const result = await socket.getHistory();

      expect(mockRepository.getTasksByStatus).toHaveBeenCalledWith(
        [
          A2ATaskStatus.PENDING,
          A2ATaskStatus.IN_PROGRESS,
          A2ATaskStatus.COMPLETED,
          A2ATaskStatus.FAILED,
          A2ATaskStatus.WAITING,
          A2ATaskStatus.REVIEW
        ],
        { limit: undefined }
      );
      expect(result).toHaveLength(2);
    });

    it('should apply client-side filtering', async () => {
      const tasks = [sampleTask, sampleTaskWithTarget];
      mockRepository.getTasksByThread.mockResolvedValue(tasks);

      const filter: A2ATaskFilter = { 
        status: A2ATaskStatus.IN_PROGRESS,
        taskType: 'analyze'
      };
      const result = await socket.getHistory(filter, { threadId: 'thread-123' });

      expect(result).toHaveLength(1);
      expect(result[0].task).toEqual(sampleTaskWithTarget);
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.getTasksByThread.mockRejectedValue(new Error('Repository error'));

      const result = await socket.getHistory(undefined, { threadId: 'thread-123' });

      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        'Error fetching A2A task history:',
        expect.any(Error)
      );
    });

    it('should apply limit correctly', async () => {
      const tasks = [sampleTask, sampleTaskWithTarget];
      mockRepository.getTasksByThread.mockResolvedValue(tasks);

      const result = await socket.getHistory(undefined, { 
        threadId: 'thread-123', 
        limit: 1 
      });

      expect(result).toHaveLength(1);
      expect(result[0].task).toEqual(sampleTaskWithTarget); // Should be the newest
    });

    it('should convert tasks to events correctly', async () => {
      const completedTask = {
        ...sampleTask,
        status: A2ATaskStatus.COMPLETED,
        metadata: { ...sampleTask.metadata, updatedAt: 3000 }
      };
      
      mockRepository.getTasksByThread.mockResolvedValue([completedTask]);

      const result = await socket.getHistory(undefined, { threadId: 'thread-123' });

      expect(result[0]).toEqual({
        task: completedTask,
        eventType: 'completed',
        timestamp: 3000,
        metadata: {
          automatic: true,
          source: 'history',
          context: {
            taskType: 'analyze',
            priority: A2ATaskPriority.MEDIUM,
            hasTargetAgent: false
          }
        }
      });
    });

    it('should detect created events correctly', async () => {
      const newTask = {
        ...sampleTask,
        metadata: { ...sampleTask.metadata, createdAt: 1000, updatedAt: 1000 }
      };
      
      mockRepository.getTasksByThread.mockResolvedValue([newTask]);

      const result = await socket.getHistory(undefined, { threadId: 'thread-123' });

      expect(result[0].eventType).toBe('created');
    });

    it('should detect delegated events correctly', async () => {
      const taskWithAgent = {
        ...sampleTask,
        targetAgent: sampleTaskWithTarget.targetAgent,
        metadata: { ...sampleTask.metadata, updatedAt: 2000 }
      };
      
      mockRepository.getTasksByThread.mockResolvedValue([taskWithAgent]);

      const result = await socket.getHistory(undefined, { threadId: 'thread-123' });

      expect(result[0].eventType).toBe('delegated');
    });
  });

  describe('complex filtering scenarios', () => {
    it('should handle multiple filter criteria', () => {
      const filter: A2ATaskFilter = {
        status: A2ATaskStatus.IN_PROGRESS,
        taskType: 'analyze',
        sourceAgentId: 'source-agent-1',
        priority: A2ATaskPriority.MEDIUM.toString()
      };
      
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should receive notification (matches all criteria)
      socket.notifyTaskEvent({
        task: sampleTaskWithTarget,
        eventType: 'updated',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Should not receive notification (different priority)
      const differentPriorityTask = {
        ...sampleTaskWithTarget,
        priority: A2ATaskPriority.HIGH
      };
      
      socket.notifyTaskEvent({
        task: differentPriorityTask,
        eventType: 'updated',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it('should handle array of task types', () => {
      const filter: A2ATaskFilter = {
        taskType: ['analyze', 'synthesize', 'transform']
      };
      
      const unsubscribe = socket.subscribe(mockCallback, filter);

      // Should receive notification (taskType is in array)
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Should not receive notification (taskType not in array)
      const differentTypeTask = {
        ...sampleTask,
        payload: { ...sampleTask.payload, taskType: 'unknown' }
      };
      
      socket.notifyTaskEvent({
        task: differentTypeTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });

  describe('thread targeting', () => {
    it('should correctly target notifications by correlationId', () => {
      // Subscribe with thread filter matching the correlationId
      const threadCallback = vi.fn();
      const unsubscribe = socket.subscribe(threadCallback, undefined, { threadId: 'thread-123' });
      
      // Subscribe with different thread filter
      const otherThreadCallback = vi.fn();
      const unsubscribe2 = socket.subscribe(otherThreadCallback, undefined, { threadId: 'thread-456' });
      
      socket.notifyTaskEvent({
        task: sampleTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      // Should notify the callback subscribed to the matching thread
      expect(threadCallback).toHaveBeenCalledTimes(1);
      expect(otherThreadCallback).not.toHaveBeenCalled();

      unsubscribe();
      unsubscribe2();
    });
  });
}); 