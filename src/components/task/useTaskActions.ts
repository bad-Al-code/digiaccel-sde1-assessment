'use client';

import { useState } from 'react';
import { ApiError } from '@/client/api/api-error';
import { stashPendingTask } from '@/client/guest/pending-task';
import {
  useCreateTask,
  useDeleteTask,
  useToggleTaskStatus,
  useUpdateTask,
  type TaskInput,
} from '@/client/queries/use-task-mutations';
import { TaskStatus, type Task } from '@/types';

interface UseTaskActionsOptions {
  isGuest: boolean;
  defaultDate: Date;
}

export function useTaskActions({ isGuest, defaultDate }: UseTaskActionsOptions) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<TaskInput | null>(null);
  const [guestLimitHit, setGuestLimitHit] = useState(false);

  const toggleStatus = useToggleTaskStatus();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const toggle = (task: Task) => {
    toggleStatus.mutate({
      taskId: task.id,
      status: task.status === TaskStatus.COMPLETED ? TaskStatus.IN_PROGRESS : TaskStatus.COMPLETED,
    });
  };

  const requestCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const requestEdit = (task: Task) => {
    setEditing(task);
    setSheetOpen(true);
  };

  const submit = async (payload: TaskInput | null) => {
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

  return {
    isGuest,
    defaultDate,
    sheetOpen,
    editing,
    pendingDelete,
    pendingUpdate,
    guestLimitHit,
    submitting: createTask.isPending || updateTask.isPending,
    deleting: deleteTask.isPending,
    updating: updateTask.isPending,
    toggle,
    requestCreate,
    requestEdit,
    requestDelete: setPendingDelete,
    submit,
    confirmUpdate,
    confirmDelete,
    closeSheet: () => setSheetOpen(false),
    cancelDelete: () => setPendingDelete(null),
    cancelUpdate: () => setPendingUpdate(null),
    dismissGuestLimit: () => setGuestLimitHit(false),
  };
}

export type TaskActions = ReturnType<typeof useTaskActions>;
