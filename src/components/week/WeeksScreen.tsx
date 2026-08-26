'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTasks } from '@/client/queries/use-tasks';
import { useWeekSummaries } from '@/client/queries/use-week-summaries';
import { IconButton } from '@/components/ui/IconButton';
import { BackIcon } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TaskActionDialogs } from '@/components/task/TaskActionDialogs';
import { useTaskActions } from '@/components/task/useTaskActions';
import { WeekCard } from './WeekCard';

export function WeeksScreen({ isGuest }: { isGuest: boolean }) {
  const [collapsedAll, setCollapsedAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const weeks = useWeekSummaries({ limit: 12 });
  const summaries = weeks.data ?? [];
  const firstWeekKey = summaries[0]?.weekStart.slice(0, 10) ?? null;
  const expandedKey = collapsedAll ? expanded : (expanded ?? firstWeekKey);

  const expandedTasks = useTasks(expandedKey ? { weekStart: expandedKey } : { limit: 1 });
  const actions = useTaskActions({ isGuest, defaultDate: new Date() });

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
      ) : summaries.length === 0 ? (
        <EmptyState title="No weeks yet" description="Create a task to see it grouped here." />
      ) : (
        <ul className="flex flex-col gap-3 px-6">
          {summaries.map((summary) => {
            const key = summary.weekStart.slice(0, 10);
            const isExpanded = expandedKey === key;

            return (
              <WeekCard
                key={summary.weekStart}
                summary={summary}
                expanded={isExpanded}
                onToggleExpand={() => {
                  setCollapsedAll(isExpanded);
                  setExpanded(isExpanded ? null : key);
                }}
                tasks={isExpanded ? (expandedTasks.data?.items ?? []) : []}
                loadingTasks={isExpanded && expandedTasks.isPending}
                onToggleTask={actions.toggle}
                onEditTask={actions.requestEdit}
                onDeleteTask={actions.requestDelete}
              />
            );
          })}
        </ul>
      )}

      <TaskActionDialogs actions={actions} />
    </div>
  );
}
