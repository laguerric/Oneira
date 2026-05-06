import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { randomUUID } from 'crypto';
import { sharedBus } from '../shared/sharedMemoryBus';

export interface Task {
  id: string;
  type: 'analyze_dream' | 'reply_to_post' | 'search_platform' | 'aggregate_data';
  targetAgent?: string;
  platform: string;
  payload: any;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'claimed' | 'done' | 'failed';
  createdAt: string;
  claimedBy?: string;
}

export class TaskQueueService extends Service {
  static serviceType = 'task-queue';

  private tasks: Map<string, Task> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<TaskQueueService> {
    logger.info('[TaskQueue] Starting task queue service');
    const service = new TaskQueueService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    logger.info('[TaskQueue] Task queue service initialized');
  }

  addTask(
    params: Omit<Task, 'id' | 'status' | 'createdAt'>
  ): Task {
    const task: Task = {
      ...params,
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);

    sharedBus.emit({
      source: 'task-queue',
      platform: task.platform,
      type: 'task',
      payload: task,
    });

    logger.info(`[TaskQueue] Added task ${task.id} type=${task.type} priority=${task.priority}`);
    return task;
  }

  claimTask(agentName: string, taskId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn(`[TaskQueue] claimTask: task ${taskId} not found`);
      return null;
    }
    if (task.status !== 'pending') {
      logger.warn(`[TaskQueue] claimTask: task ${taskId} is not pending (status=${task.status})`);
      return null;
    }
    if (task.targetAgent && task.targetAgent !== agentName) {
      logger.warn(`[TaskQueue] claimTask: task ${taskId} is targeted at ${task.targetAgent}, not ${agentName}`);
      return null;
    }
    task.status = 'claimed';
    task.claimedBy = agentName;
    logger.info(`[TaskQueue] Task ${taskId} claimed by ${agentName}`);
    return task;
  }

  completeTask(taskId: string, result: any): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn(`[TaskQueue] completeTask: task ${taskId} not found`);
      return null;
    }
    task.status = 'done';

    sharedBus.emit({
      source: task.claimedBy ?? 'unknown',
      platform: task.platform,
      type: 'result',
      payload: { taskId, result },
    });

    logger.info(`[TaskQueue] Task ${taskId} completed`);
    return task;
  }

  failTask(taskId: string, error: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    task.status = 'failed';
    logger.error(`[TaskQueue] Task ${taskId} failed: ${error}`);
    return task;
  }

  getPendingTasks(agentName?: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (t) =>
        t.status === 'pending' &&
        (!t.targetAgent || !agentName || t.targetAgent === agentName)
    );
  }

  async stop(): Promise<void> {
    logger.info('[TaskQueue] Task queue service stopped');
  }
}
