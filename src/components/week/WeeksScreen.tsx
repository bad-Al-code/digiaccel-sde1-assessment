'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTasks } from '@/client/queries/use-tasks';
import { useWeekSummaries } from '@/client/queries/use-week-summaries';
import { useDeleteTask, useToggleTaskStatus } from '@/client/queries/use-task-mutations';
import { localWeekRange } from '@/lib/local-date';
import { IconButton } from '@/components/ui/IconButton';
import { BackIcon } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TaskStatus } from '@/types';
import { WeekCard } from './WeekCard';

export function WeeksScreen() {
  const currentWeek = localWeekRange(new Date().toISOString().slice(0, 10)).from.slice(0, 10);
  const [expanded, setExpanded] = useState<string | null>(currentWeek);

  const weeks = useWeekSummaries({ limit: 12 });
  const expandedTasks = useTasks({ weekStart: expanded ?? currentWeek });
  const toggleStatus = useToggleTaskStatus();
  const deleteTask = useDeleteTask();

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2 px-4">
        <Link href="/" aria-label="Back to home">
          <IconButton label="Back to home">
            <BackIcon className="size-6" />
          </IconButton>
        </Link>
        <h1 className="text-section text-ink font-semibold">All Weeks</h1>
      </div>

      {weeks.isPending ? (
        <div className="flex flex-col gap-3 px-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : weeks.isError ? (
        <ErrorState title="Could not load weeks" onRetry={() => void weeks.refetch()} />
      ) : (weeks.data ?? []).length === 0 ? (
        <EmptyState title="No weeks yet" description="Create a task to see it grouped here." />
      ) : (
        <ul className="flex flex-col gap-3 px-6">
          {(weeks.data ?? []).map((summary) => {
            const key = summary.weekStart.slice(0, 10);
            const isExpanded = expanded === key;

            return (
              <WeekCard
                key={summary.weekStart}
                summary={summary}
                expanded={isExpanded}
                onToggleExpand={() => setExpanded(isExpanded ? null : key)}
                tasks={isExpanded ? (expandedTasks.data?.items ?? []) : []}
                loadingTasks={isExpanded && expandedTasks.isPending}
                onToggleTask={(task) =>
                  toggleStatus.mutate({
                    taskId: task.id,
                    status:
                      task.status === TaskStatus.COMPLETED
                        ? TaskStatus.IN_PROGRESS
                        : TaskStatus.COMPLETED,
                  })
                }
                onDeleteTask={(task) => deleteTask.mutate(task.id)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
