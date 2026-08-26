'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTasks } from '@/client/queries/use-tasks';
import { useWeekSummaries } from '@/client/queries/use-week-summaries';
import {
  useCreateTask,
  useDeleteTask,
  useToggleTaskStatus,
  useUpdateTask,
  type TaskInput,
} from '@/client/queries/use-task-mutations';
import { fromLocalDateKey, localDayRange, localWeekRange, toLocalDateKey } from '@/lib/local-date';
import { useLocalToday } from '@/lib/use-local-today';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TaskListSkeleton } from '@/components/ui/Skeleton';
import { SearchField } from '@/components/ui/SearchField';
import { AddTaskButton } from '@/components/task/AddTaskButton';
import { TaskFormSheet } from '@/components/task/TaskFormSheet';
import { TaskList } from '@/components/task/TaskList';
import { TaskStatus, type Task } from '@/types';
import { ApiError } from '@/client/api/api-error';
import { stashPendingTask } from '@/client/guest/pending-task';
import { usePendingTaskRestore } from '@/client/guest/use-pending-task';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GuestUpgradeDialog } from '@/components/auth/GuestUpgradeDialog';
import { DayStrip } from './DayStrip';
import { SummaryCards } from './SummaryCards';
import { WeeklyProgress } from './WeeklyProgress';

export function HomeScreen({ initialDate, isGuest }: { initialDate: string; isGuest: boolean }) {
  const todayKey = useLocalToday(initialDate);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = selectedKey ?? todayKey;
  const selectedDate = fromLocalDateKey(activeKey);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<TaskInput | null>(null);
  const [guestLimitHit, setGuestLimitHit] = useState(false);

  const day = localDayRange(activeKey);
  const week = localWeekRange(activeKey);

  const tasks = useTasks({ from: day.from, to: day.to });
  const weeks = useWeekSummaries({
    from: week.from.slice(0, 10),
    to: week.to.slice(0, 10),
    limit: 1,
  });

  const toggleStatus = useToggleTaskStatus();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  usePendingTaskRestore(!isGuest);

  const summary = weeks.data?.[0];
  const submitting = createTask.isPending || updateTask.isPending;

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setSheetOpen(true);
  };

  const handleSubmit = async (payload: TaskInput | null) => {
    if (!payload) return;

    if (editing) {
      setPendingUpdate(payload);
      return;
    }

    try {
      await createTask.mutateAsync(payload);
      setSheetOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'GUEST_TASK_LIMIT_REACHED') {
        stashPendingTask(payload);
        setSheetOpen(false);
        setGuestLimitHit(true);
        return;
      }

      throw error;
    }
  };

  const confirmUpdate = async () => {
    if (!editing || !pendingUpdate) return;

    await updateTask.mutateAsync({ taskId: editing.id, input: pendingUpdate });
    setPendingUpdate(null);
    setSheetOpen(false);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    await deleteTask.mutateAsync(pendingDelete.id);
    setPendingDelete(null);
  };

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
          onAdd={openCreate}
          onToggle={(task) =>
            toggleStatus.mutate({
              taskId: task.id,
              status:
                task.status === TaskStatus.COMPLETED
                  ? TaskStatus.IN_PROGRESS
                  : TaskStatus.COMPLETED,
            })
          }
          onEdit={openEdit}
          onDelete={setPendingDelete}
        />
      </section>

      <div className="flex justify-center pt-2">
        <AddTaskButton onClick={openCreate} />
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this task?"
        description={`"${pendingDelete?.title ?? ''}" will be removed permanently.`}
        confirmLabel="Delete"
        tone="destructive"
        busy={deleteTask.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingUpdate !== null}
        title="Save changes?"
        description="This will update the task with the details you entered."
        confirmLabel="Save changes"
        busy={updateTask.isPending}
        onConfirm={() => void confirmUpdate()}
        onCancel={() => setPendingUpdate(null)}
      />

      <GuestUpgradeDialog open={guestLimitHit} onClose={() => setGuestLimitHit(false)} />

      <TaskFormSheet
        open={sheetOpen}
        task={editing}
        defaultDate={selectedDate}
        submitting={submitting}
        onClose={() => setSheetOpen(false)}
        onSubmit={(payload) => void handleSubmit(payload)}
      />
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
