'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient, type Paged } from '@/client/api/api-client';
import type { Task } from '@/types';
import { queryKeys } from './keys';

export interface TaskListFilters {
  weekStart?: string;
  date?: string;
  from?: string;
  to?: string;
  limit?: number;
}

function buildQuery(filters: TaskListFilters): string {
  const params = new URLSearchParams();

  if (filters.weekStart) params.set('weekStart', filters.weekStart);
  if (filters.date) params.set('date', filters.date);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('limit', String(filters.limit ?? 100));

  return params.toString();
}

export function useTasks(filters: TaskListFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list({ ...filters }),
    queryFn: () => apiClient.getPaged<Task>(`/api/tasks?${buildQuery(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export type TaskPage = Paged<Task>;
