import type { TaskPriority } from '@/types';

const TONE: Record<TaskPriority, string> = {
  HIGH: 'bg-priority-high',
  MEDIUM: 'bg-priority-medium',
  LOW: 'bg-priority-low',
};

export function PriorityDot({ priority }: { priority: TaskPriority | null }) {
  if (!priority) return null;

  return (
    <span
      title={`${priority.charAt(0)}${priority.slice(1).toLowerCase()} priority`}
      className={['size-1.5 shrink-0 rounded-full', TONE[priority]].join(' ')}
    />
  );
}
