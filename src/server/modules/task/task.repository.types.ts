import type { Task, TaskPriority, TaskStatus, WeekSummary } from '@/types';

export interface PaginationOptions {
  readonly limit: number;
  readonly cursor?: string | null;
}

export interface PaginatedTasks {
  readonly tasks: Task[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly nextCursor: string | null;
}

export interface TaskListFilters {
  readonly weekStart?: Date;
  readonly date?: Date;
  readonly from?: Date;
  readonly to?: Date;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
}

export interface CreateTaskInput {
  readonly title: string;
  readonly description?: string | null;
  readonly startAt: Date;
  readonly endAt?: Date | null;
  readonly priority?: TaskPriority | null;
}

export interface UpdateTaskInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly startAt?: Date;
  readonly endAt?: Date | null;
  readonly priority?: TaskPriority | null;
  readonly status?: TaskStatus;
  readonly completedAt?: Date | null;
}

export interface StatusCounts {
  readonly openTaskCount: number;
  readonly completedTaskCount: number;
}

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface ITaskRepository {
  findById(ownerId: string, taskId: string): Promise<Task | null>;

  listByOwner(
    ownerId: string,
    filters: TaskListFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedTasks>;

  listByWeek(ownerId: string, weekStart: Date): Promise<Task[]>;

  search(ownerId: string, term: string, pagination: PaginationOptions): Promise<PaginatedTasks>;

  create(ownerId: string, input: CreateTaskInput): Promise<Task>;

  update(ownerId: string, taskId: string, input: UpdateTaskInput): Promise<Task | null>;

  delete(ownerId: string, taskId: string): Promise<boolean>;

  countByOwner(ownerId: string): Promise<number>;

  countByStatus(ownerId: string, weekStart: Date): Promise<StatusCounts>;

  aggregateWeekSummaries(ownerId: string, range: DateRange, limit: number): Promise<WeekSummary[]>;
}

export interface IGuestQuota {
  reserve(ownerId: string, maxTasks: number): Promise<boolean>;
  release(ownerId: string): Promise<void>;
}
