'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/client/api/api-client';
import type { WeekSummary } from '@/types';
import { queryKeys } from './keys';

interface WeekRange {
  from?: string;
  to?: string;
  limit?: number;
}

export function useWeekSummaries(range: WeekRange = {}) {
  const params = new URLSearchParams();

  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  params.set('limit', String(range.limit ?? 8));

  return useQuery({
    queryKey: queryKeys.weeks.summaries({ ...range }),
    queryFn: () => apiClient.get<WeekSummary[]>(`/api/weeks?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}
