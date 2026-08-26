'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTasks } from '@/client/queries/use-tasks';
import { useWeekSummaries } from '@/client/queries/use-week-summaries';
import { fromLocalDateKey, localDayRange, localWeekRange, toLocalDateKey } from '@/lib/local-date';
import { useLocalToday } from '@/lib/use-local-today';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TaskListSkeleton } from '@/components/ui/Skeleton';
import { SearchField } from '@/components/ui/SearchField';
import { AddTaskButton } from '@/components/task/AddTaskButton';
import { TaskList } from '@/components/task/TaskList';
import type { Task } from '@/types';
import { TaskActionDialogs } from '@/components/task/TaskActionDialogs';
import { useTaskActions } from '@/components/task/useTaskActions';
import { usePendingTaskRestore } from '@/client/guest/use-pending-task';
import { DayStrip } from './DayStrip';
import { SummaryCards } from './SummaryCards';
import { WeeklyProgress } from './WeeklyProgress';

export function HomeScreen({ initialDate, isGuest }: { initialDate: string; isGuest: boolean }) {
  const todayKey = useLocalToday(initialDate);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = selectedKey ?? todayKey;
  const selectedDate = fromLocalDateKey(activeKey);

  const day = localDayRange(activeKey);
  const week = localWeekRange(activeKey);

  const tasks = useTasks({ from: day.from, to: day.to });
  const weeks = useWeekSummaries({
    from: week.from.slice(0, 10),
    to: week.to.slice(0, 10),
    limit: 1,
  });

  const actions = useTaskActions({ isGuest, defaultDate: selectedDate });

  usePendingTaskRestore(!isGuest);

  const summary = weeks.data?.[0];

  return (
    <div className="flex flex-1 flex-col gap-7 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="px-6">
        <Link href="/search" aria-label="Search for a task">
          <SearchField readOnly tabIndex={-1} className="pointer-events-none" />
        </Link>
      </div>

      <DayStrip
        selectedDate={selectedDate}
        anchorDate={fromLocalDateKey(todayKey)}
        onSelect={(next) => setSelectedKey(toLocalDateKey(next))}
      />

      <SummaryCards
        completedCount={summary?.completedTaskCount ?? 0}
        openCount={summary?.openTaskCount ?? 0}
      />

      <WeeklyProgress percentage={summary?.completionPercentage ?? 0} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-6">
          <h2 className="text-section text-ink font-semibold">Tasks Today</h2>
          <Link
            href="/weeks"
            className="text-task text-primary hover:text-primary-strong font-medium transition-colors duration-150"
          >
            View All
          </Link>
        </div>

        <TaskBody
          isLoading={tasks.isPending && !tasks.isPlaceholderData}
          isError={tasks.isError}
          tasks={tasks.data?.items ?? []}
          onRetry={() => void tasks.refetch()}
          onAdd={actions.requestCreate}
          onToggle={actions.toggle}
          onEdit={actions.requestEdit}
          onDelete={actions.requestDelete}
        />
      </section>

      <div className="flex justify-center pt-2">
        <AddTaskButton onClick={actions.requestCreate} />
      </div>

      <TaskActionDialogs actions={actions} />
    </div>
  );
}

interface TaskBodyProps {
  isLoading: boolean;
  isError: boolean;
  tasks: Task[];
  onRetry: () => void;
  onAdd: () => void;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskBody({
  isLoading,
  isError,
  tasks,
  onRetry,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
}: TaskBodyProps) {
  if (isLoading) {
    return <TaskListSkeleton />;
  }

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks for this day"
        description="Add one and it will show up here."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="text-task text-primary hover:text-primary-strong font-medium"
          >
            Add your first task
          </button>
        }
      />
    );
  }

  return (
    <div className="px-6">
      <TaskList tasks={tasks} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
