import { TypedSocket } from './typed-socket';
import { A2ATask, A2ATaskStatus, A2ATaskPriority } from '@/types';
import { Logger } from '@/utils/logger';
import { IA2ATaskRepository } from '@/core/interfaces';

/**
 * Filter type for A2A task notifications.
 * Allows filtering by task status, task type, agent, or priority.
 */
export interface A2ATaskFilter {
  /** Filter by task status (single status or array of statuses) */
  status?: A2ATaskStatus | A2ATaskStatus[];
  /** Filter by task type (e.g., 'analyze', 'synthesize', 'transform') */
  taskType?: string | string[];
  /** Filter by source agent ID */
  sourceAgentId?: string;
  /** Filter by target agent ID */
  targetAgentId?: string;
  /** Filter by task priority */
  priority?: A2ATaskPriority | string;
  /** Filter by thread ID */
  threadId?: string;
}

/**
 * Event data structure for A2A task updates.
 * Contains the updated task and metadata about the change.
 */
export interface A2ATaskEvent {
  /** The A2A task that was updated */
  task: A2ATask;
  /** The type of event that occurred */
  eventType: 'created' | 'updated' | 'completed' | 'failed' | 'cancelled' | 'status_changed' | 'delegated';
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Previous status (if applicable) for status change events */
  previousStatus?: A2ATaskStatus;
  /** Additional metadata about the event */
  metadata?: {
    /** Whether this was an automatic update or manual */
    automatic?: boolean;
    /** The component that triggered the update */
    source?: string;
    /** Any additional context */
    context?: Record<string, any>;
  };
}

/**
 * A specialized TypedSocket for handling A2A task status updates and events.
 * Allows filtering by task status, type, agent, and other criteria.
 * Can optionally fetch historical task data from a repository.
 */
export class A2ATaskSocket extends TypedSocket<A2ATaskEvent, A2ATaskFilter> {
  private taskRepository?: IA2ATaskRepository;

  constructor(taskRepository?: IA2ATaskRepository) {
    super();
    this.taskRepository = taskRepository;
    Logger.debug('A2ATaskSocket initialized.');
  }

  /**
   * Notifies subscribers about a new A2A task event.
   * @param event - The A2A task event data.
   */
  notifyTaskEvent(event: A2ATaskEvent): void {
    Logger.debug(`Notifying A2A Task Event: ${event.task.taskId} (${event.eventType}) status: ${event.task.status}`);
    
    super.notify(
      event,
      { 
        targetThreadId: event.task.metadata.correlationId, // Use correlationId as threadId if available
        targetSessionId: event.task.sourceAgent.agentId 
      },
      (data, filter) => this.matchesFilter(data, filter)
    );
  }

  /**
   * Convenience method to notify about a task creation.
   * @param task - The newly created A2A task.
   * @param metadata - Optional additional metadata about the creation.
   */
  notifyTaskCreated(task: A2ATask, metadata?: A2ATaskEvent['metadata']): void {
    this.notifyTaskEvent({
      task,
      eventType: 'created',
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * Convenience method to notify about a task update.
   * @param task - The updated A2A task.
   * @param previousStatus - The previous status of the task (if status changed).
   * @param metadata - Optional additional metadata about the update.
   */
  notifyTaskUpdated(task: A2ATask, previousStatus?: A2ATaskStatus, metadata?: A2ATaskEvent['metadata']): void {
    // Determine the specific event type based on the status
    let eventType: A2ATaskEvent['eventType'] = 'updated';
    
    if (previousStatus && previousStatus !== task.status) {
      eventType = 'status_changed';
      if (task.status === A2ATaskStatus.COMPLETED) {
        eventType = 'completed';
      } else if (task.status === A2ATaskStatus.FAILED) {
        eventType = 'failed';
      } else if (task.status === A2ATaskStatus.CANCELLED) {
        eventType = 'cancelled';
      } else if (task.targetAgent && previousStatus === A2ATaskStatus.PENDING) {
        eventType = 'delegated';
      }
    }

    this.notifyTaskEvent({
      task,
      eventType,
      timestamp: Date.now(),
      previousStatus,
      metadata
    });
  }

  /**
   * Convenience method to notify about task delegation.
   * @param task - The delegated A2A task.
   * @param metadata - Optional additional metadata about the delegation.
   */
  notifyTaskDelegated(task: A2ATask, metadata?: A2ATaskEvent['metadata']): void {
    this.notifyTaskEvent({
      task,
      eventType: 'delegated',
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * Convenience method to notify about task completion.
   * @param task - The completed A2A task.
   * @param metadata - Optional additional metadata about the completion.
   */
  notifyTaskCompleted(task: A2ATask, metadata?: A2ATaskEvent['metadata']): void {
    this.notifyTaskEvent({
      task,
      eventType: 'completed',
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * Convenience method to notify about task failure.
   * @param task - The failed A2A task.
   * @param metadata - Optional additional metadata about the failure.
   */
  notifyTaskFailed(task: A2ATask, metadata?: A2ATaskEvent['metadata']): void {
    this.notifyTaskEvent({
      task,
      eventType: 'failed',
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * Retrieves historical A2A task events, optionally filtered by criteria.
   * Note: This method constructs events from stored tasks, not from a dedicated event log.
   * @param filter - Optional A2ATaskFilter to filter the tasks.
   * @param options - Optional threadId and limit.
   * @returns A promise resolving to an array of A2A task events.
   */
  async getHistory(
    filter?: A2ATaskFilter,
    options?: { threadId?: string; limit?: number }
  ): Promise<A2ATaskEvent[]> {
    if (!this.taskRepository) {
      Logger.warn('Cannot getHistory for A2ATaskSocket: IA2ATaskRepository not configured.');
      return [];
    }

    Logger.debug(`Getting history for A2ATaskSocket: Thread ${options?.threadId}, Filter: ${JSON.stringify(filter)}, Limit: ${options?.limit}`);

    try {
      let tasks: A2ATask[] = [];

      // Fetch tasks based on available filters
      if (options?.threadId) {
        // If threadId is specified, get tasks by thread (assuming threadId maps to correlationId)
        tasks = await this.taskRepository.getTasksByThread(options.threadId);
      } else if (filter?.status) {
        // If status filter is specified, get tasks by status
        tasks = await this.taskRepository.getTasksByStatus(filter.status, {
          limit: options?.limit
        });
      } else {
        // Fallback: get tasks by status (all non-cancelled tasks)
        tasks = await this.taskRepository.getTasksByStatus([
          A2ATaskStatus.PENDING,
          A2ATaskStatus.IN_PROGRESS,
          A2ATaskStatus.COMPLETED,
          A2ATaskStatus.FAILED,
          A2ATaskStatus.WAITING,
          A2ATaskStatus.REVIEW
        ], { limit: options?.limit });
      }

      // Convert tasks to events and apply client-side filtering
      let events: A2ATaskEvent[] = tasks
        .map(task => this.taskToEvent(task))
        .filter(event => this.matchesFilter(event, filter));

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit if specified and not already applied at repository level
      if (options?.limit && (!filter?.status || options.threadId)) {
        events = events.slice(0, options.limit);
      }

      return events;
    } catch (error) {
      Logger.error(`Error fetching A2A task history:`, error);
      return [];
    }
  }

  /**
   * Converts an A2ATask to an A2ATaskEvent for historical data.
   * @param task - The A2ATask to convert.
   * @returns An A2ATaskEvent representing the current state of the task.
   */
  private taskToEvent(task: A2ATask): A2ATaskEvent {
    // Determine event type based on current task status
    let eventType: A2ATaskEvent['eventType'] = 'updated';
    
    if (task.status === A2ATaskStatus.COMPLETED) {
      eventType = 'completed';
    } else if (task.status === A2ATaskStatus.FAILED) {
      eventType = 'failed';
    } else if (task.status === A2ATaskStatus.CANCELLED) {
      eventType = 'cancelled';
    } else if (task.targetAgent) {
      eventType = 'delegated';
    } else if (task.metadata.createdAt === task.metadata.updatedAt) {
      eventType = 'created';
    }

    return {
      task,
      eventType,
      timestamp: task.metadata.updatedAt || task.metadata.createdAt,
      metadata: {
        automatic: true,
        source: 'history',
        context: {
          taskType: task.payload.taskType,
          priority: task.priority,
          hasTargetAgent: !!task.targetAgent
        }
      }
    };
  }

  /**
   * Checks if an A2A task event matches the specified filter criteria.
   * @param event - The A2A task event to check.
   * @param filter - The filter criteria (optional).
   * @returns True if the event matches the filter, false otherwise.
   */
  private matchesFilter(event: A2ATaskEvent, filter?: A2ATaskFilter): boolean {
    if (!filter) return true;

    const task = event.task;

    // Filter by status
    if (filter.status) {
      const statusArray = Array.isArray(filter.status) ? filter.status : [filter.status];
      if (!statusArray.includes(task.status)) {
        return false;
      }
    }

    // Filter by task type
    if (filter.taskType) {
      const taskTypeArray = Array.isArray(filter.taskType) ? filter.taskType : [filter.taskType];
      if (!taskTypeArray.includes(task.payload.taskType)) {
        return false;
      }
    }

    // Filter by source agent ID
    if (filter.sourceAgentId && task.sourceAgent.agentId !== filter.sourceAgentId) {
      return false;
    }

    // Filter by target agent ID
    if (filter.targetAgentId) {
      if (!task.targetAgent || task.targetAgent.agentId !== filter.targetAgentId) {
        return false;
      }
    }

    // Filter by priority
    if (filter.priority && task.priority !== filter.priority) {
      return false;
    }

    // Filter by thread ID (using correlationId as threadId)
    if (filter.threadId && task.metadata.correlationId !== filter.threadId) {
      return false;
    }

    return true;
  }
} 