import { Types, type QueryFilter, type SortOrder } from 'mongoose';
import { getWeekEnd, getWeekStart } from '@/lib/week-range';
import { logger } from '@/server/core/logger';
import { BaseRepository } from '@/server/database/base-repository';
import { TaskModel, type TaskDocument } from '@/server/database/models/task.model';
import { TaskStatus, type Task, type WeekSummary } from '@/types';
import type {
  CreateTaskInput,
  DateRange,
  ITaskRepository,
  PaginatedTasks,
  PaginationOptions,
  StatusCounts,
  TaskListFilters,
  UpdateTaskInput,
} from './task.repository.types';

const MS_PER_DAY = 86_400_000;

interface WeekGroupRow {
  _id: Date | null;
  totalTaskCount: number;
  completedTaskCount: number;
}

export class TaskRepository extends BaseRepository<TaskDocument, Task> implements ITaskRepository {
  constructor() {
    super(TaskModel);
  }

  public async findById(ownerId: string, taskId: string): Promise<Task | null> {
    if (!this.isValidObjectId(taskId) || !this.isValidObjectId(ownerId)) {
      return null;
    }

    const document = await this.model
      .findOne({ ...this.ownerFilter(ownerId), _id: new Types.ObjectId(taskId) })
      .lean<TaskDocument | null>();

    return document ? this.toDomain(document) : null;
  }

  public async listByOwner(
    ownerId: string,
    filters: TaskListFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedTasks> {
    const base = { ...this.ownerFilter(ownerId), ...this.buildFilters(filters) };

    return this.paginate(base, pagination);
  }

  public async listByWeek(ownerId: string, weekStart: Date): Promise<Task[]> {
    const documents = await this.model
      .find({ ...this.ownerFilter(ownerId), weekStart: getWeekStart(weekStart) })
      .sort(this.sortOrder())
      .lean<TaskDocument[]>();

    return this.toDomainList(documents);
  }

  public async search(
    ownerId: string,
    term: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedTasks> {
    const pattern = new RegExp(this.escapeRegex(term), 'i');

    const base: QueryFilter<TaskDocument> = {
      ...this.ownerFilter(ownerId),
      $or: [{ title: pattern }, { description: pattern }],
    };

    return this.paginate(base, pagination);
  }

  public async create(ownerId: string, input: CreateTaskInput): Promise<Task> {
    const created = await this.model.create({
      ownerId: new Types.ObjectId(ownerId),
      title: input.title,
      description: input.description ?? null,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      priority: input.priority ?? null,
      status: TaskStatus.IN_PROGRESS,
      completedAt: null,
    });

    return this.toDomain(created.toObject<TaskDocument>());
  }

  public async update(
    ownerId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task | null> {
    if (!this.isValidObjectId(taskId) || !this.isValidObjectId(ownerId)) {
      return null;
    }

    const changes = this.buildUpdate(input);

    if (Object.keys(changes).length === 0) {
      return this.findById(ownerId, taskId);
    }

    const updated = await this.model
      .findOneAndUpdate(
        { ...this.ownerFilter(ownerId), _id: new Types.ObjectId(taskId) },
        { $set: changes },
        { new: true, runValidators: true },
      )
      .lean<TaskDocument | null>();

    return updated ? this.toDomain(updated) : null;
  }

  public async delete(ownerId: string, taskId: string): Promise<boolean> {
    if (!this.isValidObjectId(taskId) || !this.isValidObjectId(ownerId)) {
      return false;
    }

    const result = await this.model.deleteOne({
      ...this.ownerFilter(ownerId),
      _id: new Types.ObjectId(taskId),
    });

    return (result.deletedCount ?? 0) > 0;
  }

  public async reassignOwner(fromOwnerId: string, toOwnerId: string): Promise<number> {
    if (!this.isValidObjectId(fromOwnerId) || !this.isValidObjectId(toOwnerId)) {
      return 0;
    }

    const result = await this.model.updateMany(this.ownerFilter(fromOwnerId), {
      $set: { ownerId: new Types.ObjectId(toOwnerId) },
    });

    return result.modifiedCount ?? 0;
  }

  public async countByOwner(ownerId: string): Promise<number> {
    if (!this.isValidObjectId(ownerId)) {
      return 0;
    }

    return this.model.countDocuments(this.ownerFilter(ownerId));
  }

  public async countByStatus(ownerId: string, weekStart: Date): Promise<StatusCounts> {
    const rows = await this.model.aggregate<WeekGroupRow>([
      { $match: { ...this.ownerFilter(ownerId), weekStart: getWeekStart(weekStart) } },
      { $group: { _id: '$weekStart', ...this.countAccumulators() } },
    ]);

    const row = rows[0];

    if (!row) {
      return { openTaskCount: 0, completedTaskCount: 0 };
    }

    return {
      openTaskCount: row.totalTaskCount - row.completedTaskCount,
      completedTaskCount: row.completedTaskCount,
    };
  }

  public async aggregateWeekSummaries(
    ownerId: string,
    range: DateRange,
    limit: number,
  ): Promise<WeekSummary[]> {
    const rows = await this.model.aggregate<WeekGroupRow>([
      {
        $match: {
          ...this.ownerFilter(ownerId),
          weekStart: { $gte: getWeekStart(range.from), $lte: getWeekStart(range.to) },
        },
      },
      { $group: { _id: '$weekStart', ...this.countAccumulators() } },
      { $sort: { _id: -1 } },
      { $limit: limit },
    ]);

    return rows
      .filter((row) => this.hasWeekStart(row, ownerId))
      .map((row) => this.toWeekSummary(row));
  }

  protected toDomain(document: TaskDocument): Task {
    return {
      id: String(document._id),
      title: document.title,
      description: document.description ?? null,
      startAt: document.startAt.toISOString(),
      endAt: this.toIsoString(document.endAt),
      status: document.status,
      priority: document.priority ?? null,
      completedAt: this.toIsoString(document.completedAt),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  private ownerFilter(ownerId: string): QueryFilter<TaskDocument> {
    return { ownerId: new Types.ObjectId(ownerId) };
  }

  private buildFilters(filters: TaskListFilters): QueryFilter<TaskDocument> {
    const query: QueryFilter<TaskDocument> = {};

    if (filters.weekStart) {
      query.weekStart = getWeekStart(filters.weekStart);
    }

    if (filters.from && filters.to) {
      query.startAt = { $gte: filters.from, $lte: filters.to };
    }

    if (filters.date) {
      const dayStart = new Date(
        Date.UTC(
          filters.date.getUTCFullYear(),
          filters.date.getUTCMonth(),
          filters.date.getUTCDate(),
        ),
      );

      query.startAt = { $gte: dayStart, $lte: new Date(dayStart.getTime() + MS_PER_DAY - 1) };
    }

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;

    return query;
  }

  private buildUpdate(input: UpdateTaskInput): Record<string, unknown> {
    const changes: Record<string, unknown> = {};

    if (input.title !== undefined) changes.title = input.title;
    if (input.description !== undefined) changes.description = input.description;
    if (input.startAt !== undefined) changes.startAt = input.startAt;
    if (input.endAt !== undefined) changes.endAt = input.endAt;
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.status !== undefined) changes.status = input.status;
    if (input.completedAt !== undefined) changes.completedAt = input.completedAt;

    return changes;
  }

  private async paginate(
    base: QueryFilter<TaskDocument>,
    pagination: PaginationOptions,
  ): Promise<PaginatedTasks> {
    const filter = this.applyCursor(base, pagination.cursor ?? null);

    const [documents, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(this.sortOrder())
        .limit(pagination.limit + 1)
        .lean<TaskDocument[]>(),
      this.model.countDocuments(base),
    ]);

    const hasMore = documents.length > pagination.limit;
    const page = hasMore ? documents.slice(0, pagination.limit) : documents;
    const last = page.at(-1);

    return {
      tasks: this.toDomainList(page),
      total,
      hasMore,
      nextCursor: hasMore && last ? this.encodeCursor(last) : null,
    };
  }

  private applyCursor(
    base: QueryFilter<TaskDocument>,
    cursor: string | null,
  ): QueryFilter<TaskDocument> {
    const decoded = cursor ? this.decodeCursor(cursor) : null;

    if (!decoded) {
      return base;
    }

    return {
      $and: [
        base,
        {
          $or: [
            { startAt: { $gt: decoded.startAt } },
            { startAt: decoded.startAt, _id: { $gt: decoded.id } },
          ],
        },
      ],
    };
  }

  private encodeCursor(document: TaskDocument): string {
    return Buffer.from(`${document.startAt.toISOString()}|${String(document._id)}`).toString(
      'base64url',
    );
  }

  private decodeCursor(cursor: string): { startAt: Date; id: Types.ObjectId } | null {
    try {
      const [startAt, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');

      if (!startAt || !id || !this.isValidObjectId(id)) {
        return null;
      }

      const parsed = new Date(startAt);

      if (Number.isNaN(parsed.getTime())) {
        return null;
      }

      return { startAt: parsed, id: new Types.ObjectId(id) };
    } catch {
      return null;
    }
  }

  private sortOrder(): Record<string, SortOrder> {
    // Mongo guarantees no order without a sort, so results would appear to
    // shuffle between identical requests.
    return { startAt: 1, _id: 1 };
  }

  private countAccumulators() {
    return {
      totalTaskCount: { $sum: 1 },
      completedTaskCount: {
        $sum: { $cond: [{ $eq: ['$status', TaskStatus.COMPLETED] }, 1, 0] },
      },
    };
  }

  private hasWeekStart(row: WeekGroupRow, ownerId: string): boolean {
    if (row._id) {
      return true;
    }

    logger.error('Tasks found with a missing weekStart; counts would under-report', {
      ownerId,
      affectedCount: row.totalTaskCount,
    });

    return false;
  }

  private toWeekSummary(row: WeekGroupRow): WeekSummary {
    const weekStart = row._id as Date;
    const openTaskCount = row.totalTaskCount - row.completedTaskCount;

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: getWeekEnd(weekStart).toISOString(),
      openTaskCount,
      completedTaskCount: row.completedTaskCount,
      totalTaskCount: row.totalTaskCount,
      completionPercentage: this.toPercentage(row.completedTaskCount, row.totalTaskCount),
    };
  }

  private toPercentage(completed: number, total: number): number {
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
