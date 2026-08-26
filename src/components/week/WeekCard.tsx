'use client';

import { AnimatePresence, motion } from 'motion/react';
import { DURATION } from '@/lib/motion';
import { TaskListSkeleton } from '@/components/ui/Skeleton';
import { TaskList } from '@/components/task/TaskList';
import type { Task, WeekSummary } from '@/types';

interface WeekCardProps {
  summary: WeekSummary;
  expanded: boolean;
  onToggleExpand: () => void;
  tasks: Task[];
  loadingTasks: boolean;
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

const RANGE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

function formatRange(summary: WeekSummary): string {
  return `${RANGE.format(new Date(summary.weekStart))} to ${RANGE.format(new Date(summary.weekEnd))}`;
}

export function WeekCard({
  summary,
  expanded,
  onToggleExpand,
  tasks,
  loadingTasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
}: WeekCardProps) {
  return (
    <li className="bg-complete-surface overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="focus-visible:ring-primary flex w-full flex-col gap-3 px-4 py-4 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="text-card-label text-ink font-semibold">{formatRange(summary)}</span>
        <span className="text-caption text-ink-soft flex items-center gap-4">
          <span>{String(summary.openTaskCount).padStart(2, '0')} open</span>
          <span>{String(summary.completedTaskCount).padStart(2, '0')} completed</span>
        </span>
        <span className="bg-primary-track h-2 w-full overflow-hidden rounded-full">
          <span
            className="bg-primary-strong block h-full rounded-full transition-[width] duration-[250ms] ease-out motion-reduce:transition-none"
            style={{ width: `${summary.completionPercentage}%` }}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.accordion }}
            className="bg-surface overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto px-4">
              {loadingTasks ? (
                <TaskListSkeleton rows={2} />
              ) : tasks.length === 0 ? (
                <p className="text-body text-ink-soft py-6 text-center">No tasks this week</p>
              ) : (
                <TaskList
                  tasks={tasks}
                  onToggle={onToggleTask}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
