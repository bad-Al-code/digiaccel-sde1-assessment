'use client';

import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { PencilIcon, TrashIcon } from '@/components/ui/icons';
import { TaskStatus, type Task } from '@/types';
import { PriorityDot } from './PriorityDot';
import { SwipeToDelete } from './SwipeToDelete';

interface TaskRowProps {
  task: Task;
  swipeOpen: boolean;
  onSwipeChange: (open: boolean) => void;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskRow({
  task,
  swipeOpen,
  onSwipeChange,
  onToggle,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const completed = task.status === TaskStatus.COMPLETED;

  return (
    <li>
      <SwipeToDelete open={swipeOpen} onOpenChange={onSwipeChange} onDelete={() => onDelete(task)}>
        <div className="flex items-center gap-1.5 py-2">
          <Checkbox label={task.title} checked={completed} onChange={() => onToggle(task)} />
          <PriorityDot priority={task.priority} />
          <span
            className={[
              'text-task flex-1 truncate font-medium transition-colors duration-150',
              completed ? 'text-ink-soft line-through' : 'text-ink',
            ].join(' ')}
          >
            {task.title}
          </span>
          <IconButton
            label={`Delete ${task.title}`}
            tone="destructive"
            onClick={() => onDelete(task)}
            className="size-9"
          >
            <TrashIcon className="size-5" />
          </IconButton>
          <IconButton label={`Edit ${task.title}`} onClick={() => onEdit(task)} className="size-9">
            <PencilIcon className="size-5" />
          </IconButton>
        </div>
        <div className="bg-line ml-11 h-px" />
      </SwipeToDelete>
    </li>
  );
}
