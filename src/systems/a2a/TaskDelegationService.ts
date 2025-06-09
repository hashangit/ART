// src/systems/a2a/TaskDelegationService.ts

import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors';
import { A2ATask, A2ATaskStatus, A2AAgentInfo, A2ATaskResult, UpdateA2ATaskRequest } from '../../types';
import { IA2ATaskRepository } from '../../core/interfaces';
import { AgentDiscoveryService } from './AgentDiscoveryService';

/**
 * Configuration options for the TaskDelegationService
 */
export interface TaskDelegationConfig {
  /** Default timeout for task delegation requests in milliseconds */
  defaultTimeoutMs?: number;
  /** Maximum number of retry attempts for failed requests */
  maxRetries?: number;
  /** Base delay between retry attempts in milliseconds */
  retryDelayMs?: number;
  /** Whether to use exponential backoff for retries */
  useExponentialBackoff?: boolean;
}

/**
 * Response structure for A2A task submission according to A2A protocol
 */
export interface TaskSubmissionResponse {
  /** Whether the task was successfully submitted */
  success: boolean;
  /** The unique task ID assigned by the remote agent */
  taskId: string;
  /** Current status of the submitted task */
  status: A2ATaskStatus;
  /** Optional message from the remote agent */
  message?: string;
  /** Estimated completion time in milliseconds (if provided) */
  estimatedCompletionMs?: number;
  /** Additional metadata from the remote agent */
  metadata?: Record<string, any>;
}

/**
 * Response structure for A2A task status queries
 */
export interface TaskStatusResponse {
  /** The task ID */
  taskId: string;
  /** Current status of the task */
  status: A2ATaskStatus;
  /** Progress percentage (0-100) if available */
  progress?: number;
  /** Task result if completed */
  result?: A2ATaskResult;
  /** Error information if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Service responsible for delegating A2A tasks to remote agents.
 * Implements the A2A protocol for task submission, tracking, and completion.
 * 
 * This service handles:
 * - Finding suitable agents for specific task types
 * - Submitting tasks to remote agents via HTTP API
 * - Tracking task status and handling updates
 * - Managing task lifecycle according to A2A protocol
 * - Error handling and retry logic
 * - Integration with local task repository for persistence
 */
export class TaskDelegationService {
  private readonly config: Required<TaskDelegationConfig>;
  private readonly discoveryService: AgentDiscoveryService;
  private readonly taskRepository: IA2ATaskRepository;

  constructor(
    discoveryService: AgentDiscoveryService,
    taskRepository: IA2ATaskRepository,
    config: TaskDelegationConfig = {}
  ) {
    this.discoveryService = discoveryService;
    this.taskRepository = taskRepository;
    
    // Set default configuration
    this.config = {
      defaultTimeoutMs: config.defaultTimeoutMs ?? 30000, // 30 seconds
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000, // 1 second
      useExponentialBackoff: config.useExponentialBackoff ?? true
    };

    Logger.debug('TaskDelegationService initialized with config:', this.config);
  }

  /**
   * Delegates a list of A2A tasks to suitable remote agents.
   * For each task, finds the best agent and submits the task.
   * 
   * @param tasks - Array of A2A tasks to delegate
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to array of successfully delegated tasks
   */
  async delegateTasks(tasks: A2ATask[], traceId?: string): Promise<A2ATask[]> {
    if (tasks.length === 0) {
      Logger.debug(`[${traceId}] No tasks to delegate`);
      return [];
    }

    Logger.info(`[${traceId}] Starting delegation of ${tasks.length} A2A task(s)`);
    const delegatedTasks: A2ATask[] = [];

    for (const task of tasks) {
      try {
        const delegatedTask = await this.delegateTask(task, traceId);
        if (delegatedTask) {
          delegatedTasks.push(delegatedTask);
        }
      } catch (error: any) {
        Logger.error(`[${traceId}] Failed to delegate task ${task.taskId}:`, error);
        // Continue with other tasks even if one fails
      }
    }

    Logger.info(`[${traceId}] Successfully delegated ${delegatedTasks.length}/${tasks.length} task(s)`);
    return delegatedTasks;
  }

  /**
   * Delegates a single A2A task to a suitable remote agent.
   * 
   * @param task - The A2A task to delegate
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to the updated task or null if delegation failed
   */
  async delegateTask(task: A2ATask, traceId?: string): Promise<A2ATask | null> {
    Logger.debug(`[${traceId}] Delegating task ${task.taskId} of type "${task.payload.taskType}"`);

    try {
      // Step 1: Find suitable agent for the task
      const targetAgent = await this.discoveryService.findAgentForTask(
        task.payload.taskType, 
        traceId
      );

      if (!targetAgent) {
        Logger.warn(`[${traceId}] No suitable agent found for task ${task.taskId} (type: ${task.payload.taskType})`);
        return null;
      }

      Logger.debug(`[${traceId}] Selected agent "${targetAgent.agentName}" for task ${task.taskId}`);

      // Step 2: Submit task to the remote agent
      const submissionResponse = await this.submitTaskToAgent(task, targetAgent, traceId);

      // Step 3: Update local task with delegation information
      const now = Date.now();
      const updatedTask: A2ATask = {
        ...task,
        status: submissionResponse.status,
        targetAgent: targetAgent,
        metadata: {
          ...task.metadata,
          updatedAt: now,
          startedAt: submissionResponse.status === A2ATaskStatus.IN_PROGRESS ? now : task.metadata.startedAt,
          tags: [...(task.metadata.tags || []), 'delegated'],
          delegatedAt: now,
          estimatedCompletionMs: submissionResponse.estimatedCompletionMs
        }
      };

      // Step 4: Persist the updated task
      await this.taskRepository.createTask(updatedTask);
      
      Logger.info(`[${traceId}] Successfully delegated task ${task.taskId} to agent "${targetAgent.agentName}" (status: ${submissionResponse.status})`);
      return updatedTask;

    } catch (error: any) {
      Logger.error(`[${traceId}] Task delegation failed for ${task.taskId}:`, error);
      
      // Update task status to failed and persist
      try {
        await this.taskRepository.updateTask(task.taskId, {
          status: A2ATaskStatus.FAILED,
          metadata: {
            ...task.metadata,
            updatedAt: Date.now(),
            completedAt: Date.now(),
            tags: [...(task.metadata.tags || []), 'delegation_failed']
          },
          result: {
            success: false,
            error: `Delegation failed: ${error.message}`,
            metadata: { errorType: 'delegation_error', timestamp: Date.now() }
          }
        });
      } catch (persistError: any) {
        Logger.error(`[${traceId}] Failed to persist task failure for ${task.taskId}:`, persistError);
      }

      throw new ARTError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to delegate task ${task.taskId}: ${error.message}`,
        { taskId: task.taskId, targetAgent: error.targetAgent }
      );
    }
  }

  /**
   * Submits a task to a specific remote agent using A2A protocol.
   * 
   * @param task - The A2A task to submit
   * @param targetAgent - The target agent to submit the task to
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to the submission response
   */
  private async submitTaskToAgent(
    task: A2ATask, 
    targetAgent: A2AAgentInfo, 
    traceId?: string
  ): Promise<TaskSubmissionResponse> {
    if (!targetAgent.endpoint) {
      throw new ARTError(
        ErrorCode.UNKNOWN_ERROR,
        `Target agent "${targetAgent.agentName}" has no endpoint configured`,
        { agentId: targetAgent.agentId }
      );
    }

    const taskSubmissionUrl = `${targetAgent.endpoint.replace(/\/$/, '')}/tasks`;
    
    // Prepare the task submission payload according to A2A protocol
    const submissionPayload = {
      taskId: task.taskId,
      taskType: task.payload.taskType,
      input: task.payload.input,
      instructions: task.payload.instructions,
      parameters: task.payload.parameters,
      priority: task.priority,
      sourceAgent: task.sourceAgent,
      timeoutMs: task.metadata.timeoutMs,
      maxRetries: task.metadata.maxRetries,
      callbackUrl: this.generateCallbackUrl(task.taskId), // For webhook notifications
      metadata: {
        traceId: traceId,
        submittedAt: Date.now(),
        sourceTimestamp: task.metadata.createdAt
      }
    };

    Logger.debug(`[${traceId}] Submitting task ${task.taskId} to ${taskSubmissionUrl}`);

    let lastError: Error;
    let attempt = 0;

    // Retry loop with exponential backoff
    while (attempt <= this.config.maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.defaultTimeoutMs);

        const response = await fetch(taskSubmissionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ART-Framework-A2A/1.0.0',
            'X-Trace-ID': traceId || '',
            ...(targetAgent.authentication?.type === 'bearer' && targetAgent.authentication.token 
              ? { 'Authorization': `Bearer ${targetAgent.authentication.token}` }
              : {}),
            ...(targetAgent.authentication?.type === 'api_key' && targetAgent.authentication.apiKey 
              ? { 'X-API-Key': targetAgent.authentication.apiKey }
              : {})
          },
          body: JSON.stringify(submissionPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData: TaskSubmissionResponse = await response.json();
        
        // Validate the response structure
        if (!responseData.taskId || !responseData.status) {
          throw new Error('Invalid response format from remote agent');
        }

        Logger.debug(`[${traceId}] Task ${task.taskId} submitted successfully to "${targetAgent.agentName}" (remote task ID: ${responseData.taskId})`);
        return responseData;

      } catch (error: any) {
        lastError = error;
        attempt++;

        if (error.name === 'AbortError') {
          Logger.warn(`[${traceId}] Task submission timed out for ${task.taskId} (attempt ${attempt}/${this.config.maxRetries + 1})`);
        } else {
          Logger.warn(`[${traceId}] Task submission failed for ${task.taskId} (attempt ${attempt}/${this.config.maxRetries + 1}):`, error.message);
        }

        // Don't retry if we've exhausted attempts
        if (attempt > this.config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.config.useExponentialBackoff 
          ? this.config.retryDelayMs * Math.pow(2, attempt - 1)
          : this.config.retryDelayMs;

        Logger.debug(`[${traceId}] Retrying task submission in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new ARTError(
      ErrorCode.UNKNOWN_ERROR,
      `Failed to submit task ${task.taskId} to agent "${targetAgent.agentName}" after ${this.config.maxRetries + 1} attempts: ${lastError.message}`,
      { taskId: task.taskId, targetAgent: targetAgent.agentId, lastError: lastError.message }
    );
  }

  /**
   * Checks the status of a delegated task from the remote agent.
   * 
   * @param task - The A2A task to check status for
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to the current task status
   */
  async checkTaskStatus(task: A2ATask, traceId?: string): Promise<TaskStatusResponse | null> {
    if (!task.targetAgent?.endpoint) {
      Logger.warn(`[${traceId}] Cannot check status for task ${task.taskId}: no target agent endpoint`);
      return null;
    }

    const statusUrl = `${task.targetAgent.endpoint.replace(/\/$/, '')}/tasks/${task.taskId}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.defaultTimeoutMs);

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'ART-Framework-A2A/1.0.0',
          'X-Trace-ID': traceId || '',
          ...(task.targetAgent.authentication?.type === 'bearer' && task.targetAgent.authentication.token 
            ? { 'Authorization': `Bearer ${task.targetAgent.authentication.token}` }
            : {}),
          ...(task.targetAgent.authentication?.type === 'api_key' && task.targetAgent.authentication.apiKey 
            ? { 'X-API-Key': task.targetAgent.authentication.apiKey }
            : {})
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          Logger.warn(`[${traceId}] Task ${task.taskId} not found on remote agent`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const statusData: TaskStatusResponse = await response.json();
      Logger.debug(`[${traceId}] Task ${task.taskId} status: ${statusData.status}`);
      
      return statusData;

    } catch (error: any) {
      Logger.error(`[${traceId}] Failed to check status for task ${task.taskId}:`, error);
      return null;
    }
  }

  /**
   * Updates a local A2A task based on remote status information.
   * 
   * @param task - The local A2A task to update
   * @param statusResponse - The status response from the remote agent
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to the updated task
   */
  async updateTaskFromRemoteStatus(
    task: A2ATask, 
    statusResponse: TaskStatusResponse, 
    traceId?: string
  ): Promise<A2ATask> {
    const now = Date.now();
    const updates: Partial<A2ATask> = {
      status: statusResponse.status,
      metadata: {
        ...task.metadata,
        updatedAt: now
      }
    };

    // Handle completion
    if (statusResponse.status === A2ATaskStatus.COMPLETED && statusResponse.result) {
      updates.result = statusResponse.result;
      updates.metadata!.completedAt = now;
    }

    // Handle failure
    if (statusResponse.status === A2ATaskStatus.FAILED && statusResponse.error) {
      updates.result = {
        success: false,
        error: statusResponse.error,
        metadata: { remoteError: true, timestamp: now }
      };
      updates.metadata!.completedAt = now;
    }

    // Update additional metadata
    if (statusResponse.metadata) {
      updates.metadata = {
        ...updates.metadata,
        ...statusResponse.metadata
      };
    }

    await this.taskRepository.updateTask(task.taskId, updates);
    
    Logger.debug(`[${traceId}] Updated task ${task.taskId} with remote status: ${statusResponse.status}`);
    return { ...task, ...updates };
  }

  /**
   * Generates a callback URL for webhook notifications.
   * This would typically point to an endpoint in the local system.
   * 
   * @param taskId - The task ID to generate callback URL for
   * @returns The callback URL string
   */
  private generateCallbackUrl(taskId: string): string {
    // In a real implementation, this would be configurable
    // For now, return a placeholder URL
    return `http://localhost:3000/api/a2a/callback/${taskId}`;
  }

  /**
   * Cancels a delegated task on the remote agent.
   * 
   * @param task - The A2A task to cancel
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to whether cancellation was successful
   */
  async cancelTask(task: A2ATask, traceId?: string): Promise<boolean> {
    if (!task.targetAgent?.endpoint) {
      Logger.warn(`[${traceId}] Cannot cancel task ${task.taskId}: no target agent endpoint`);
      return false;
    }

    const cancelUrl = `${task.targetAgent.endpoint.replace(/\/$/, '')}/tasks/${task.taskId}`;
    
    try {
      const response = await fetch(cancelUrl, {
        method: 'DELETE',
        headers: {
          'User-Agent': 'ART-Framework-A2A/1.0.0',
          'X-Trace-ID': traceId || '',
          ...(task.targetAgent.authentication?.type === 'bearer' && task.targetAgent.authentication.token 
            ? { 'Authorization': `Bearer ${task.targetAgent.authentication.token}` }
            : {}),
          ...(task.targetAgent.authentication?.type === 'api_key' && task.targetAgent.authentication.apiKey 
            ? { 'X-API-Key': task.targetAgent.authentication.apiKey }
            : {})
        }
      });

      if (response.ok) {
        // Update local task status
        await this.taskRepository.updateTask(task.taskId, {
          status: A2ATaskStatus.CANCELLED,
          metadata: {
            ...task.metadata,
            updatedAt: Date.now(),
            completedAt: Date.now()
          }
        });

        Logger.info(`[${traceId}] Successfully cancelled task ${task.taskId}`);
        return true;
      } else {
        Logger.warn(`[${traceId}] Failed to cancel task ${task.taskId}: HTTP ${response.status}`);
        return false;
      }

    } catch (error: any) {
      Logger.error(`[${traceId}] Error cancelling task ${task.taskId}:`, error);
      return false;
    }
  }
} 