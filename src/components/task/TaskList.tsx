'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { DURATION } from '@/lib/motion';
import type { Task } from '@/types';
import { TaskRow } from './TaskRow';

interface TaskListProps {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({ tasks, onToggle, onEdit, onDelete }: TaskListProps) {
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DURATION.exit }}
            className="overflow-hidden"
          >
            <TaskRow
              task={task}
              swipeOpen={openRowId === task.id}
              onSwipeChange={(open) => setOpenRowId(open ? task.id : null)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </ul>
  );
}
