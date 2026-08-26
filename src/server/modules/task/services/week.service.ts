import { addWeeks, getWeekEnd, getWeekStart } from '@/lib/week-range';
import type { WeekSummary } from '@/types';
import type { ITaskRepository } from '../task.repository.types';

const DEFAULT_WEEK_COUNT = 8;

export class WeekService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  public async getWeekSummary(ownerId: string, date: Date): Promise<WeekSummary> {
    const weekStart = getWeekStart(date);
    const counts = await this.taskRepository.countByStatus(ownerId, weekStart);
    const totalTaskCount = counts.openTaskCount + counts.completedTaskCount;

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: getWeekEnd(weekStart).toISOString(),
      openTaskCount: counts.openTaskCount,
      completedTaskCount: counts.completedTaskCount,
      totalTaskCount,
      completionPercentage: this.toPercentage(counts.completedTaskCount, totalTaskCount),
    };
  }

  public async listWeekSummaries(
    ownerId: string,
    options: { from?: Date; to?: Date; limit?: number } = {},
  ): Promise<WeekSummary[]> {
    const limit = options.limit ?? DEFAULT_WEEK_COUNT;
    const to = getWeekStart(options.to ?? new Date());
    const from = getWeekStart(options.from ?? addWeeks(to, -(limit - 1)));

    const summaries = await this.taskRepository.aggregateWeekSummaries(
      ownerId,
      { from, to },
      limit,
    );

    return this.withCurrentWeek(summaries, to);
  }

  private withCurrentWeek(summaries: WeekSummary[], currentWeekStart: Date): WeekSummary[] {
    const currentIso = currentWeekStart.toISOString();

    if (summaries.some((summary) => summary.weekStart === currentIso)) {
      return summaries;
    }

    return [this.emptySummary(currentWeekStart), ...summaries];
  }

  private emptySummary(weekStart: Date): WeekSummary {
    return {
      weekStart: weekStart.toISOString(),
      weekEnd: getWeekEnd(weekStart).toISOString(),
      openTaskCount: 0,
      completedTaskCount: 0,
      totalTaskCount: 0,
      completionPercentage: 0,
    };
  }

  private toPercentage(completed: number, total: number): number {
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }
}
