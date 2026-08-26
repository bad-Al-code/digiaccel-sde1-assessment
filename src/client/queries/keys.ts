export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    list: (filters: Record<string, string | number | undefined>) =>
      ['tasks', 'list', filters] as const,
    detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
    search: (term: string) => ['tasks', 'search', term] as const,
  },
  weeks: {
    all: ['weeks'] as const,
    summaries: (range: Record<string, string | number | undefined>) =>
      ['weeks', 'summaries', range] as const,
  },
  user: {
    current: ['user', 'current'] as const,
  },
} as const;
