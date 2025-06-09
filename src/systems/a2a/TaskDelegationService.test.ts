// src/systems/a2a/TaskDelegationService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskDelegationService, TaskSubmissionResponse, TaskStatusResponse } from './TaskDelegationService';
import { AgentDiscoveryService } from './AgentDiscoveryService';
import { A2ATask, A2ATaskStatus, A2ATaskPriority, A2AAgentInfo } from '../../types';
import { IA2ATaskRepository } from '../../core/interfaces';
import { ARTError } from '../../errors';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the AgentDiscoveryService
const mockDiscoveryService = {
  findAgentForTask: vi.fn()
} as unknown as AgentDiscoveryService;

// Mock the TaskRepository
const mockTaskRepository = {
  createTask: vi.fn(),
  updateTask: vi.fn(),
  getTask: vi.fn()
} as unknown as IA2ATaskRepository;

describe('TaskDelegationService', () => {
  let service: TaskDelegationService;

  const mockA2ATask: A2ATask = {
    taskId: 'test-task-123',
    status: A2ATaskStatus.PENDING,
    payload: {
      taskType: 'analysis',
      input: { data: 'test data for analysis' },
      instructions: 'Analyze the provided data',
      parameters: { depth: 'detailed' }
    },
    sourceAgent: {
      agentId: 'pes-agent',
      agentName: 'PES Agent',
      agentType: 'reasoning'
    },
    priority: A2ATaskPriority.MEDIUM,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      timeoutMs: 30000,
      tags: ['extracted', 'analysis']
    }
  };

  const mockTargetAgent: A2AAgentInfo = {
    agentId: 'health-agent-v1.0.0',
    agentName: 'Healthcare Agent',
    agentType: 'healthcare',
    endpoint: 'https://health.example.com/agent',
    capabilities: ['patient_analysis', 'medical_research'],
    status: 'available'
  };

  const mockSubmissionResponse: TaskSubmissionResponse = {
    success: true,
    taskId: 'remote-task-456',
    status: A2ATaskStatus.IN_PROGRESS,
    message: 'Task accepted and processing started',
    estimatedCompletionMs: 15000,
    metadata: { remoteTaskId: 'remote-task-456' }
  };

  beforeEach(() => {
    // Reset all mocks
    vi.mocked(fetch).mockReset();
    vi.mocked(mockDiscoveryService.findAgentForTask).mockReset();
    vi.mocked(mockTaskRepository.createTask).mockReset();
    vi.mocked(mockTaskRepository.updateTask).mockReset();
    vi.mocked(mockTaskRepository.getTask).mockReset();

    // Create service instance
    service = new TaskDelegationService(
      mockDiscoveryService,
      mockTaskRepository,
      {
        defaultTimeoutMs: 5000,
        maxRetries: 2,
        retryDelayMs: 100,
        useExponentialBackoff: false
      }
    );
  });

  describe('delegateTask', () => {
    it('should successfully delegate a task to a suitable agent', async () => {
      // Mock agent discovery
      vi.mocked(mockDiscoveryService.findAgentForTask).mockResolvedValueOnce(mockTargetAgent);

      // Mock successful task submission
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissionResponse
      } as Response);

      // Mock task repository operations
      vi.mocked(mockTaskRepository.createTask).mockResolvedValueOnce();

      const result = await service.delegateTask(mockA2ATask, 'test-trace');

      expect(result).not.toBeNull();
      expect(result?.status).toBe(A2ATaskStatus.IN_PROGRESS);
      expect(result?.targetAgent).toEqual(mockTargetAgent);
      expect(result?.metadata.tags).toContain('delegated');

      // Verify agent discovery was called
      expect(mockDiscoveryService.findAgentForTask).toHaveBeenCalledWith('analysis', 'test-trace');

      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'https://health.example.com/agent/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'ART-Framework-A2A/1.0.0',
            'X-Trace-ID': 'test-trace'
          }),
          body: expect.stringContaining('"taskId":"test-task-123"')
        })
      );

      // Verify task was persisted
      expect(mockTaskRepository.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'test-task-123',
          status: A2ATaskStatus.IN_PROGRESS,
          targetAgent: mockTargetAgent
        })
      );
    });

    it('should return null when no suitable agent is found', async () => {
      // Mock agent discovery returning null
      vi.mocked(mockDiscoveryService.findAgentForTask).mockResolvedValueOnce(null);

      const result = await service.delegateTask(mockA2ATask, 'test-trace');

      expect(result).toBeNull();
      expect(mockDiscoveryService.findAgentForTask).toHaveBeenCalledWith('analysis', 'test-trace');
      expect(fetch).not.toHaveBeenCalled();
      expect(mockTaskRepository.createTask).not.toHaveBeenCalled();
    });

    it('should handle task submission failure and update task status', async () => {
      // Mock agent discovery
      vi.mocked(mockDiscoveryService.findAgentForTask).mockResolvedValueOnce(mockTargetAgent);

      // Mock failed task submission
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      // Mock task repository update for failure
      vi.mocked(mockTaskRepository.updateTask).mockResolvedValueOnce();

      await expect(service.delegateTask(mockA2ATask, 'test-trace')).rejects.toThrow(ARTError);

      // Verify failure was persisted
      expect(mockTaskRepository.updateTask).toHaveBeenCalledWith(
        'test-task-123',
        expect.objectContaining({
          status: A2ATaskStatus.FAILED,
          result: expect.objectContaining({
            success: false,
            error: expect.stringContaining('Delegation failed')
          })
        })
      );
    });

    it('should retry failed submissions with exponential backoff', async () => {
      // Create service with exponential backoff enabled
      const retryService = new TaskDelegationService(
        mockDiscoveryService,
        mockTaskRepository,
        {
          defaultTimeoutMs: 1000,
          maxRetries: 2,
          retryDelayMs: 50,
          useExponentialBackoff: true
        }
      );

      // Mock agent discovery
      vi.mocked(mockDiscoveryService.findAgentForTask).mockResolvedValueOnce(mockTargetAgent);

      // Mock fetch to fail twice, then succeed
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubmissionResponse
        } as Response);

      // Mock task repository operations
      vi.mocked(mockTaskRepository.createTask).mockResolvedValueOnce();

      const result = await retryService.delegateTask(mockA2ATask, 'test-trace');

      expect(result).not.toBeNull();
      expect(fetch).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
    });

    it('should handle authentication headers for bearer token', async () => {
      const agentWithAuth: A2AAgentInfo = {
        ...mockTargetAgent,
        authentication: {
          type: 'bearer',
          token: 'test-bearer-token'
        }
      };

      // Mock agent discovery
      vi.mocked(mockDiscoveryService.findAgentForTask).mockResolvedValueOnce(agentWithAuth);

      // Mock successful task submission
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissionResponse
      } as Response);

      // Mock task repository operations
      vi.mocked(mockTaskRepository.createTask).mockResolvedValueOnce();

      await service.delegateTask(mockA2ATask, 'test-trace');

      // Verify authorization header was included
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-bearer-token'
          })
        })
      );
    });

    it('should handle authentication headers for API key', async () => {
      const agentWithAuth: A2AAgentInfo = {
        ...mockTargetAgent,
        authentication: {
          type: 'api_key',
          apiKey: 'test-api-key'
        }
      };

      // Mock agent discovery
      vi.mocked(mockDiscoveryService.findAgentForTask).mockResolvedValueOnce(agentWithAuth);

      // Mock successful task submission
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissionResponse
      } as Response);

      // Mock task repository operations
      vi.mocked(mockTaskRepository.createTask).mockResolvedValueOnce();

      await service.delegateTask(mockA2ATask, 'test-trace');

      // Verify API key header was included
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key'
          })
        })
      );
    });
  });

  describe('delegateTasks', () => {
    it('should delegate multiple tasks successfully', async () => {
      const task1 = { ...mockA2ATask, taskId: 'task-1' };
      const task2 = { ...mockA2ATask, taskId: 'task-2' };
      const tasks = [task1, task2];

      // Mock agent discovery for both tasks
      vi.mocked(mockDiscoveryService.findAgentForTask)
        .mockResolvedValueOnce(mockTargetAgent)
        .mockResolvedValueOnce(mockTargetAgent);

      // Mock successful task submissions
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockSubmissionResponse, taskId: 'remote-1' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockSubmissionResponse, taskId: 'remote-2' })
        } as Response);

      // Mock task repository operations
      vi.mocked(mockTaskRepository.createTask).mockResolvedValue();

      const result = await service.delegateTasks(tasks, 'test-trace');

      expect(result).toHaveLength(2);
      expect(result[0].taskId).toBe('task-1');
      expect(result[1].taskId).toBe('task-2');
      expect(mockDiscoveryService.findAgentForTask).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(mockTaskRepository.createTask).toHaveBeenCalledTimes(2);
    });

    it('should continue with other tasks when one fails', async () => {
      const task1 = { ...mockA2ATask, taskId: 'task-1' };
      const task2 = { ...mockA2ATask, taskId: 'task-2' };
      const tasks = [task1, task2];

      // Mock agent discovery - first fails, second succeeds
      vi.mocked(mockDiscoveryService.findAgentForTask)
        .mockResolvedValueOnce(null) // First task fails to find agent
        .mockResolvedValueOnce(mockTargetAgent); // Second task succeeds

      // Mock successful task submission for second task
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmissionResponse
      } as Response);

      // Mock task repository operations
      vi.mocked(mockTaskRepository.createTask).mockResolvedValue();

      const result = await service.delegateTasks(tasks, 'test-trace');

      expect(result).toHaveLength(1); // Only one task succeeded
      expect(result[0].taskId).toBe('task-2');
    });

    it('should return empty array when no tasks provided', async () => {
      const result = await service.delegateTasks([], 'test-trace');

      expect(result).toHaveLength(0);
      expect(mockDiscoveryService.findAgentForTask).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('checkTaskStatus', () => {
    it('should successfully check task status', async () => {
      const taskWithTarget: A2ATask = {
        ...mockA2ATask,
        targetAgent: mockTargetAgent
      };

      const mockStatusResponse: TaskStatusResponse = {
        taskId: 'test-task-123',
        status: A2ATaskStatus.COMPLETED,
        progress: 100,
        result: {
          success: true,
          data: { result: 'analysis complete' }
        }
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      } as Response);

      const result = await service.checkTaskStatus(taskWithTarget, 'test-trace');

      expect(result).toEqual(mockStatusResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://health.example.com/agent/tasks/test-task-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'ART-Framework-A2A/1.0.0',
            'X-Trace-ID': 'test-trace'
          })
        })
      );
    });

    it('should return null when task has no target agent', async () => {
      const result = await service.checkTaskStatus(mockA2ATask, 'test-trace');

      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return null when remote task not found', async () => {
      const taskWithTarget: A2ATask = {
        ...mockA2ATask,
        targetAgent: mockTargetAgent
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await service.checkTaskStatus(taskWithTarget, 'test-trace');

      expect(result).toBeNull();
    });
  });

  describe('updateTaskFromRemoteStatus', () => {
    it('should update task with completed status and result', async () => {
      const statusResponse: TaskStatusResponse = {
        taskId: 'test-task-123',
        status: A2ATaskStatus.COMPLETED,
        result: {
          success: true,
          data: { analysis: 'complete' },
          durationMs: 5000
        }
      };

      vi.mocked(mockTaskRepository.updateTask).mockResolvedValueOnce();

      const result = await service.updateTaskFromRemoteStatus(
        mockA2ATask,
        statusResponse,
        'test-trace'
      );

      expect(result.status).toBe(A2ATaskStatus.COMPLETED);
      expect(result.result).toEqual(statusResponse.result);
      expect(mockTaskRepository.updateTask).toHaveBeenCalledWith(
        'test-task-123',
        expect.objectContaining({
          status: A2ATaskStatus.COMPLETED,
          result: statusResponse.result,
          metadata: expect.objectContaining({
            completedAt: expect.any(Number)
          })
        })
      );
    });

    it('should update task with failed status and error', async () => {
      const statusResponse: TaskStatusResponse = {
        taskId: 'test-task-123',
        status: A2ATaskStatus.FAILED,
        error: 'Processing failed due to invalid input'
      };

      vi.mocked(mockTaskRepository.updateTask).mockResolvedValueOnce();

      const result = await service.updateTaskFromRemoteStatus(
        mockA2ATask,
        statusResponse,
        'test-trace'
      );

      expect(result.status).toBe(A2ATaskStatus.FAILED);
      expect(result.result?.success).toBe(false);
      expect(result.result?.error).toBe('Processing failed due to invalid input');
      expect(mockTaskRepository.updateTask).toHaveBeenCalledWith(
        'test-task-123',
        expect.objectContaining({
          status: A2ATaskStatus.FAILED,
          result: expect.objectContaining({
            success: false,
            error: 'Processing failed due to invalid input'
          })
        })
      );
    });
  });

  describe('cancelTask', () => {
    it('should successfully cancel a task', async () => {
      const taskWithTarget: A2ATask = {
        ...mockA2ATask,
        targetAgent: mockTargetAgent
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true
      } as Response);

      vi.mocked(mockTaskRepository.updateTask).mockResolvedValueOnce();

      const result = await service.cancelTask(taskWithTarget, 'test-trace');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://health.example.com/agent/tasks/test-task-123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
      expect(mockTaskRepository.updateTask).toHaveBeenCalledWith(
        'test-task-123',
        expect.objectContaining({
          status: A2ATaskStatus.CANCELLED
        })
      );
    });

    it('should return false when task has no target agent', async () => {
      const result = await service.cancelTask(mockA2ATask, 'test-trace');

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return false when cancellation fails', async () => {
      const taskWithTarget: A2ATask = {
        ...mockA2ATask,
        targetAgent: mockTargetAgent
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await service.cancelTask(taskWithTarget, 'test-trace');

      expect(result).toBe(false);
    });
  });
}); 