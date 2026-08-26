'use client';

import { useEffect, useRef } from 'react';
import { useCreateTask } from '@/client/queries/use-task-mutations';
import { clearPendingTask, readPendingTask } from './pending-task';

export function usePendingTaskRestore(enabled: boolean): void {
  const createTask = useCreateTask();
  const attempted = useRef(false);

  useEffect(() => {
    if (!enabled || attempted.current) return;

    const pending = readPendingTask();

    if (!pending) return;

    attempted.current = true;
    clearPendingTask();
    createTask.mutate(pending);
  }, [enabled, createTask]);
}
