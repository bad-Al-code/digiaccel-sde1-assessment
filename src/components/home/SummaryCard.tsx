import type { ReactNode } from 'react';

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  count: number;
  tone: 'complete' | 'pending';
}

const TONE_CLASSES = {
  complete: 'bg-complete-surface',
  pending: 'bg-pending-surface',
} as const;

export function SummaryCard({ icon, label, count, tone }: SummaryCardProps) {
  return (
    <div
      className={[
        'flex min-w-0 flex-1 flex-col gap-3 rounded-lg px-4 py-4',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0">{icon}</span>
        <span className="text-card-label text-ink truncate font-medium">{label}</span>
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-metric text-ink font-bold">{String(count).padStart(2, '0')}</span>
        <span className="text-caption text-ink-soft">This Week</span>
      </p>
    </div>
  );
}
