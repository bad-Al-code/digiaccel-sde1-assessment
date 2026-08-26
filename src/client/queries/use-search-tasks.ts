'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/client/api/api-client';
import type { Task } from '@/types';
import { queryKeys } from './keys';

export function useSearchTasks(term: string) {
  const trimmed = term.trim();

  return useQuery({
    queryKey: queryKeys.tasks.search(trimmed),
    queryFn: () =>
      apiClient.getPaged<Task>(`/api/tasks/search?q=${encodeURIComponent(trimmed)}&limit=100`),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
}
