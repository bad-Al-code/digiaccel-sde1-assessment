'use client';

import type { TaskInput } from '@/client/queries/use-task-mutations';

const STORAGE_KEY = 'pending-task-after-signup';

export function stashPendingTask(input: TaskInput): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  } catch {
    // Storage can be unavailable in private mode; the task is simply not kept.
  }
}

export function readPendingTask(): TaskInput | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    return raw ? (JSON.parse(raw) as TaskInput) : null;
  } catch {
    return null;
  }
}

export function clearPendingTask(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
