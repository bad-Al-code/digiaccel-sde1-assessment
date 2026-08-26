import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-task text-ink font-medium">{title}</p>
      {description ? <p className="text-body text-ink-soft">{description}</p> : null}
      {action ? <div className="pt-3">{action}</div> : null}
    </div>
  );
}
