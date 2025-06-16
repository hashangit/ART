import { IA2ATaskRepository, StorageAdapter } from '../../../core/interfaces';
import { A2ATask, A2ATaskStatus, A2ATaskPriority, ARTError, ErrorCode } from '../../../types';

// Define the structure of the data as stored, including the 'id' field (taskId)
type StoredA2ATask = A2ATask & { id: string };

/**
 * Implements the `IA2ATaskRepository` interface, providing methods to manage
 * `A2ATask` objects using an underlying `StorageAdapter`. Handles creating,
 * retrieving, updating, and deleting A2A (Agent-to-Agent) tasks, as well as
 * filtering tasks by various criteria such as thread, agent, and status.
 *
 * @implements {IA2ATaskRepository}
 */
export class TaskStatusRepository implements IA2ATaskRepository {
  private adapter: StorageAdapter;
  private readonly collectionName = 'a2a_tasks'; // Define the collection name

  /**
   * Creates an instance of TaskStatusRepository.
   * @param storageAdapter - The configured `StorageAdapter` instance used for persistence.
   */
  constructor(storageAdapter: StorageAdapter) {
    if (!storageAdapter) {
      throw new Error("TaskStatusRepository requires a valid StorageAdapter instance.");
    }
    this.adapter = storageAdapter;
    // Note: Adapter initialization (adapter.init()) should be handled externally.
  }

  /**
   * Creates a new A2A task in the repository.
   * @param task - The A2ATask object to create.
   * @returns A promise that resolves when the task is successfully stored.
   * @throws {ARTError} If the task cannot be created (e.g., duplicate taskId, validation errors).
   */
  async createTask(task: A2ATask): Promise<void> {
    if (!task || !task.taskId) {
      throw new ARTError('Task must have a valid taskId', ErrorCode.VALIDATION_ERROR);
    }

    // Check if task already exists
    const existingTask = await this.adapter.get<StoredA2ATask>(this.collectionName, task.taskId);
    if (existingTask) {
      throw new ARTError(`Task with ID '${task.taskId}' already exists`, ErrorCode.DUPLICATE_TASK_ID);
    }

    // Add the 'id' field mirroring 'taskId' for compatibility with keyPath='id' adapters
    const taskToStore: StoredA2ATask = {
      ...task,
      id: task.taskId
    };

    await this.adapter.set<StoredA2ATask>(this.collectionName, task.taskId, taskToStore);
  }

  /**
   * Retrieves an A2A task by its unique identifier.
   * @param taskId - The unique identifier of the task.
   * @returns A promise resolving to the A2ATask object if found, or null if not found.
   * @throws {ARTError} If an error occurs during retrieval.
   */
  async getTask(taskId: string): Promise<A2ATask | null> {
    if (!taskId) {
      throw new ARTError('TaskId is required', ErrorCode.VALIDATION_ERROR);
    }

    try {
      const storedTask = await this.adapter.get<StoredA2ATask>(this.collectionName, taskId);
      if (!storedTask) {
        return null;
      }

      // Remove the internal 'id' field before returning
      const task = { ...storedTask };
      delete (task as Partial<StoredA2ATask>).id;
      return task as A2ATask;
    } catch (error) {
      throw new ARTError(`Failed to retrieve task '${taskId}': ${error}`, ErrorCode.REPOSITORY_ERROR);
    }
  }

  /**
   * Updates an existing A2A task with new information.
   * @param taskId - The unique identifier of the task to update.
   * @param updates - Partial A2ATask object containing the fields to update.
   * @returns A promise that resolves when the task is successfully updated.
   * @throws {ARTError} If the task is not found or cannot be updated.
   */
  async updateTask(taskId: string, updates: Partial<A2ATask>): Promise<void> {
    if (!taskId) {
      throw new ARTError('TaskId is required', ErrorCode.VALIDATION_ERROR);
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ARTError('Updates object cannot be empty', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Get the existing task
      const existingTask = await this.adapter.get<StoredA2ATask>(this.collectionName, taskId);
      if (!existingTask) {
        throw new ARTError(`Task with ID '${taskId}' not found`, ErrorCode.TASK_NOT_FOUND);
      }

      // Merge updates with existing task
      const updatedTask: StoredA2ATask = {
        ...existingTask,
        ...updates,
        taskId, // Ensure taskId cannot be changed
        id: taskId // Ensure consistency
      };

      // Update metadata if provided
      if (updates.metadata) {
        updatedTask.metadata = {
          ...existingTask.metadata,
          ...updates.metadata,
          lastUpdated: Date.now() // Always update timestamp
        };
      }

      await this.adapter.set<StoredA2ATask>(this.collectionName, taskId, updatedTask);
    } catch (error) {
      if (error instanceof ARTError) {
        throw error;
      }
      throw new ARTError(`Failed to update task '${taskId}': ${error}`, ErrorCode.REPOSITORY_ERROR);
    }
  }

  /**
   * Removes an A2A task from the repository.
   * @param taskId - The unique identifier of the task to delete.
   * @returns A promise that resolves when the task is successfully deleted.
   * @throws {ARTError} If the task is not found or cannot be deleted.
   */
  async deleteTask(taskId: string): Promise<void> {
    if (!taskId) {
      throw new ARTError('TaskId is required', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Check if task exists
      const existingTask = await this.adapter.get<StoredA2ATask>(this.collectionName, taskId);
      if (!existingTask) {
        throw new ARTError(`Task with ID '${taskId}' not found`, ErrorCode.TASK_NOT_FOUND);
      }

      await this.adapter.delete(this.collectionName, taskId);
    } catch (error) {
      if (error instanceof ARTError) {
        throw error;
      }
      throw new ARTError(`Failed to delete task '${taskId}': ${error}`, ErrorCode.REPOSITORY_ERROR);
    }
  }

  /**
   * Retrieves tasks associated with a specific thread.
   * @param threadId - The thread identifier to filter tasks.
   * @param filter - Optional filter criteria for task status, priority, or assigned agent.
   * @returns A promise resolving to an array of A2ATask objects matching the criteria.
   */
  async getTasksByThread(
    threadId: string,
    filter?: {
      status?: A2ATaskStatus | A2ATaskStatus[];
      priority?: A2ATaskPriority;
      assignedAgentId?: string;
    }
  ): Promise<A2ATask[]> {
    if (!threadId) {
      throw new ARTError('ThreadId is required', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Query tasks for the specific thread
      const queryResults = await this.adapter.query<StoredA2ATask>(this.collectionName, {
        filter: { threadId: threadId }
      });

      // Apply additional client-side filtering
      let filteredTasks = queryResults;

      if (filter) {
        if (filter.status) {
          const statusArray = Array.isArray(filter.status) ? filter.status : [filter.status];
          filteredTasks = filteredTasks.filter(task => statusArray.includes(task.status));
        }

        if (filter.priority) {
          filteredTasks = filteredTasks.filter(task => task.priority === filter.priority);
        }

        if (filter.assignedAgentId) {
          filteredTasks = filteredTasks.filter(task => 
            task.targetAgent?.agentId === filter.assignedAgentId
          );
        }
      }

      // Sort by creation timestamp (newest first)
      filteredTasks.sort((a, b) => (b.metadata?.createdAt || 0) - (a.metadata?.createdAt || 0));

      // Remove the 'id' field from results
      return this._removeIdField(filteredTasks);
    } catch (error) {
      throw new ARTError(`Failed to get tasks for thread '${threadId}': ${error}`, ErrorCode.REPOSITORY_ERROR);
    }
  }

  /**
   * Retrieves tasks assigned to a specific agent.
   * @param agentId - The agent identifier to filter tasks.
   * @param filter - Optional filter criteria for task status or priority.
   * @returns A promise resolving to an array of A2ATask objects assigned to the agent.
   */
  async getTasksByAgent(
    agentId: string,
    filter?: {
      status?: A2ATaskStatus | A2ATaskStatus[];
      priority?: A2ATaskPriority;
    }
  ): Promise<A2ATask[]> {
    if (!agentId) {
      throw new ARTError('AgentId is required', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Query all tasks and filter client-side (storage adapters may not support nested filtering)
      const queryResults = await this.adapter.query<StoredA2ATask>(this.collectionName, {
        filter: {} // Get all tasks, then filter client-side
      });

      // Filter by assigned agent
      let filteredTasks = queryResults.filter(task => 
        task.targetAgent?.agentId === agentId
      );

      // Apply additional filters
      if (filter) {
        if (filter.status) {
          const statusArray = Array.isArray(filter.status) ? filter.status : [filter.status];
          filteredTasks = filteredTasks.filter(task => statusArray.includes(task.status));
        }

        if (filter.priority) {
          filteredTasks = filteredTasks.filter(task => task.priority === filter.priority);
        }
      }

      // Sort by creation timestamp (newest first)
      filteredTasks.sort((a, b) => (b.metadata?.createdAt || 0) - (a.metadata?.createdAt || 0));

      // Remove the 'id' field from results
      return this._removeIdField(filteredTasks);
    } catch (error) {
      throw new ARTError(`Failed to get tasks for agent '${agentId}': ${error}`, ErrorCode.REPOSITORY_ERROR);
    }
  }

  /**
   * Retrieves tasks based on their current status.
   * @param status - The task status(es) to filter by.
   * @param options - Optional query parameters like limit and pagination.
   * @returns A promise resolving to an array of A2ATask objects with the specified status.
   */
  async getTasksByStatus(
    status: A2ATaskStatus | A2ATaskStatus[],
    options?: { limit?: number; offset?: number }
  ): Promise<A2ATask[]> {
    if (!status) {
      throw new ARTError('Status is required', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Query all tasks (since we need to filter by status client-side)
      const queryResults = await this.adapter.query<StoredA2ATask>(this.collectionName, {
        filter: {} // Get all, then filter client-side
      });

      // Filter by status
      const statusArray = Array.isArray(status) ? status : [status];
      let filteredTasks = queryResults.filter(task => statusArray.includes(task.status));

      // Sort by creation timestamp (newest first)
      filteredTasks.sort((a, b) => (b.metadata?.createdAt || 0) - (a.metadata?.createdAt || 0));

      // Apply pagination
      if (options) {
        const offset = options.offset || 0;
        const limit = options.limit;
        
        if (offset > 0) {
          filteredTasks = filteredTasks.slice(offset);
        }
        
        if (limit && limit > 0) {
          filteredTasks = filteredTasks.slice(0, limit);
        }
      }

      // Remove the 'id' field from results
      return this._removeIdField(filteredTasks);
    } catch (error) {
      throw new ARTError(`Failed to get tasks by status: ${error}`, ErrorCode.REPOSITORY_ERROR);
    }
  }

  /**
   * Utility method to remove the internal 'id' field from stored tasks before returning them.
   * @param tasks - Array of StoredA2ATask objects.
   * @returns Array of A2ATask objects with 'id' field removed.
   */
  private _removeIdField(tasks: StoredA2ATask[]): A2ATask[] {
    return tasks.map(task => {
      const cleanTask = { ...task };
      delete (cleanTask as Partial<StoredA2ATask>).id;
      return cleanTask as A2ATask;
    });
  }
} 