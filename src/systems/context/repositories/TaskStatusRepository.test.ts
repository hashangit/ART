import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskStatusRepository } from './TaskStatusRepository';
import { StorageAdapter } from '../../../core/interfaces';
import { A2ATask, A2ATaskStatus, A2ATaskPriority, ARTError, ErrorCode } from '../../../types';

// Create a comprehensive mock StorageAdapter
const createMockStorageAdapter = (): StorageAdapter => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  query: vi.fn(),
  clearCollection: vi.fn(),
  clearAll: vi.fn()
});

// Helper function to create a sample A2A task
const createSampleTask = (overrides: Partial<A2ATask> = {}): A2ATask => ({
  taskId: 'task-1',
  status: A2ATaskStatus.PENDING,
  priority: A2ATaskPriority.MEDIUM,
  threadId: 'thread-123',
  payload: {
    type: 'data_retrieval',
    data: { query: 'fetch user data' }
  },
  assignedAgent: {
    agentId: 'agent-001',
    agentType: 'data-agent',
    capabilities: ['database_query', 'data_transformation'],
    endpoint: 'https://api.example.com/agents/agent-001'
  },
  metadata: {
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    retryCount: 0,
    timeoutMs: 30000,
    tags: ['urgent', 'user-data']
  },
  ...overrides
});

describe('TaskStatusRepository', () => {
  let repository: TaskStatusRepository;
  let mockAdapter: StorageAdapter;

  beforeEach(() => {
    mockAdapter = createMockStorageAdapter();
    repository = new TaskStatusRepository(mockAdapter);
  });

  describe('Constructor', () => {
    it('should throw error if no storage adapter provided', () => {
      expect(() => new TaskStatusRepository(null as any)).toThrow(
        'TaskStatusRepository requires a valid StorageAdapter instance.'
      );
    });

    it('should initialize with valid storage adapter', () => {
      expect(repository).toBeInstanceOf(TaskStatusRepository);
    });
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      const task = createSampleTask();
      (mockAdapter.get as any).mockResolvedValue(null); // Task doesn't exist
      (mockAdapter.set as any).mockResolvedValue(undefined);

      await repository.createTask(task);

      expect(mockAdapter.get).toHaveBeenCalledWith('a2a_tasks', task.taskId);
      expect(mockAdapter.set).toHaveBeenCalledWith('a2a_tasks', task.taskId, {
        ...task,
        id: task.taskId
      });
    });

    it('should throw error for task without taskId', async () => {
      const invalidTask = { ...createSampleTask(), taskId: '' };

      await expect(repository.createTask(invalidTask as any)).rejects.toThrow(
        new ARTError('Task must have a valid taskId', ErrorCode.VALIDATION_ERROR)
      );
    });

    it('should throw error for null task', async () => {
      await expect(repository.createTask(null as any)).rejects.toThrow(
        new ARTError('Task must have a valid taskId', ErrorCode.VALIDATION_ERROR)
      );
    });

    it('should throw error if task already exists', async () => {
      const task = createSampleTask();
      const existingTask = { ...task, id: task.taskId };
      (mockAdapter.get as any).mockResolvedValue(existingTask);

      await expect(repository.createTask(task)).rejects.toThrow(
        new ARTError(`Task with ID '${task.taskId}' already exists`, ErrorCode.DUPLICATE_TASK_ID)
      );
    });
  });

  describe('getTask', () => {
    it('should retrieve existing task successfully', async () => {
      const task = createSampleTask();
      const storedTask = { ...task, id: task.taskId };
      (mockAdapter.get as any).mockResolvedValue(storedTask);

      const result = await repository.getTask(task.taskId);

      expect(mockAdapter.get).toHaveBeenCalledWith('a2a_tasks', task.taskId);
      expect(result).toEqual(task); // Should not include 'id' field
    });

    it('should return null for non-existent task', async () => {
      (mockAdapter.get as any).mockResolvedValue(null);

      const result = await repository.getTask('non-existent-task');

      expect(result).toBeNull();
    });

    it('should throw error for empty taskId', async () => {
      await expect(repository.getTask('')).rejects.toThrow(
        new ARTError('TaskId is required', ErrorCode.VALIDATION_ERROR)
      );
    });

    it('should handle storage adapter errors', async () => {
      const taskId = 'task-1';
      const adapterError = new Error('Storage error');
      (mockAdapter.get as any).mockRejectedValue(adapterError);

      await expect(repository.getTask(taskId)).rejects.toThrow(
        new ARTError(`Failed to retrieve task '${taskId}': ${adapterError}`, ErrorCode.REPOSITORY_ERROR)
      );
    });
  });

  describe('updateTask', () => {
    it('should update existing task successfully', async () => {
      const task = createSampleTask();
      const storedTask = { ...task, id: task.taskId };
      const updates: Partial<A2ATask> = {
        status: A2ATaskStatus.IN_PROGRESS,
        priority: A2ATaskPriority.HIGH
      };

      (mockAdapter.get as any).mockResolvedValue(storedTask);
      (mockAdapter.set as any).mockResolvedValue(undefined);

      await repository.updateTask(task.taskId, updates);

      expect(mockAdapter.get).toHaveBeenCalledWith('a2a_tasks', task.taskId);
      expect(mockAdapter.set).toHaveBeenCalledWith('a2a_tasks', task.taskId, {
        ...storedTask,
        ...updates,
        taskId: task.taskId, // Should preserve taskId
        id: task.taskId // Should preserve id
      });
    });

    it('should update metadata timestamp when metadata is provided', async () => {
      const now = Date.now();
      const task = createSampleTask({
        metadata: {
          ...createSampleTask().metadata!,
          createdAt: now - 1000, // Set initial timestamp to 1 second ago
          lastUpdated: now - 1000
        }
      });
      const storedTask = { ...task, id: task.taskId };
      const updates: Partial<A2ATask> = {
        metadata: { retryCount: 1 }
      };

      (mockAdapter.get as any).mockResolvedValue(storedTask);
      (mockAdapter.set as any).mockResolvedValue(undefined);

      await repository.updateTask(task.taskId, updates);

      const setCall = (mockAdapter.set as any).mock.calls[0];
      const updatedTask = setCall[2];
      expect(updatedTask.metadata.retryCount).toBe(1);
      expect(updatedTask.metadata.lastUpdated).toBeGreaterThan(task.metadata!.lastUpdated!);
    });

    it('should throw error for empty taskId', async () => {
      const updates = { status: A2ATaskStatus.COMPLETED };

      await expect(repository.updateTask('', updates)).rejects.toThrow(
        new ARTError('TaskId is required', ErrorCode.VALIDATION_ERROR)
      );
    });

    it('should throw error for empty updates', async () => {
      await expect(repository.updateTask('task-1', {})).rejects.toThrow(
        new ARTError('Updates object cannot be empty', ErrorCode.VALIDATION_ERROR)
      );
    });

    it('should throw error if task not found', async () => {
      const taskId = 'non-existent-task';
      const updates = { status: A2ATaskStatus.COMPLETED };
      (mockAdapter.get as any).mockResolvedValue(null);

      await expect(repository.updateTask(taskId, updates)).rejects.toThrow(
        new ARTError(`Task with ID '${taskId}' not found`, ErrorCode.TASK_NOT_FOUND)
      );
    });

    it('should propagate ARTErrors from storage operations', async () => {
      const taskId = 'task-1';
      const updates = { status: A2ATaskStatus.COMPLETED };
      const artError = new ARTError('Database unavailable', ErrorCode.STORAGE_ERROR);
      (mockAdapter.get as any).mockRejectedValue(artError);

      await expect(repository.updateTask(taskId, updates)).rejects.toThrow(artError);
    });

    it('should wrap non-ARTErrors from storage operations', async () => {
      const taskId = 'task-1';
      const updates = { status: A2ATaskStatus.COMPLETED };
      const genericError = new Error('Generic storage error');
      (mockAdapter.get as any).mockRejectedValue(genericError);

      await expect(repository.updateTask(taskId, updates)).rejects.toThrow(
        new ARTError(`Failed to update task '${taskId}': ${genericError}`, ErrorCode.REPOSITORY_ERROR)
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task successfully', async () => {
      const task = createSampleTask();
      const storedTask = { ...task, id: task.taskId };
      (mockAdapter.get as any).mockResolvedValue(storedTask);
      (mockAdapter.delete as any).mockResolvedValue(undefined);

      await repository.deleteTask(task.taskId);

      expect(mockAdapter.get).toHaveBeenCalledWith('a2a_tasks', task.taskId);
      expect(mockAdapter.delete).toHaveBeenCalledWith('a2a_tasks', task.taskId);
    });

    it('should throw error for empty taskId', async () => {
      await expect(repository.deleteTask('')).rejects.toThrow(
        new ARTError('TaskId is required', ErrorCode.VALIDATION_ERROR)
      );
    });

    it('should throw error if task not found', async () => {
      const taskId = 'non-existent-task';
      (mockAdapter.get as any).mockResolvedValue(null);

      await expect(repository.deleteTask(taskId)).rejects.toThrow(
        new ARTError(`Task with ID '${taskId}' not found`, ErrorCode.TASK_NOT_FOUND)
      );
    });

    it('should propagate ARTErrors from storage operations', async () => {
      const taskId = 'task-1';
      const artError = new ARTError('Database unavailable', ErrorCode.STORAGE_ERROR);
      (mockAdapter.get as any).mockRejectedValue(artError);

      await expect(repository.deleteTask(taskId)).rejects.toThrow(artError);
    });

    it('should wrap non-ARTErrors from storage operations', async () => {
      const taskId = 'task-1';
      const genericError = new Error('Generic storage error');
      (mockAdapter.get as any).mockRejectedValue(genericError);

      await expect(repository.deleteTask(taskId)).rejects.toThrow(
        new ARTError(`Failed to delete task '${taskId}': ${genericError}`, ErrorCode.REPOSITORY_ERROR)
      );
    });
  });

  describe('getTasksByThread', () => {
    it('should retrieve tasks for specific thread', async () => {
      const threadId = 'thread-123';
      const task1 = createSampleTask({ taskId: 'task-1', threadId });
      const task2 = createSampleTask({ taskId: 'task-2', threadId });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByThread(threadId);

      expect(mockAdapter.query).toHaveBeenCalledWith('a2a_tasks', {
        filter: { threadId }
      });
      expect(result).toEqual([task1, task2]); // Should not include 'id' fields
    });

    it('should filter tasks by status', async () => {
      const threadId = 'thread-123';
      const task1 = createSampleTask({ 
        taskId: 'task-1', 
        threadId, 
        status: A2ATaskStatus.PENDING 
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2', 
        threadId, 
        status: A2ATaskStatus.IN_PROGRESS 
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByThread(threadId, {
        status: A2ATaskStatus.PENDING
      });

      expect(result).toEqual([task1]);
    });

    it('should filter tasks by multiple statuses', async () => {
      const threadId = 'thread-123';
      const task1 = createSampleTask({ 
        taskId: 'task-1', 
        threadId, 
        status: A2ATaskStatus.PENDING 
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2', 
        threadId, 
        status: A2ATaskStatus.IN_PROGRESS 
      });
      const task3 = createSampleTask({ 
        taskId: 'task-3', 
        threadId, 
        status: A2ATaskStatus.COMPLETED 
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId },
        { ...task3, id: task3.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByThread(threadId, {
        status: [A2ATaskStatus.PENDING, A2ATaskStatus.IN_PROGRESS]
      });

      expect(result).toEqual([task1, task2]);
    });

    it('should filter tasks by priority and assigned agent', async () => {
      const threadId = 'thread-123';
      const task1 = createSampleTask({ 
        taskId: 'task-1', 
        threadId, 
        priority: A2ATaskPriority.HIGH,
        assignedAgent: { agentId: 'agent-001', agentType: 'test', capabilities: [], endpoint: 'http://test.com' }
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2', 
        threadId, 
        priority: A2ATaskPriority.MEDIUM,
        assignedAgent: { agentId: 'agent-002', agentType: 'test', capabilities: [], endpoint: 'http://test.com' }
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByThread(threadId, {
        priority: A2ATaskPriority.HIGH,
        assignedAgentId: 'agent-001'
      });

      expect(result).toEqual([task1]);
    });

    it('should sort tasks by creation timestamp (newest first)', async () => {
      const threadId = 'thread-123';
      const now = Date.now();
      const task1 = createSampleTask({ 
        taskId: 'task-1', 
        threadId,
        metadata: { ...createSampleTask().metadata!, createdAt: now - 2000 }
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2', 
        threadId,
        metadata: { ...createSampleTask().metadata!, createdAt: now - 1000 }
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByThread(threadId);

      expect(result[0]).toEqual(task2); // Most recent first
      expect(result[1]).toEqual(task1);
    });

    it('should throw error for empty threadId', async () => {
      await expect(repository.getTasksByThread('')).rejects.toThrow(
        new ARTError('ThreadId is required', ErrorCode.VALIDATION_ERROR)
      );
    });

    it('should handle storage adapter errors', async () => {
      const threadId = 'thread-123';
      const adapterError = new Error('Storage error');
      (mockAdapter.query as any).mockRejectedValue(adapterError);

      await expect(repository.getTasksByThread(threadId)).rejects.toThrow(
        new ARTError(`Failed to get tasks for thread '${threadId}': ${adapterError}`, ErrorCode.REPOSITORY_ERROR)
      );
    });
  });

  describe('getTasksByAgent', () => {
    it('should retrieve tasks for specific agent', async () => {
      const agentId = 'agent-001';
      const task1 = createSampleTask({ 
        taskId: 'task-1',
        assignedAgent: { agentId, agentType: 'test', capabilities: [], endpoint: 'http://test.com' }
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2',
        assignedAgent: { agentId: 'agent-002', agentType: 'test', capabilities: [], endpoint: 'http://test.com' }
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByAgent(agentId);

      expect(result).toEqual([task1]);
    });

    it('should filter by status and priority', async () => {
      const agentId = 'agent-001';
      const task1 = createSampleTask({ 
        taskId: 'task-1',
        status: A2ATaskStatus.PENDING,
        priority: A2ATaskPriority.HIGH,
        assignedAgent: { agentId, agentType: 'test', capabilities: [], endpoint: 'http://test.com' }
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2',
        status: A2ATaskStatus.IN_PROGRESS,
        priority: A2ATaskPriority.MEDIUM,
        assignedAgent: { agentId, agentType: 'test', capabilities: [], endpoint: 'http://test.com' }
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByAgent(agentId, {
        status: A2ATaskStatus.PENDING,
        priority: A2ATaskPriority.HIGH
      });

      expect(result).toEqual([task1]);
    });

    it('should throw error for empty agentId', async () => {
      await expect(repository.getTasksByAgent('')).rejects.toThrow(
        new ARTError('AgentId is required', ErrorCode.VALIDATION_ERROR)
      );
    });
  });

  describe('getTasksByStatus', () => {
    it('should retrieve tasks by single status', async () => {
      const task1 = createSampleTask({ 
        taskId: 'task-1',
        status: A2ATaskStatus.PENDING
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2',
        status: A2ATaskStatus.IN_PROGRESS
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByStatus(A2ATaskStatus.PENDING);

      expect(result).toEqual([task1]);
    });

    it('should retrieve tasks by multiple statuses', async () => {
      const task1 = createSampleTask({ 
        taskId: 'task-1',
        status: A2ATaskStatus.PENDING
      });
      const task2 = createSampleTask({ 
        taskId: 'task-2',
        status: A2ATaskStatus.IN_PROGRESS
      });
      const task3 = createSampleTask({ 
        taskId: 'task-3',
        status: A2ATaskStatus.COMPLETED
      });
      const storedTasks = [
        { ...task1, id: task1.taskId },
        { ...task2, id: task2.taskId },
        { ...task3, id: task3.taskId }
      ];

      (mockAdapter.query as any).mockResolvedValue(storedTasks);

      const result = await repository.getTasksByStatus([
        A2ATaskStatus.PENDING, 
        A2ATaskStatus.IN_PROGRESS
      ]);

      expect(result).toEqual([task1, task2]);
    });

    it('should apply pagination options', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => {
        const task = createSampleTask({ 
          taskId: `task-${i}`,
          status: A2ATaskStatus.PENDING,
          metadata: { ...createSampleTask().metadata!, createdAt: Date.now() + i }
        });
        return { ...task, id: task.taskId };
      });

      (mockAdapter.query as any).mockResolvedValue(tasks);

      const result = await repository.getTasksByStatus(A2ATaskStatus.PENDING, {
        offset: 2,
        limit: 3
      });

      expect(result).toHaveLength(3);
      // Should start from index 2 after sorting (newest first)
      expect(result[0].taskId).toBe('task-7'); // task-9, task-8, task-7 (starting from index 2)
    });

    it('should throw error for empty status', async () => {
      await expect(repository.getTasksByStatus(null as any)).rejects.toThrow(
        new ARTError('Status is required', ErrorCode.VALIDATION_ERROR)
      );
    });
  });

  describe('_removeIdField helper', () => {
    it('should remove id field from task arrays', () => {
      const tasksWithId = [
        { ...createSampleTask({ taskId: 'task-1' }), id: 'task-1' },
        { ...createSampleTask({ taskId: 'task-2' }), id: 'task-2' }
      ];

      // Use the private method through a type assertion for testing
      const result = (repository as any)._removeIdField(tasksWithId);

      expect(result).toEqual([
        createSampleTask({ taskId: 'task-1' }),
        createSampleTask({ taskId: 'task-2' })
      ]);
      
      // Ensure no 'id' field exists in results
      result.forEach((task: any) => {
        expect(task.id).toBeUndefined();
      });
    });
  });
}); 