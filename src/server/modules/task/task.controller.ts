import type { NextResponse } from 'next/server';
import { ApiResponse } from '@/server/core/api-response';
import type { AuthenticatedUser } from '@/server/modules/auth/auth.types';
import type { TaskService, UpdateTaskPatch } from './services/task.service';
import type { WeekService } from './services/week.service';
import type { PaginatedTasks } from './task.repository.types';
import type {
  CreateTaskBody,
  ListTasksQuery,
  SearchQuery,
  UpdateStatusBody,
  UpdateTaskBody,
  WeeksQuery,
} from './task.validator';
import type { TaskPriority, TaskStatus } from '@/types';

export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly weekService: WeekService,
  ) {
    this.list = this.list.bind(this);
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
    this.changeStatus = this.changeStatus.bind(this);
    this.search = this.search.bind(this);
    this.weeks = this.weeks.bind(this);
  }

  public async list(user: AuthenticatedUser, query: ListTasksQuery): Promise<NextResponse> {
    const result = await this.taskService.listTasks(
      user.id,
      {
        ...(query.weekStart ? { weekStart: new Date(query.weekStart) } : {}),
        ...(query.date ? { date: new Date(query.date) } : {}),
        ...(!query.weekStart && !query.date ? { weekStart: new Date() } : {}),
        ...(query.status ? { status: query.status as TaskStatus } : {}),
        ...(query.priority ? { priority: query.priority as TaskPriority } : {}),
      },
      { limit: query.limit, cursor: query.cursor ?? null },
    );

    return this.paginated(result);
  }

  public async create(user: AuthenticatedUser, body: CreateTaskBody): Promise<NextResponse> {
    const task = await this.taskService.createTask(user.id, {
      title: body.title,
      description: body.description ?? null,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      priority: (body.priority ?? null) as TaskPriority | null,
    });

    return ApiResponse.created(task);
  }

  public async get(user: AuthenticatedUser, taskId: string): Promise<NextResponse> {
    return ApiResponse.ok(await this.taskService.getTask(user.id, taskId));
  }

  public async update(
    user: AuthenticatedUser,
    taskId: string,
    body: UpdateTaskBody,
  ): Promise<NextResponse> {
    return ApiResponse.ok(await this.taskService.updateTask(user.id, taskId, this.toPatch(body)));
  }

  public async changeStatus(
    user: AuthenticatedUser,
    taskId: string,
    body: UpdateStatusBody,
  ): Promise<NextResponse> {
    const task = await this.taskService.changeStatus(user.id, taskId, body.status as TaskStatus);

    return ApiResponse.ok(task);
  }

  public async remove(user: AuthenticatedUser, taskId: string): Promise<NextResponse> {
    await this.taskService.deleteTask(user.id, taskId);

    return ApiResponse.ok(null, { message: 'Task deleted' });
  }

  public async search(user: AuthenticatedUser, query: SearchQuery): Promise<NextResponse> {
    const result = await this.taskService.searchTasks(user.id, query.q, {
      limit: query.limit,
      cursor: query.cursor ?? null,
    });

    return this.paginated(result);
  }

  public async weeks(user: AuthenticatedUser, query: WeeksQuery): Promise<NextResponse> {
    const summaries = await this.weekService.listWeekSummaries(user.id, {
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {}),
      limit: query.limit,
    });

    return ApiResponse.ok(summaries);
  }

  private paginated(result: PaginatedTasks): NextResponse {
    return ApiResponse.ok(result.tasks, {
      meta: ApiResponse.meta({
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      }),
    });
  }

  private toPatch(body: UpdateTaskBody): UpdateTaskPatch {
    const patch: Record<string, unknown> = {};

    if (Object.hasOwn(body, 'title')) patch.title = body.title;
    if (Object.hasOwn(body, 'description')) patch.description = body.description ?? null;
    if (Object.hasOwn(body, 'startAt')) patch.startAt = new Date(body.startAt as string);
    if (Object.hasOwn(body, 'endAt')) patch.endAt = body.endAt ? new Date(body.endAt) : null;
    if (Object.hasOwn(body, 'priority')) patch.priority = body.priority ?? null;

    return patch as UpdateTaskPatch;
  }
}
