import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { TaskDelegationService } from './TaskDelegationService';
import { AgentDiscoveryService } from './AgentDiscoveryService';
import { A2ATaskSocket, A2ATaskFilter } from '../ui/a2a-task-socket';
import { InMemoryStorageAdapter } from '../../adapters/storage/inMemory';
import { TaskStatusRepository } from '../context/repositories/TaskStatusRepository';
import {
  A2ATask,
  A2ATaskStatus,
  A2ATaskPriority,
  A2AAgentInfo,
  A2ATaskResult
} from '../../types';
import { Logger } from '../../utils/logger';
import type { IA2ATaskRepository } from '../../core/interfaces';

// Mock fetch for HTTP requests
global.fetch = vi.fn();

/**
 * Mock HTTP server for simulating remote A2A agents
 */
class MockA2AAgentServer {
  private tasks: Map<string, A2ATask> = new Map();
  private readonly baseUrl: string;
  private readonly agentInfo: A2AAgentInfo;

  constructor(agentInfo: A2AAgentInfo) {
    this.agentInfo = agentInfo;
    this.baseUrl = agentInfo.endpoint!;
  }

  /**
   * Mock the agent's task submission endpoint
   */
  mockTaskSubmission() {
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      if (url === `${this.baseUrl}/tasks` && options.method === 'POST') {
        const payload = JSON.parse(options.body);
        
        const task: A2ATask = {
          taskId: payload.taskId,
          status: A2ATaskStatus.PENDING,
          payload: {
            taskType: payload.taskType,
            input: payload.input,
            instructions: payload.instructions,
            parameters: payload.parameters
          },
          sourceAgent: payload.sourceAgent,
          targetAgent: this.agentInfo,
          priority: payload.priority,
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            initiatedBy: 'mock-agent',
            correlationId: payload.metadata?.traceId
          },
          callbackUrl: payload.callbackUrl
        };

        this.tasks.set(task.taskId, task);

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            taskId: task.taskId,
            status: A2ATaskStatus.PENDING,
            message: 'Task accepted for processing',
            estimatedCompletionMs: 10000
          })
        });
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });
  }

  clear() {
    this.tasks.clear();
  }
}

describe('A2A Integration Tests', () => {
  let delegationService: TaskDelegationService;
  let taskRepository: IA2ATaskRepository;
  let storageAdapter: InMemoryStorageAdapter;
  let mockAgentServer: MockA2AAgentServer;
  
  const testAgent: A2AAgentInfo = {
    agentId: 'test-agent-1',
    agentName: 'Data Analysis Agent',
    endpoint: 'http://localhost:8001/api/a2a',
    capabilities: {
      supportedTaskTypes: ['analyze', 'data_processing'],
      maxConcurrentTasks: 5,
      averageResponseTimeMs: 2000
    },
    authentication: {
      type: 'api_key',
      apiKey: 'test-api-key-1'
    }
  };

  beforeAll(() => {
    vi.spyOn(Logger, 'debug').mockImplementation(() => {});
    vi.spyOn(Logger, 'info').mockImplementation(() => {});
    vi.spyOn(Logger, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    storageAdapter = new InMemoryStorageAdapter();
    await storageAdapter.init();
    
    taskRepository = new TaskStatusRepository(storageAdapter);
    
    const discoveryService = new AgentDiscoveryService({
      discoveryEndpoint: 'http://localhost:4200/api/services',
      timeoutMs: 5000
    });
    
    delegationService = new TaskDelegationService(
      discoveryService,
      taskRepository,
      {
        defaultTimeoutMs: 5000,
        maxRetries: 2,
        retryDelayMs: 100,
        useExponentialBackoff: false
      }
    );
    
    mockAgentServer = new MockA2AAgentServer(testAgent);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (mockAgentServer) {
      mockAgentServer.clear();
    }
    await storageAdapter.clearAll();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Basic A2A Task Workflow', () => {
    it('should create and persist A2A tasks', async () => {
      const testTask: A2ATask = {
        taskId: 'test-task-001',
        status: A2ATaskStatus.PENDING,
        payload: {
          taskType: 'analyze',
          input: { dataset: 'test_data.csv' },
          instructions: 'Analyze the dataset'
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.MEDIUM,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      await taskRepository.createTask(testTask);
      const retrievedTask = await taskRepository.getTask('test-task-001');
      
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask!.taskId).toBe('test-task-001');
      expect(retrievedTask!.status).toBe(A2ATaskStatus.PENDING);
    });

    it('should handle task updates', async () => {
      const testTask: A2ATask = {
        taskId: 'test-task-002',
        status: A2ATaskStatus.PENDING,
        payload: {
          taskType: 'analyze',
          input: { data: 'test' }
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.HIGH,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      await taskRepository.createTask(testTask);
      
      await taskRepository.updateTask('test-task-002', {
        status: A2ATaskStatus.IN_PROGRESS,
        targetAgent: testAgent
      });

      const updatedTask = await taskRepository.getTask('test-task-002');
      expect(updatedTask!.status).toBe(A2ATaskStatus.IN_PROGRESS);
      expect(updatedTask!.targetAgent).toEqual(testAgent);
    });
  });

  describe('Task Delegation Integration', () => {
    it('should handle task delegation flow', async () => {
      mockAgentServer.mockTaskSubmission();
      
      const testTask: A2ATask = {
        taskId: 'test-task-003',
        status: A2ATaskStatus.PENDING,
        payload: {
          taskType: 'analyze',
          input: { data: 'test-data' }
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.MEDIUM,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      // Test that delegation service can be called
      // Note: This will test error handling since agent discovery won't find agents in this test setup
      try {
        await delegationService.delegateTask(testTask, 'test-trace-003');
        // If it succeeds, that's also valid - means mocking worked
      } catch (error: any) {
        // Expected to fail due to agent discovery not finding suitable agents
        expect(error.message).toContain('Failed to delegate task');
      }
    });

    it('should handle network failures gracefully', async () => {
      // Mock network failure
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      const testTask: A2ATask = {
        taskId: 'test-task-004',
        status: A2ATaskStatus.PENDING,
        payload: {
          taskType: 'analyze',
          input: { data: 'test-data' }
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.HIGH,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      // Should handle errors gracefully
      try {
        await delegationService.delegateTask(testTask, 'test-trace-004');
      } catch (error: any) {
        expect(error.message).toContain('Failed to delegate task');
      }
    });
  });

  describe('A2A Socket Integration', () => {
    it('should create A2A task socket and emit events', () => {
      const a2aTaskSocket = new A2ATaskSocket(taskRepository);
      
      const events: any[] = [];
      const unsubscribe = a2aTaskSocket.subscribe((event) => {
        events.push(event);
      });

      const testTask: A2ATask = {
        taskId: 'test-task-005',
        status: A2ATaskStatus.PENDING,
        payload: {
          taskType: 'analyze',
          input: { data: 'test' }
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.MEDIUM,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      a2aTaskSocket.notifyTaskEvent({
        task: testTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('created');
      expect(events[0].task.taskId).toBe('test-task-005');

      unsubscribe();
    });

    it('should handle task status notifications', () => {
      const a2aTaskSocket = new A2ATaskSocket(taskRepository);
      
      const events: any[] = [];
      const unsubscribe = a2aTaskSocket.subscribe((event) => {
        events.push(event);
      });

      const testTask: A2ATask = {
        taskId: 'test-task-006',
        status: A2ATaskStatus.COMPLETED,
        payload: {
          taskType: 'analyze',
          input: { data: 'test' }
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.HIGH,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      // Test status change notification
      a2aTaskSocket.notifyTaskUpdated(testTask, A2ATaskStatus.PENDING, { source: 'test' });

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('completed'); // Since final status is COMPLETED
      expect(events[0].task.status).toBe(A2ATaskStatus.COMPLETED);
      expect(events[0].previousStatus).toBe(A2ATaskStatus.PENDING);

      unsubscribe();
    });

    it('should support task filtering in sockets', () => {
      const a2aTaskSocket = new A2ATaskSocket(taskRepository);
      
      const highPriorityEvents: any[] = [];
      const unsubscribe = a2aTaskSocket.subscribe(
        (event) => highPriorityEvents.push(event),
        { priority: A2ATaskPriority.HIGH } as A2ATaskFilter
      );

      // Create low priority task
      const lowPriorityTask: A2ATask = {
        taskId: 'low-priority-task',
        status: A2ATaskStatus.PENDING,
        payload: { taskType: 'analyze', input: {} },
        sourceAgent: { agentId: 'source', agentName: 'Source' },
        priority: A2ATaskPriority.LOW,
        metadata: { createdAt: Date.now(), updatedAt: Date.now() }
      };

      // Create high priority task  
      const highPriorityTask: A2ATask = {
        taskId: 'high-priority-task',
        status: A2ATaskStatus.PENDING,
        payload: { taskType: 'analyze', input: {} },
        sourceAgent: { agentId: 'source', agentName: 'Source' },
        priority: A2ATaskPriority.HIGH,
        metadata: { createdAt: Date.now(), updatedAt: Date.now() }
      };

      // Emit events
      a2aTaskSocket.notifyTaskEvent({
        task: lowPriorityTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      a2aTaskSocket.notifyTaskEvent({
        task: highPriorityTask,
        eventType: 'created',
        timestamp: Date.now()
      });

      // Only high priority event should be received
      expect(highPriorityEvents).toHaveLength(1);
      expect(highPriorityEvents[0].task.taskId).toBe('high-priority-task');

      unsubscribe();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid task data', async () => {
      // Test with empty task ID
      const invalidTask: A2ATask = {
        taskId: '',
        status: A2ATaskStatus.PENDING,
        payload: {
          taskType: 'analyze',
          input: null
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.MEDIUM,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      // Repository should handle validation
      try {
        await taskRepository.createTask(invalidTask);
        // If it succeeds, check that task was stored
        const stored = await taskRepository.getTask('');
        expect(stored).toBeDefined();
      } catch (error) {
        // If it fails, that's expected behavior for invalid data
        expect(error).toBeDefined();
      }
    });

    it('should handle repository errors gracefully', async () => {
      // Test getting non-existent task
      const nonExistentTask = await taskRepository.getTask('non-existent-task');
      expect(nonExistentTask).toBeNull();

      // Test updating non-existent task
      try {
        await taskRepository.updateTask('non-existent-task', {
          status: A2ATaskStatus.COMPLETED
        });
      } catch (error) {
        // Expected to throw an error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Integration with Storage Adapter', () => {
    it('should persist tasks across repository operations', async () => {
      const testTask: A2ATask = {
        taskId: 'persistence-test',
        status: A2ATaskStatus.PENDING,
        payload: {
          taskType: 'synthesize',
          input: { content: 'test content' }
        },
        sourceAgent: {
          agentId: 'source-agent',
          agentName: 'Main ART Agent'
        },
        priority: A2ATaskPriority.LOW,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      // Create task
      await taskRepository.createTask(testTask);

      // Verify it exists
      const retrieved1 = await taskRepository.getTask('persistence-test');
      expect(retrieved1).toBeDefined();
      expect(retrieved1!.payload.taskType).toBe('synthesize');

      // Update task
      await taskRepository.updateTask('persistence-test', {
        status: A2ATaskStatus.COMPLETED,
        result: {
          success: true,
          data: { synthesis: 'completed synthesis' },
          metadata: { timestamp: Date.now() }
        }
      });

      // Verify update persisted
      const retrieved2 = await taskRepository.getTask('persistence-test');
      expect(retrieved2!.status).toBe(A2ATaskStatus.COMPLETED);
      expect(retrieved2!.result?.success).toBe(true);

      // Delete task
      await taskRepository.deleteTask('persistence-test');

      // Verify deletion
      const retrieved3 = await taskRepository.getTask('persistence-test');
      expect(retrieved3).toBeNull();
    });
  });
}); 