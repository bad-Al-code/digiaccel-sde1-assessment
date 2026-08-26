import { AppError, NotFoundError } from '@/server/core/app-error';
import { HttpStatus } from '@/server/core/http-status';
import { TaskStatus, type Task, type TaskStatus as TaskStatusType } from '@/types';
import type {
  CreateTaskInput,
  IGuestQuota,
  ITaskRepository,
  PaginatedTasks,
  PaginationOptions,
  TaskListFilters,
  UpdateTaskInput,
} from '../task.repository.types';

export interface UpdateTaskPatch {
  readonly title?: string;
  readonly description?: string | null;
  readonly startAt?: Date;
  readonly endAt?: Date | null;
  readonly priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

export class TaskService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly guestQuota: IGuestQuota,
  ) {}

  public async createTask(
    ownerId: string,
    input: CreateTaskInput,
    limit?: { maxTasks: number },
  ): Promise<Task> {
    this.assertValidWindow(input.startAt, input.endAt ?? null);

    if (!limit) {
      return this.taskRepository.create(ownerId, input);
    }

    const reserved = await this.guestQuota.reserve(ownerId, limit.maxTasks);

    if (!reserved) {
      throw this.limitReached();
    }

    try {
      return await this.taskRepository.create(ownerId, input);
    } catch (error) {
      await this.guestQuota.release(ownerId);
      throw error;
    }
  }

  private limitReached(): AppError {
    return new AppError(
      'Guests can create one task. Sign up to keep going.',
      HttpStatus.FORBIDDEN,
      'GUEST_TASK_LIMIT_REACHED',
    );
  }

  public async getTask(ownerId: string, taskId: string): Promise<Task> {
    return this.getTaskOrThrow(ownerId, taskId);
  }

  public async listTasks(
    ownerId: string,
    filters: TaskListFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedTasks> {
    return this.taskRepository.listByOwner(ownerId, filters, pagination);
  }

  public async searchTasks(
    ownerId: string,
    term: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedTasks> {
    return this.taskRepository.search(ownerId, term, pagination);
  }

  public async updateTask(ownerId: string, taskId: string, patch: UpdateTaskPatch): Promise<Task> {
    const existing = await this.getTaskOrThrow(ownerId, taskId);

    const window = this.resolveUpdatedWindow(existing, patch);
    this.assertValidWindow(window.startAt, window.endAt);

    const updated = await this.taskRepository.update(ownerId, taskId, patch as UpdateTaskInput);

    if (!updated) {
      throw this.notFound();
    }

    return updated;
  }

  public async changeStatus(
    ownerId: string,
    taskId: string,
    status: TaskStatusType,
  ): Promise<Task> {
    const existing = await this.getTaskOrThrow(ownerId, taskId);

    if (existing.status === status) {
      return existing;
    }

    const updated = await this.taskRepository.update(ownerId, taskId, this.statusChange(status));

    if (!updated) {
      throw this.notFound();
    }

    return updated;
  }

  public async deleteTask(ownerId: string, taskId: string, isGuest = false): Promise<void> {
    const deleted = await this.taskRepository.delete(ownerId, taskId);

    if (!deleted) {
      throw this.notFound();
    }

    if (isGuest) {
      await this.guestQuota.release(ownerId);
    }
  }

  private async getTaskOrThrow(ownerId: string, taskId: string): Promise<Task> {
    const task = await this.taskRepository.findById(ownerId, taskId);

    if (!task) {
      throw this.notFound();
    }

    return task;
  }

  private statusChange(status: TaskStatusType): UpdateTaskInput {
    return {
      status,
      completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
    };
  }

  private resolveUpdatedWindow(
    existing: Task,
    patch: UpdateTaskPatch,
  ): { startAt: Date; endAt: Date | null } {
    const startAt = patch.startAt ?? new Date(existing.startAt);

    if (patch.endAt !== undefined) {
      return { startAt, endAt: patch.endAt };
    }

    return { startAt, endAt: existing.endAt ? new Date(existing.endAt) : null };
  }

  private assertValidWindow(startAt: Date, endAt: Date | null): void {
    if (endAt && endAt.getTime() <= startAt.getTime()) {
      throw new AppError(
        'endAt must be strictly after startAt',
        HttpStatus.BAD_REQUEST,
        'INVALID_TASK_WINDOW',
      );
    }
  }

  private notFound(): NotFoundError {
    return new NotFoundError('Task', 'TASK_NOT_FOUND');
  }
}
