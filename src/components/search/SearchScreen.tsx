'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSearchTasks } from '@/client/queries/use-search-tasks';
import { useDeleteTask, useToggleTaskStatus } from '@/client/queries/use-task-mutations';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { IconButton } from '@/components/ui/IconButton';
import { BackIcon } from '@/components/ui/icons';
import { SearchField } from '@/components/ui/SearchField';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TaskListSkeleton } from '@/components/ui/Skeleton';
import { TaskList } from '@/components/task/TaskList';
import { TaskStatus, type Task } from '@/types';

export function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, 300);

  const results = useSearchTasks(debouncedTerm);
  const isSearching = term.trim().length > 0 && (term !== debouncedTerm || results.isFetching);
  const toggleStatus = useToggleTaskStatus();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="px-3.5">
        <IconButton label="Go back" onClick={() => router.back()} className="text-ink">
          <BackIcon className="size-6" strokeWidth={2} />
        </IconButton>
      </div>

      <div className="px-6">
        <SearchField
          ref={inputRef}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onClear={() => {
            setTerm('');
            inputRef.current?.focus();
          }}
          loading={isSearching}
          placeholder="Search for a task"
        />
      </div>

      <SearchResults
        term={debouncedTerm}
        isPending={results.isPending}
        isFetching={results.isFetching}
        isError={results.isError}
        tasks={results.data?.items ?? []}
        onRetry={() => void results.refetch()}
        onToggle={(task) =>
          toggleStatus.mutate({
            taskId: task.id,
            status:
              task.status === TaskStatus.COMPLETED ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED,
          })
        }
        onDelete={(task) => deleteTask.mutate(task.id)}
      />
    </div>
  );
}

interface SearchResultsProps {
  term: string;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  tasks: Task[];
  onRetry: () => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function SearchResults({
  term,
  isPending,
  isFetching,
  isError,
  tasks,
  onRetry,
  onToggle,
  onDelete,
}: SearchResultsProps) {
  if (term.length === 0) {
    return <EmptyState title="Search your tasks" description="Type a keyword to find a task." />;
  }

  if (isError) {
    return <ErrorState title="Search failed" onRetry={onRetry} />;
  }

  if (isPending && isFetching) {
    return <TaskListSkeleton rows={3} />;
  }

  if (tasks.length === 0) {
    return <EmptyState title={`No tasks match "${term}"`} description="Try a different keyword." />;
  }

  return (
    <div className="px-6">
      <TaskList tasks={tasks} onToggle={onToggle} onEdit={() => undefined} onDelete={onDelete} />
    </div>
  );
}
