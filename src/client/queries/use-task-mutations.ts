'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/client/api/api-client';
import { TaskStatus, type Task, type TaskStatus as TaskStatusType } from '@/types';
import { queryKeys } from './keys';

type TaskPage = { items: Task[]; total: number; hasMore: boolean; nextCursor: string | null };

export interface TaskInput {
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

function useInvalidateTaskData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.weeks.all }),
    ]);
  };
}

function patchCachedTask(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  update: (task: Task) => Task,
) {
  queryClient.setQueriesData<TaskPage>({ queryKey: queryKeys.tasks.all }, (page) => {
    if (!page?.items) return page;

    return { ...page, items: page.items.map((task) => (task.id === taskId ? update(task) : task)) };
  });
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatusType }) =>
      apiClient.patch<Task>(`/api/tasks/${taskId}/status`, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const snapshot = queryClient.getQueriesData<TaskPage>({ queryKey: queryKeys.tasks.all });

      patchCachedTask(queryClient, taskId, (task) => ({
        ...task,
        status,
        completedAt: status === TaskStatus.COMPLETED ? new Date().toISOString() : null,
      }));

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSettled: () => invalidate(),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: (taskId: string) => apiClient.delete<null>(`/api/tasks/${taskId}`),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const snapshot = queryClient.getQueriesData<TaskPage>({ queryKey: queryKeys.tasks.all });

      queryClient.setQueriesData<TaskPage>({ queryKey: queryKeys.tasks.all }, (page) => {
        if (!page?.items) return page;

        return {
          ...page,
          items: page.items.filter((task) => task.id !== taskId),
          total: Math.max(0, page.total - 1),
        };
      });

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSettled: () => invalidate(),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: (input: TaskInput) => apiClient.post<Task>('/api/tasks', input),
    onSettled: () => invalidate(),
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: Partial<TaskInput> }) =>
      apiClient.patch<Task>(`/api/tasks/${taskId}`, input),
    onSettled: () => invalidate(),
  });
}
